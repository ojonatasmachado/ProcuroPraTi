import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const isRecent = (value: string | null | undefined) => {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) && Date.now() - time <= 10 * 60 * 1000;
};

const shortText = (value: unknown, maxLength: number) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

const distanceKm = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const deltaLat = radians(b.latitude - a.latitude);
  const deltaLon = radians(b.longitude - a.longitude);
  const value = Math.sin(deltaLat / 2) ** 2
    + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(deltaLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const subject = Deno.env.get('VAPID_SUBJECT') || 'mailto:contato@procuroprati.com';
  const authorization = request.headers.get('Authorization');

  if (!supabaseUrl || !anonKey || !serviceKey || !publicKey || !privateKey || !authorization) {
    return json({ error: 'Configuração de push incompleta.' }, 500);
  }

  const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) return json({ error: 'Sessão inválida.' }, 401);

  let payload: { eventType?: string; recordId?: string };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Conteúdo inválido.' }, 400);
  }
  if (!payload.recordId || !['new_search', 'response', 'chat_message'].includes(payload.eventType || '')) {
    return json({ error: 'Evento inválido.' }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const callerId = authData.user.id;
  let targetIds: string[] = [];
  let notification: { title: string; body: string; url: string; tag: string; kind: string };
  let throttle: { channel: string; contextId: string; seconds: number } | null = null;

  if (payload.eventType === 'chat_message') {
    const { data: message, error } = await admin.from('messages').select('id,chat_id,sender_id,receiver_id,procura_id,timestamp').eq('id', payload.recordId).single();
    if (error || message.sender_id !== callerId || !isRecent(message.timestamp)) return json({ error: 'Mensagem não autorizada.' }, 403);
    targetIds = [message.receiver_id];
    let messageContext = 'Abra para conversar.';
    if (message.procura_id) {
      const { data: search } = await admin.from('procuras').select('part_name,vehicle_brand,vehicle_model,vehicle_year').eq('id', message.procura_id).maybeSingle();
      if (search) {
        const vehicle = [search.vehicle_brand, search.vehicle_model, search.vehicle_year].filter(Boolean).join(' ');
        messageContext = [search.part_name, vehicle].filter(Boolean).join(' · ');
      }
    }
    const chatUrl = `/?destino=mensagem&usuario=${encodeURIComponent(message.sender_id)}&procura=${encodeURIComponent(message.procura_id || '')}&mensagem=${encodeURIComponent(message.id)}`;
    notification = { title: 'Nova mensagem', body: shortText(messageContext, 72), url: chatUrl, tag: `chat-${message.chat_id}`, kind: 'chat_message' };
    throttle = { channel: 'chat_message', contextId: message.chat_id, seconds: 2 * 60 };
  } else if (payload.eventType === 'response') {
    const { data: response, error } = await admin.from('responses').select('id,company_id,company_name,procura_id,response_date').eq('id', payload.recordId).single();
    if (error || response.company_id !== callerId || !isRecent(response.response_date)) return json({ error: 'Resposta não autorizada.' }, 403);
    const { data: search, error: searchError } = await admin.from('procuras').select('user_id,part_name').eq('id', response.procura_id).single();
    if (searchError || !search?.user_id) return json({ error: 'Procura não encontrada.' }, 404);
    targetIds = [search.user_id];
    notification = {
      title: shortText(search.part_name || 'Nova resposta', 42),
      body: shortText(`${response.company_name || 'Uma empresa'} respondeu.`, 64),
      url: `/?destino=respostas&procura=${encodeURIComponent(response.procura_id)}`,
      tag: `response-${response.id}`,
      kind: 'response',
    };
  } else {
    const { data: search, error } = await admin.from('procuras').select('id,user_id,part_name,vehicle_type,vehicle_brand,vehicle_model,vehicle_year,locations,search_latitude,search_longitude,search_radius_km,created_at,is_demo').eq('id', payload.recordId).single();
    if (error || search.user_id !== callerId || !isRecent(search.created_at)) return json({ error: 'Procura não autorizada.' }, 403);
    const requestedCity = search.locations?.[0]?.value;
    const { data: companies, error: companiesError } = await admin.from('companies').select('id,serves_locations,vehicle_types,latitude,longitude,can_respond_anywhere');
    if (companiesError) return json({ error: 'Não foi possível localizar empresas.' }, 500);
    targetIds = (companies || []).filter((company) => {
      if (search.is_demo) return false;
      const cityMatches = requestedCity && (company.serves_locations || []).some((city: string) => city.trim().toLowerCase() === requestedCity.trim().toLowerCase());
      const vehicleMatches = (company.vehicle_types || ['car', 'motorcycle', 'truck', 'bus']).includes(search.vehicle_type || 'car');
      if (!vehicleMatches) return false;
      if (company.can_respond_anywhere) return true;
      const hasCoordinates = [company.latitude, company.longitude, search.search_latitude, search.search_longitude].every(Number.isFinite);
      if (!hasCoordinates) return Boolean(cityMatches);
      return distanceKm(
        { latitude: search.search_latitude, longitude: search.search_longitude },
        { latitude: company.latitude, longitude: company.longitude },
      ) <= Number(search.search_radius_km || 10);
    }).map((company) => company.id);
    notification = {
      title: shortText(search.part_name || 'Nova procura', 42),
      body: shortText([search.vehicle_brand, search.vehicle_model, search.vehicle_year].filter(Boolean).join(' '), 64),
      url: `/?destino=procuras&procura=${encodeURIComponent(search.id)}`,
      tag: `search-${search.id}`,
      kind: 'new_search',
    };
    throttle = { channel: 'new_search', contextId: 'company-opportunities', seconds: 10 * 60 };
  }

  targetIds = [...new Set(targetIds.filter(Boolean))];
  if (throttle && targetIds.length > 0) {
    const decisions = await Promise.all(targetIds.map(async (recipientId) => {
      const { data, error } = await admin.rpc('claim_push_notification_window', {
        p_recipient_id: recipientId,
        p_channel: throttle!.channel,
        p_context_id: throttle!.contextId,
        p_window_seconds: throttle!.seconds,
      });
      return error ? true : Boolean(data);
    }));
    targetIds = targetIds.filter((_, index) => decisions[index]);
  }
  if (targetIds.length === 0) return json({ sent: 0 });
  const { data: subscriptions, error: subscriptionsError } = await admin.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth,auth_session_id').in('user_id', targetIds);
  if (subscriptionsError) return json({ error: 'Não foi possível carregar as assinaturas.' }, 500);

  const { data: controlledCompanies } = await admin.from('companies').select('id').in('id', targetIds).eq('access_control_enabled', true);
  const controlledCompanyIds = new Set((controlledCompanies || []).map((company) => company.id));
  const controlledSessionIds = (subscriptions || [])
    .filter((subscription) => controlledCompanyIds.has(subscription.user_id) && subscription.auth_session_id)
    .map((subscription) => subscription.auth_session_id);
  const { data: activeAccessSessions } = controlledSessionIds.length
    ? await admin.from('company_access_sessions').select('auth_session_id').in('auth_session_id', controlledSessionIds).is('revoked_at', null).gt('last_seen_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
    : { data: [] };
  const activeAccessSessionIds = new Set((activeAccessSessions || []).map((session) => session.auth_session_id));
  const eligibleSubscriptions = (subscriptions || []).filter((subscription) => (
    !controlledCompanyIds.has(subscription.user_id)
    || (subscription.auth_session_id && activeAccessSessionIds.has(subscription.auth_session_id))
  ));

  webpush.setVapidDetails(subject, publicKey, privateKey);
  let sent = 0;
  await Promise.all(eligibleSubscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, JSON.stringify(notification), { TTL: 300, urgency: 'high' });
      sent += 1;
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) await admin.from('push_subscriptions').delete().eq('id', subscription.id);
    }
  }));

  return json({ sent });
});

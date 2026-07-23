import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) throw new Error('Variáveis do Supabase ausentes.');

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const makeClient = () => createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
const buyer = makeClient();
const company = makeClient();
const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const numericStamp = `${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;
const auditCpf = numericStamp.slice(-11);
const auditCnpj = numericStamp.padEnd(14, '0').slice(-14);
const buyerEmail = `audit-buyer-${stamp}@example.invalid`;
const companyEmail = `audit-company-${stamp}@example.invalid`;
const password = `Audit-${stamp}-A1!`;
const procuraId = `audit-procura-${stamp}`;
const responseId = `audit-response-${stamp}`;
let chatId;
const buyerMessageId = `audit-buyer-message-${stamp}`;
const companyMessageId = `audit-company-message-${stamp}`;
const feedbackId = `audit-feedback-${stamp}`;
const chatWindowContext = `audit-chat-${stamp}`;
const searchWindowContext = `audit-search-${stamp}`;
let photoPath;
let buyerPhotoPath;
let chatImagePath;
let buyerId;
let companyId;
let pushEndpoint;
const checks = [];

const ok = (name, condition, detail = '') => {
  if (!condition) throw new Error(`${name}${detail ? `: ${detail}` : ''}`);
  checks.push(name);
};

const describeError = (error) => {
  if (!error) return 'erro desconhecido';
  return [error.message, error.code && `código ${error.code}`, error.status && `status ${error.status}`, error.name]
    .filter(Boolean)
    .join(' | ') || JSON.stringify(error);
};

const noError = (name, result) => {
  if (result.error) throw new Error(`${name}: ${describeError(result.error)}`);
  checks.push(name);
  return result.data;
};

const withRetry = async (action, attempts = 3) => {
  let result;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    result = await action();
    if (!result.error || result.error.status !== 500) return result;
    if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, attempt * 500));
  }
  return result;
};

try {
  const createdBuyer = noError('cadastro seguro do comprador', await withRetry(() => admin.auth.admin.createUser({
    email: buyerEmail, password, email_confirm: true,
    user_metadata: { account_type: 'user', name: 'Auditoria Comprador', cpf: auditCpf, phone: '11999999999', location: 'São Paulo, SP', vehicles: [], terms_accepted_date: new Date().toISOString() },
  })));
  buyerId = createdBuyer.user.id;

  const createdCompany = noError('cadastro seguro da empresa', await withRetry(() => admin.auth.admin.createUser({
    email: companyEmail, password, email_confirm: true,
    user_metadata: { account_type: 'company', name: 'Auditoria Empresa', cnpj: auditCnpj, phone: '1133334444', address: 'Rua Auditoria, 1, São Paulo, SP', latitude: -23.55052, longitude: -46.633308, serves_locations: ['São Paulo, SP'], vehicle_types: ['car'], terms_accepted_date: new Date().toISOString() },
  })));
  companyId = createdCompany.user.id;

  noError('login do comprador', await buyer.auth.signInWithPassword({ email: buyerEmail, password }));
  noError('login da empresa', await company.auth.signInWithPassword({ email: companyEmail, password }));

  const buyerTermsBefore = noError('consulta do termo inicial do comprador', await buyer.from('users').select('terms_accepted_date').eq('id', buyerId).single());
  const companyTermsBefore = noError('consulta do termo inicial da empresa', await company.from('companies').select('terms_accepted_date').eq('id', companyId).single());
  ok('cadastro não aceita termo automaticamente para comprador', buyerTermsBefore.terms_accepted_date === null);
  ok('cadastro não aceita termo automaticamente para empresa', companyTermsBefore.terms_accepted_date === null);

  const acceptedAt = new Date().toISOString();
  const buyerTermsAfter = noError('assinatura obrigatória do comprador', await buyer.from('users').update({ terms_accepted_date: acceptedAt }).eq('id', buyerId).select('terms_accepted_date').single());
  const companyTermsAfter = noError('assinatura obrigatória da empresa', await company.from('companies').update({ terms_accepted_date: acceptedAt }).eq('id', companyId).select('terms_accepted_date').single());
  ok('aceite do comprador registrado com data e horário', Boolean(buyerTermsAfter.terms_accepted_date));
  ok('aceite da empresa registrado com data e horário', Boolean(companyTermsAfter.terms_accepted_date));

  pushEndpoint = `https://example.invalid/push/${stamp}`;
  noError('assinatura push protegida do comprador', await buyer.from('push_subscriptions').insert({
    user_id: buyerId, user_type: 'user', endpoint: pushEndpoint, p256dh: 'dGVzdA', auth: 'dGVzdA', user_agent: 'auditoria',
  }));
  ok('empresa não acessa assinatura push do comprador', (noError('isolamento das assinaturas push', await company.from('push_subscriptions').select('id').eq('user_id', buyerId))).length === 0);

  const firstChatClaim = noError('primeira notificação do chat liberada', await admin.rpc('claim_push_notification_window', {
    p_recipient_id: buyerId, p_channel: 'chat_message', p_context_id: chatWindowContext, p_window_seconds: 120,
  }));
  const repeatedChatClaim = noError('mensagens do mesmo chat agrupadas por dois minutos', await admin.rpc('claim_push_notification_window', {
    p_recipient_id: buyerId, p_channel: 'chat_message', p_context_id: chatWindowContext, p_window_seconds: 120,
  }));
  ok('janela do chat libera apenas o primeiro push', firstChatClaim === true && repeatedChatClaim === false);

  const firstSearchClaim = noError('primeiro aviso de novas procuras liberado', await admin.rpc('claim_push_notification_window', {
    p_recipient_id: companyId, p_channel: 'new_search', p_context_id: searchWindowContext, p_window_seconds: 600,
  }));
  const repeatedSearchClaim = noError('novas procuras agrupadas por dez minutos', await admin.rpc('claim_push_notification_window', {
    p_recipient_id: companyId, p_channel: 'new_search', p_context_id: searchWindowContext, p_window_seconds: 600,
  }));
  ok('janela de procuras libera apenas o primeiro push', firstSearchClaim === true && repeatedSearchClaim === false);

  const accountLookup = noError('identificação do email antes da senha', await makeClient().rpc('account_type_for_email', { p_email: buyerEmail }));
  ok('tipo de conta identificado corretamente', accountLookup === 'user');
  ok('perfil do comprador protegido', (noError('leitura do próprio perfil do comprador', await buyer.from('users').select('*').eq('id', buyerId))).length === 1);
  ok('perfil da empresa protegido', (noError('leitura do próprio perfil da empresa', await company.from('companies').select('*').eq('id', companyId))).length === 1);
  ok('catálogo de veículos disponível', (noError('consulta ao catálogo real', await buyer.from('vehicle_brands').select('id').limit(1))).length === 1);
  photoPath = `${companyId}/audit-${stamp}.png`;
  noError('upload real de foto', await company.storage.from('part-photos').upload(photoPath, new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' })));
  ok('foto recebe URL pública', Boolean(company.storage.from('part-photos').getPublicUrl(photoPath).data.publicUrl));
  buyerPhotoPath = `${buyerId}/procuras/audit-${stamp}.png`;
  noError('upload da foto de referência pelo comprador', await buyer.storage.from('part-photos').upload(buyerPhotoPath, new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' })));
  const buyerPhotoUrl = buyer.storage.from('part-photos').getPublicUrl(buyerPhotoPath).data.publicUrl;
  ok('foto de referência recebe URL pública', Boolean(buyerPhotoUrl));

  noError('criação da procura', await buyer.from('procuras').insert({
    id: procuraId, user_id: buyerId, vehicle_type: 'car', vehicle_brand: 'Toyota', vehicle_model: 'Corolla', vehicle_year: '2020',
    part_name: 'Farol Direito', part_description: 'Validação automatizada', wants_photos: false, reference_photo_url: buyerPhotoUrl, preferred_condition: 'used',
    locations: [{ value: 'São Paulo, SP', label: 'São Paulo - SP' }], search_latitude: -23.55052, search_longitude: -46.633308, search_radius_km: 10, created_at: new Date().toISOString(), status: 'active', duration: 7, is_demo: true,
  }));
  const newSearchPush = noError('acionamento push para nova procura', await buyer.functions.invoke('send-web-push', { body: { eventType: 'new_search', recordId: procuraId } }));
  ok('serviço push processa nova procura', Number.isFinite(newSearchPush.sent));
  ok('auditoria não envia push para empresas reais', newSearchPush.sent === 0);
  ok('empresa visualiza procura ativa', (noError('leitura da procura pela empresa', await company.from('procuras').select('id').eq('id', procuraId))).length === 1);
  noError('empresa altera os veículos atendidos', await company.from('companies').update({ vehicle_types: ['motorcycle'] }).eq('id', companyId));
  ok('empresa incompatível com o veículo não visualiza a procura', (noError('bloqueio da procura por tipo de veículo', await company.from('procuras').select('id').eq('id', procuraId))).length === 0);
  noError('empresa volta a atender o veículo da procura', await company.from('companies').update({ vehicle_types: ['car'] }).eq('id', companyId));
  ok('empresa compatível dentro do raio visualiza a procura', (noError('leitura da procura compatível', await company.from('procuras').select('id').eq('id', procuraId))).length === 1);
  noError('empresa é posicionada fora do raio', await company.from('companies').update({ serves_locations: ['Campinas, SP'], latitude: -22.90556, longitude: -47.06083 }).eq('id', companyId));
  ok('empresa fora do raio não visualiza a procura', (noError('bloqueio da procura fora do raio', await company.from('procuras').select('id').eq('id', procuraId))).length === 0);
  noError('admin habilita alcance nacional de teste', await admin.from('companies').update({ can_respond_anywhere: true }).eq('id', companyId));
  ok('empresa nacional de teste visualiza procura fora do raio', (noError('leitura nacional da procura', await company.from('procuras').select('id').eq('id', procuraId))).length === 1);
  noError('admin restaura alcance municipal', await admin.from('companies').update({ can_respond_anywhere: false }).eq('id', companyId));
  noError('empresa retorna ao raio da procura', await company.from('companies').update({ serves_locations: ['São Paulo, SP'], latitude: -23.55052, longitude: -46.633308 }).eq('id', companyId));

  const savedResponse = noError('resposta da empresa', await company.rpc('save_company_response', { p_procura_id: procuraId, p_response: {
    id: responseId, status: 'available', price: '100.00', message: 'Peça disponível', part_condition: 'good', part_type: 'original', location: 'São Paulo, SP',
  } }));
  ok('resposta retorna o registro persistido', savedResponse?.id === responseId);
  const responsePush = noError('acionamento push para nova resposta', await company.functions.invoke('send-web-push', { body: { eventType: 'response', recordId: responseId } }));
  ok('serviço push processa nova resposta', Number.isFinite(responsePush.sent));
  ok('comprador recebe a resposta', (noError('leitura da resposta pelo comprador', await buyer.from('responses').select('id').eq('id', responseId))).length === 1);
  noError('comprador marca a resposta como lida', await buyer.rpc('mark_response_read', { p_response_id: responseId }));

  chatId = [buyerId, companyId].sort().join('::') + `::${procuraId}`;

  const blockedStart = await company.from('messages').insert({ id: companyMessageId, chat_id: chatId, sender_id: companyId, receiver_id: buyerId, procura_id: procuraId, text: 'Tentativa indevida', timestamp: new Date().toISOString(), is_read: false });
  ok('empresa impedida de iniciar o chat', Boolean(blockedStart.error));
  chatImagePath = `${buyerId}/audit-${stamp}.png`;
  noError('upload privado de imagem no chat', await buyer.storage.from('chat-images').upload(chatImagePath, new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' })));
  noError('comprador inicia o chat com imagem', await buyer.from('messages').insert({ id: buyerMessageId, chat_id: chatId, sender_id: buyerId, receiver_id: companyId, procura_id: procuraId, text: '', image_path: chatImagePath, timestamp: new Date().toISOString(), is_read: false }));
  noError('empresa confirma entrega da mensagem', await company.rpc('mark_messages_delivered'));
  const deliveredMessage = noError('comprador consulta confirmação de entrega', await buyer.from('messages').select('delivered_at').eq('id', buyerMessageId).single());
  ok('mensagem marcada como entregue', Boolean(deliveredMessage.delivered_at));
  ok('empresa acessa imagem privada da conversa', Boolean((noError('link temporário da imagem do chat', await company.storage.from('chat-images').createSignedUrl(chatImagePath, 60))).signedUrl));
  noError('empresa responde após o comprador', await company.from('messages').insert({ id: companyMessageId, chat_id: chatId, sender_id: companyId, receiver_id: buyerId, procura_id: procuraId, text: 'Olá, podemos atender', timestamp: new Date().toISOString(), is_read: false }));
  const chatPush = noError('acionamento push para mensagem', await company.functions.invoke('send-web-push', { body: { eventType: 'chat_message', recordId: companyMessageId } }));
  ok('serviço push processa mensagem', Number.isFinite(chatPush.sent));
  noError('comprador confirma entrega da resposta', await buyer.rpc('mark_messages_delivered'));
  noError('comprador marca mensagem como lida', await buyer.rpc('mark_message_read', { p_message_id: companyMessageId }));
  const readMessage = noError('empresa consulta confirmação de leitura', await company.from('messages').select('read_at,is_read').eq('id', companyMessageId).single());
  ok('mensagem marcada como lida', readMessage.is_read === true && Boolean(readMessage.read_at));

  noError('envio de feedback', await buyer.rpc('submit_feedback', {
    p_id: feedbackId, p_user_id: buyerId, p_user_type: 'user', p_user_name: 'Auditoria Comprador', p_type: 'rating', p_text_content: 'Auditoria', p_rating: 5, p_contact: null, p_created_at: new Date().toISOString(),
  }));
  noError('atualização de perfil', await buyer.from('users').update({ phone: '11888888888' }).eq('id', buyerId));
  noError('encerramento da procura pelo criador', await buyer.from('procuras').update({ status: 'finished' }).eq('id', procuraId));

  console.log(JSON.stringify({ success: true, checks }, null, 2));
} finally {
  if (photoPath) await admin.storage.from('part-photos').remove([photoPath]);
  if (buyerPhotoPath) await admin.storage.from('part-photos').remove([buyerPhotoPath]);
  if (chatImagePath) await admin.storage.from('chat-images').remove([chatImagePath]);
  await admin.from('messages').delete().eq('chat_id', chatId);
  await admin.from('responses').delete().eq('procura_id', procuraId);
  await admin.from('feedbacks').delete().eq('id', feedbackId);
  await admin.from('procuras').delete().eq('id', procuraId);
  if (pushEndpoint) await admin.from('push_subscriptions').delete().eq('endpoint', pushEndpoint);
  if (buyerId) await admin.from('push_notification_windows').delete().eq('recipient_id', buyerId);
  if (companyId) await admin.from('push_notification_windows').delete().eq('recipient_id', companyId);
  if (buyerId) await admin.from('users').delete().eq('id', buyerId);
  if (companyId) await admin.from('companies').delete().eq('id', companyId);
  if (buyerId) await admin.auth.admin.deleteUser(buyerId);
  if (companyId) await admin.auth.admin.deleteUser(companyId);
}

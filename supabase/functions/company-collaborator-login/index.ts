import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  try {
    const { cnpj, username, pin } = await request.json();
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) throw new Error('Serviço de acesso não configurado.');
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: verified, error: verificationError } = await admin.rpc('verify_company_collaborator_login', {
      p_cnpj: cnpj,
      p_username: username,
      p_pin: pin,
    });
    if (verificationError) throw verificationError;
    if (!verified?.success) return json({ error: verified?.message || 'CNPJ, usuário ou PIN incorreto.' }, 401);

    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: verified.company_email,
    });
    if (linkError) throw linkError;
    const tokenHash = link?.properties?.hashed_token;
    if (!tokenHash) throw new Error('Não foi possível criar a sessão da empresa.');
    return json({
      tokenHash,
      email: verified.company_email,
      username: verified.username,
      operatorName: verified.operator_name,
      pin,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Não foi possível entrar agora.' }, 500);
  }
});

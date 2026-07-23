import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const authorization = request.headers.get('Authorization') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!supabaseUrl || !anonKey || !serviceKey || !resendKey) throw new Error('Envio de acesso não configurado.');

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
    const { data: operators, error: ownerError } = await userClient.rpc('list_company_operators');
    if (ownerError) return json({ error: 'Somente o responsável pode enviar acessos.' }, 403);

    const { operatorId, pin } = await request.json();
    if (!operators?.some((operator: { id: string }) => operator.id === operatorId)) return json({ error: 'Acesso não encontrado.' }, 404);
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: operator, error: operatorError } = await admin.from('company_operators').select('name,username,contact_email,company_id').eq('id', operatorId).single();
    if (operatorError) throw operatorError;
    const { data: company, error: companyError } = await admin.from('companies').select('name,cnpj').eq('id', operator.company_id).single();
    if (companyError) throw companyError;

    const emailResult = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Procuro Pra Ti <acesso@procuroprati.com>',
        to: [operator.contact_email],
        subject: 'Seu acesso de colaborador à Procuro Pra Ti',
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0b1424"><h1 style="color:#2e6ff3">Procuro Pra Ti</h1><p>Olá, ${operator.name}.</p><p>Seu acesso à empresa <strong>${company.name}</strong> foi criado.</p><div style="background:#f5f7fb;border-radius:12px;padding:20px"><p><strong>CNPJ:</strong> ${company.cnpj}</p><p><strong>Usuário:</strong> ${operator.username}</p><p><strong>PIN:</strong> ${pin}</p></div><p>Na entrada da empresa, toque em <strong>Sou colaborador</strong> e use estes dados.</p><p>Se você não esperava este convite, ignore este email.</p></div>`,
      }),
    });
    if (!emailResult.ok) throw new Error(await emailResult.text());
    return json({ sent: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Não foi possível enviar o acesso.' }, 500);
  }
});

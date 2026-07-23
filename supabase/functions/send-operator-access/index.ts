import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');
const formatCnpj = (value: string) => value.replace(/\D/g, '').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, '$1.$2.$3/$4-$5');

const buildAccessEmail = ({
  operatorName,
  companyName,
  cnpj,
  username,
  pin,
}: {
  operatorName: string;
  companyName: string;
  cnpj: string;
  username: string;
  pin: string;
}) => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Seu acesso de colaborador</title>
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    table,td{mso-table-lspace:0;mso-table-rspace:0}
    body{margin:0;padding:0;width:100%!important;height:100%!important}
    @media screen and (max-width:600px){.container{width:100%!important}.fluid-pad{padding-left:20px!important;padding-right:20px!important}.btn-a{display:block!important}}
  </style>
</head>
<body style="margin:0;padding:0;background-color:#070D1A;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#070D1A;">Seu acesso à equipe da ${escapeHtml(companyName)} está pronto.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#070D1A;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
        <tr><td align="center" style="padding:8px 0 28px;font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:bold;color:#EAF0FB;">procuro <span style="color:#2E6FF3;">pra ti</span></td></tr>
        <tr><td style="background-color:#111C30;border:1px solid #1E2A44;border-radius:16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="background-color:#21C7B0;border-radius:16px 16px 0 0;height:4px;line-height:4px;font-size:4px;">&nbsp;</td></tr>
            <tr><td class="fluid-pad" style="padding:40px 40px 8px;"><span style="display:inline-block;background-color:#12372F;border-radius:999px;padding:6px 14px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;color:#21C7B0;letter-spacing:.04em;text-transform:uppercase;">Acesso da equipe</span></td></tr>
            <tr><td class="fluid-pad" style="padding:16px 40px 0;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.3;font-weight:bold;color:#EAF0FB;">Olá, ${escapeHtml(operatorName)}. Seu acesso está pronto.</td></tr>
            <tr><td class="fluid-pad" style="padding:14px 40px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#90A0BE;">Você foi adicionado à equipe da <strong style="color:#EAF0FB;">${escapeHtml(companyName)}</strong> na Procuro Pra Ti.</td></tr>
            <tr><td class="fluid-pad" style="padding:24px 40px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0B1424;border:1px solid #1E2A44;border-radius:12px;">
                <tr><td style="padding:18px 20px 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#5A6B8A;">CNPJ da empresa</td></tr>
                <tr><td style="padding:0 20px 12px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#EAF0FB;">${escapeHtml(formatCnpj(cnpj))}</td></tr>
                <tr><td style="padding:8px 20px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#5A6B8A;border-top:1px solid #1E2A44;">Nome de usuário</td></tr>
                <tr><td style="padding:0 20px 12px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#EAF0FB;">${escapeHtml(username)}</td></tr>
                <tr><td style="padding:8px 20px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#5A6B8A;border-top:1px solid #1E2A44;">PIN de acesso</td></tr>
                <tr><td style="padding:0 20px 18px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:bold;letter-spacing:5px;color:#21C7B0;">${escapeHtml(pin)}</td></tr>
              </table>
            </td></tr>
            <tr><td class="fluid-pad" style="padding:20px 40px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#90A0BE;"><strong style="color:#EAF0FB;">Como entrar:</strong> abra o botão abaixo, escolha <strong style="color:#EAF0FB;">Vou vender</strong>, toque em <strong style="color:#EAF0FB;">Sou colaborador</strong> e informe os dados acima.</td></tr>
            <tr><td class="fluid-pad" align="center" style="padding:28px 40px 8px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#2E6FF3" style="border-radius:10px;"><a href="https://procuroprati.com/?colaborador=1" class="btn-a" target="_blank" style="display:inline-block;padding:14px 36px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#F5F7FB;text-decoration:none;border-radius:10px;">Entrar como colaborador</a></td></tr></table></td></tr>
            <tr><td class="fluid-pad" style="padding:24px 40px 40px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.7;color:#5A6B8A;">Não compartilhe seu PIN. Se você não esperava este acesso, ignore este email e avise o responsável da empresa.</td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding:28px 20px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:#5A6B8A;">procuro pra ti · Porto Alegre, RS · Brasil<br><a href="https://procuroprati.com" target="_blank" style="color:#5A6B8A;text-decoration:underline;">procuroprati.com</a></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

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
    const { data: operator, error: operatorError } = await admin.from('company_operators').select('name,username,contact_email,contact_phone,company_id').eq('id', operatorId).single();
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
        html: buildAccessEmail({
          operatorName: operator.name,
          companyName: company.name,
          cnpj: company.cnpj,
          username: operator.username,
          pin,
        }),
      }),
    });
    if (!emailResult.ok) throw new Error(await emailResult.text());
    return json({ sent: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Não foi possível enviar o acesso.' }, 500);
  }
});

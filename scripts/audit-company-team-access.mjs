import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) throw new Error('Variáveis do Supabase ausentes.');

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const email = `auditoria-equipe-${Date.now()}@procuroprati.invalid`;
const password = `Auditoria@${Date.now()}!`;
let companyId;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

try {
  const created = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: {
      account_type: 'company', name: 'Auditoria Equipe', cnpj: '61738371000169',
      phone: '51999999999', address: 'Rua de Teste, 100, Porto Alegre, RS',
      address_number: '100', serves_locations: ['Porto Alegre, RS'], vehicle_types: ['car'],
    },
  });
  if (created.error) throw created.error;
  companyId = created.data.user.id;

  const ownerClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const ownerLogin = await ownerClient.auth.signInWithPassword({ email, password });
  if (ownerLogin.error) throw ownerLogin.error;

  const initial = await ownerClient.rpc('get_company_access_context');
  if (initial.error) throw initial.error;
  assert(initial.data.enabled === false && initial.data.authorized === true, 'Empresa antiga não manteve o acesso compatível.');

  const enabled = await ownerClient.rpc('enable_company_team_access', {
    p_owner_pin: '735194', p_device_id: 'audit-owner', p_device_name: 'Auditoria responsável',
  });
  if (enabled.error) throw enabled.error;
  assert(enabled.data.success && enabled.data.role === 'owner', 'Não foi possível ativar o responsável.');

  const operator = await ownerClient.rpc('save_company_operator', {
    p_name: 'Pessoa de Teste',
    p_username: 'teste',
    p_pin: '426813',
    p_contact_email: 'pessoa.teste@procuroprati.invalid',
    p_contact_phone: '51999998888',
    p_operator_id: null,
  });
  if (operator.error) throw operator.error;
  const listedOperators = await ownerClient.rpc('list_company_operators');
  if (listedOperators.error) throw listedOperators.error;
  assert(listedOperators.data.some(item => item.id === operator.data.id && item.contact_phone === '51999998888'), 'Telefone do colaborador não foi persistido.');
  const twoSeats = await admin.from('companies').update({ max_concurrent_accesses: 2 }).eq('id', companyId);
  if (twoSeats.error) throw twoSeats.error;

  const operatorClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const operatorLogin = await operatorClient.auth.signInWithPassword({ email, password });
  if (operatorLogin.error) throw operatorLogin.error;
  const beforeClaim = await operatorClient.rpc('get_company_access_context');
  if (beforeClaim.error) throw beforeClaim.error;
  assert(beforeClaim.data.authorized === false, 'Uma nova sessão entrou sem PIN.');

  const claimed = await operatorClient.rpc('claim_company_access', {
    p_mode: 'operator', p_username: 'teste', p_pin: '426813',
    p_device_id: 'audit-operator', p_device_name: 'Auditoria colaborador',
  });
  if (claimed.error) throw claimed.error;
  assert(claimed.data.success && claimed.data.role === 'operator', 'O colaborador não conseguiu usar o PIN.');

  const forbiddenUpdate = await operatorClient.from('companies').update({ name: 'Alteração indevida' }).eq('id', companyId).select();
  assert(forbiddenUpdate.error || forbiddenUpdate.data?.length === 0, 'O colaborador conseguiu editar o perfil da empresa.');

  const heartbeat = await operatorClient.rpc('heartbeat_company_access');
  if (heartbeat.error) throw heartbeat.error;
  assert(heartbeat.data === true, 'O acesso individual não permaneceu ativo.');

  const disabled = await ownerClient.rpc('disable_company_operator', { p_operator_id: operator.data.id });
  if (disabled.error) throw disabled.error;
  const revokedHeartbeat = await operatorClient.rpc('heartbeat_company_access');
  if (revokedHeartbeat.error) throw revokedHeartbeat.error;
  assert(revokedHeartbeat.data === false, 'Desativar a pessoa não encerrou a sessão.');

  console.log('Auditoria de equipe concluída: 10 verificações aprovadas.');
} finally {
  if (companyId) {
    await admin.from('company_access_sessions').delete().eq('company_id', companyId);
    await admin.from('company_operators').delete().eq('company_id', companyId);
    await admin.from('companies').delete().eq('id', companyId);
    await admin.auth.admin.deleteUser(companyId);
  }
}

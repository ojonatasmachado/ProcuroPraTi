import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error('Variáveis do Supabase ausentes.');

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const password = 'TesteNacional@2026!';
const accounts = [
  {
    key: 'buyer1', type: 'user', email: 'cliente.teste@procuroprati.com',
    metadata: { account_type: 'user', name: 'Cliente Teste', cpf: '52998224725', phone: '11988887777', location: 'Rua Teste, 10, São Paulo, SP', vehicles: [], terms_accepted_date: new Date().toISOString() },
  },
  {
    key: 'buyer2', type: 'user', email: 'cliente2.teste@procuroprati.com',
    metadata: { account_type: 'user', name: 'Cliente Teste Dois', cpf: '11144477735', phone: '19977776666', location: 'Rua Teste, 20, Campinas, SP', vehicles: [], terms_accepted_date: new Date().toISOString() },
  },
  {
    key: 'company1', type: 'company', email: 'empresa.teste@procuroprati.com',
    metadata: { account_type: 'company', name: 'Auto Peças Teste São Paulo', cnpj: '11222333000181', phone: '1133334444', address: 'Rua das Peças, 100, São Paulo, SP', latitude: -23.55052, longitude: -46.633308, serves_locations: ['São Paulo, SP'], vehicle_types: ['car', 'motorcycle', 'truck', 'bus'], terms_accepted_date: new Date().toISOString() },
  },
  {
    key: 'company2', type: 'company', email: 'empresa2.teste@procuroprati.com',
    metadata: { account_type: 'company', name: 'Central de Peças Teste Campinas', cnpj: '11444777000161', phone: '1933335555', address: 'Avenida Brasil, 500, Campinas, SP', latitude: -22.90556, longitude: -47.06083, serves_locations: ['Campinas, SP'], vehicle_types: ['car', 'motorcycle', 'truck', 'bus'], terms_accepted_date: new Date().toISOString() },
  },
];

const existing = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (existing.error) throw existing.error;
for (const account of accounts) {
  const old = existing.data.users.find(user => user.email === account.email);
  if (old) {
    await supabase.from('messages').delete().or(`sender_id.eq.${old.id},receiver_id.eq.${old.id}`);
    await supabase.from('responses').delete().eq('company_id', old.id);
    await supabase.from('procuras').delete().eq('user_id', old.id);
    await supabase.from(account.type === 'company' ? 'companies' : 'users').delete().eq('id', old.id);
    await supabase.auth.admin.deleteUser(old.id);
  }
}

const ids = {};
for (const account of accounts) {
  const created = await supabase.auth.admin.createUser({ email: account.email, password, email_confirm: true, user_metadata: account.metadata });
  if (created.error) throw created.error;
  ids[account.key] = created.data.user.id;
  const table = account.type === 'company' ? 'companies' : 'users';
  const marked = await supabase.from(table).update({
    is_demo: true,
    terms_accepted_date: account.metadata.terms_accepted_date,
    ...(account.key === 'company1' ? { can_respond_anywhere: true } : {}),
  }).eq('id', created.data.user.id);
  if (marked.error) throw marked.error;
}

const catalogBrand = await supabase.from('vehicle_brands').select('id,name').eq('vehicle_type', 'car').ilike('name', '%Toyota%').limit(1).maybeSingle();
if (catalogBrand.error) throw catalogBrand.error;
const catalogModel = catalogBrand.data
  ? await supabase.from('vehicle_models').select('id,name,fipe_code').eq('brand_id', catalogBrand.data.id).ilike('name', '%Corolla%').limit(1).maybeSingle()
  : { data: null, error: null };
if (catalogModel.error) throw catalogModel.error;
const catalogYear = catalogModel.data
  ? await supabase.from('vehicle_years').select('id,year,fuel').eq('model_id', catalogModel.data.id).order('year', { ascending: false }).limit(1).maybeSingle()
  : { data: null, error: null };
if (catalogYear.error) throw catalogYear.error;

const now = Date.now();
const procura1 = `test-procura-${now}-1`;
const procura2 = `test-procura-${now}-2`;
const procuraRows = [
  {
    id: procura1, user_id: ids.buyer1, vehicle_type: 'car',
    vehicle_brand: catalogBrand.data?.name || 'Toyota', vehicle_model: catalogModel.data?.name || 'Corolla', vehicle_year: String(catalogYear.data?.year || '2020'),
    vehicle_brand_id: catalogBrand.data?.id || null, vehicle_model_id: catalogModel.data?.id || null, vehicle_year_id: catalogYear.data?.id || null, vehicle_fuel: catalogYear.data?.fuel || null,
    part_name: 'Farol dianteiro direito', part_description: 'Procura criada para testar respostas e o início do chat.', wants_photos: true, preferred_condition: 'used',
    locations: [{ value: 'São Paulo, SP', label: 'São Paulo - SP' }], search_latitude: -23.55052, search_longitude: -46.633308, search_radius_km: 20, created_at: new Date().toISOString(), status: 'active', duration: 15, is_demo: true,
  },
  {
    id: procura2, user_id: ids.buyer2, vehicle_type: 'car',
    vehicle_brand: catalogBrand.data?.name || 'Toyota', vehicle_model: catalogModel.data?.name || 'Corolla', vehicle_year: String(catalogYear.data?.year || '2020'),
    vehicle_brand_id: catalogBrand.data?.id || null, vehicle_model_id: catalogModel.data?.id || null, vehicle_year_id: catalogYear.data?.id || null, vehicle_fuel: catalogYear.data?.fuel || null,
    part_name: 'Retrovisor esquerdo', part_description: 'Procura sem respostas para testar o painel da empresa.', wants_photos: false, preferred_condition: 'any',
    locations: [{ value: 'Campinas, SP', label: 'Campinas - SP' }], search_latitude: -22.90556, search_longitude: -47.06083, search_radius_km: 20, created_at: new Date().toISOString(), status: 'active', duration: 10, is_demo: true,
  },
];
const insertedProcuras = await supabase.from('procuras').insert(procuraRows);
if (insertedProcuras.error) throw insertedProcuras.error;

const response = await supabase.from('responses').insert({
  id: `test-response-${now}`, procura_id: procura1, company_id: ids.company1,
  company_name: 'Auto Peças Teste São Paulo', response_date: new Date().toISOString(), status: 'available', price: 289.9,
  message: 'Temos a peça disponível para teste.', part_condition: 'excellent', part_type: 'original',
  cnpj: '11222333000181', address: 'Rua das Peças, 100, São Paulo, SP', location: 'São Paulo, SP', is_read_by_user: false, is_read_by_company: true,
});
if (response.error) throw response.error;

const chatId = `${[ids.buyer1, ids.company1].sort().map(encodeURIComponent).join('::')}::${procura1}`;
const messages = await supabase.from('messages').insert([
  { id: `test-message-${now}-1`, chat_id: chatId, sender_id: ids.buyer1, receiver_id: ids.company1, procura_id: procura1, text: 'Olá, esta conversa serve para testar a resposta da empresa.', timestamp: new Date(Date.now() - 60000).toISOString(), is_read: true },
  { id: `test-message-${now}-2`, chat_id: chatId, sender_id: ids.company1, receiver_id: ids.buyer1, procura_id: procura1, text: 'Olá! A empresa já pode responder porque o comprador iniciou o chat.', timestamp: new Date().toISOString(), is_read: false },
]);
if (messages.error) throw messages.error;

console.log(JSON.stringify({
  password,
  accounts: accounts.map(account => ({ type: account.type, email: account.email })),
  seeded: { procuras: 2, responses: 1, conversations: 1 },
}, null, 2));

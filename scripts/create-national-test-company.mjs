import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.TEST_COMPANY_EMAIL;
const password = process.env.TEST_COMPANY_PASSWORD;

if (!url || !serviceKey || !email || !password) {
  throw new Error('Variáveis necessárias para criar a empresa de teste não foram informadas.');
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
let authUser = null;
let page = 1;

while (!authUser) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  authUser = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) || null;
  if (authUser || data.users.length < 1000) break;
  page += 1;
}

if (!authUser) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      account_type: 'company',
      name: 'Empresa Teste Nacional',
      phone: '11999999999',
      cnpj: '45723174000110',
      address: 'Avenida Paulista, 1000, Bela Vista, São Paulo, SP',
      latitude: -23.561414,
      longitude: -46.655881,
      serves_locations: ['São Paulo, SP'],
      vehicle_types: ['car', 'motorcycle', 'truck', 'bus'],
    },
  });
  if (error) throw error;
  authUser = data.user;
} else {
  const { error } = await admin.auth.admin.updateUserById(authUser.id, {
    password,
    email_confirm: true,
    user_metadata: { ...authUser.user_metadata, account_type: 'company' },
  });
  if (error) throw error;
}

const { data: company, error: companyError } = await admin
  .from('companies')
  .update({
    name: 'Empresa Teste Nacional',
    phone: '11999999999',
    cnpj: '45723174000110',
    address: 'Avenida Paulista, 1000, Bela Vista, São Paulo, SP',
    latitude: -23.561414,
    longitude: -46.655881,
    serves_locations: ['São Paulo, SP'],
    vehicle_types: ['car', 'motorcycle', 'truck', 'bus'],
    validation_status: 'approved',
    validation_reason: 'Conta interna para testes em todas as cidades',
    can_respond_anywhere: true,
    is_demo: true,
    terms_accepted_date: null,
  })
  .eq('id', authUser.id)
  .select('id,email,name,validation_status,can_respond_anywhere,terms_accepted_date')
  .single();

if (companyError) throw companyError;
console.log(JSON.stringify(company, null, 2));

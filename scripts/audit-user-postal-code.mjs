import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) throw new Error('Variáveis do Supabase ausentes.');

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const email = `auditoria-cep-${Date.now()}@procuroprati.invalid`;
const password = `AuditoriaCep@${Date.now()}!`;
let userId;

try {
  const created = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: {
      account_type: 'user', name: 'Auditoria CEP', phone: '48999999999',
      location: 'Centro, Garopaba, SC', postal_code: '88495000', vehicles: [],
    },
  });
  if (created.error) throw created.error;
  userId = created.data.user.id;

  const saved = await admin.from('users').select('postal_code').eq('id', userId).single();
  if (saved.error) throw saved.error;
  if (saved.data.postal_code !== '88495000') throw new Error('O CEP não foi salvo no cadastro inicial.');

  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error) throw login.error;
  const updated = await client.from('users').update({ postal_code: '88010000' }).eq('id', userId).select('postal_code').single();
  if (updated.error) throw updated.error;
  if (updated.data.postal_code !== '88010000') throw new Error('O CEP não foi atualizado na edição.');

  console.log('Auditoria de CEP concluída: cadastro e edição aprovados.');
} finally {
  if (userId) {
    await admin.from('users').delete().eq('id', userId);
    await admin.auth.admin.deleteUser(userId);
  }
}

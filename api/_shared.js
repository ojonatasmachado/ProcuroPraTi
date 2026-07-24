export function getAdminConnection() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('Supabase não configurado no servidor.');
  return {
    baseUrl: `${supabaseUrl.replace(/\/$/, '')}/rest/v1`,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
  };
}

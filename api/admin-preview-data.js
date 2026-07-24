export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    response.status(503).json({ error: 'Supabase não configurado no servidor.' });
    return;
  }

  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const readTable = async (path) => {
    const result = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/${path}`, { headers });
    if (!result.ok) throw new Error(`${result.status}: ${await result.text()}`);
    return result.json();
  };

  try {
    const [users, companies, procuras, feedbacks, registrationProgress, errorEvents] = await Promise.all([
      readTable('users?select=id,name,email,phone,location,vehicles,created_at,terms_accepted_date&is_demo=eq.false'),
      readTable('companies?select=id,name,email,phone,cnpj,address,serves_locations,validation_status,validation_reason,vehicle_types,created_at,terms_accepted_date,payment_exempt_until,access_history&is_demo=eq.false&deleted_at=is.null'),
      readTable('procuras?select=*,responses(*)&is_demo=eq.false'),
      readTable('feedbacks?select=*&is_demo=eq.false'),
      readTable('registration_progress?select=email,stage,updated_at'),
      readTable('ui_error_events?select=*&order=last_seen_at.desc&limit=300'),
    ]);
    response.setHeader('Cache-Control', 'no-store');
    response.status(200).json({ users, companies, procuras, feedbacks, registrationProgress, errorEvents });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
}

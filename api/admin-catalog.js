import { getAdminConnection } from './_shared.js';

export default async function handler(request, response) {
  try {
    const { baseUrl, headers } = getAdminConnection();

    if (request.method === 'GET') {
      const search = String(request.query.search || '').trim();
      const status = String(request.query.status || 'pending');
      const submissionQuery = status === 'all' ? '' : `&status=eq.${encodeURIComponent(status)}`;
      const partFilter = search ? `&or=(name.ilike.*${encodeURIComponent(search)}*,normalized_name.ilike.*${encodeURIComponent(search)}*)` : '';
      const [submissionsResult, partsResult] = await Promise.all([
        fetch(`${baseUrl}/part_catalog_submissions?select=*&order=occurrences.desc,last_seen_at.desc&limit=100${submissionQuery}`, { headers }),
        fetch(`${baseUrl}/part_catalog?select=*&order=admin_locked.desc,name.asc&limit=100${partFilter}`, { headers }),
      ]);
      if (!submissionsResult.ok) throw new Error(await submissionsResult.text());
      if (!partsResult.ok) throw new Error(await partsResult.text());
      response.setHeader('Cache-Control', 'no-store');
      response.status(200).json({ submissions: await submissionsResult.json(), parts: await partsResult.json() });
      return;
    }

    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Método não permitido.' });
      return;
    }

    const body = request.body || {};
    const requestJson = async (path, options = {}) => {
      const result = await fetch(`${baseUrl}/${path}`, { headers: { ...headers, Prefer: 'return=representation' }, ...options });
      if (!result.ok) throw new Error(await result.text());
      const text = await result.text();
      return text ? JSON.parse(text) : null;
    };

    let result = null;
    if (body.action === 'add' || body.action === 'approve_new') {
      const row = {
        name: body.name,
        normalized_name: body.normalizedName,
        source_id: `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        category_name: body.primaryCategory || 'Outros',
        primary_category: body.primaryCategory || 'Outros',
        secondary_categories: body.secondaryCategories || [],
        vehicle_types: body.vehicleTypes || ['car'],
        aliases: body.aliases || [],
        is_high_value: Boolean(body.isHighValue),
        active: true,
        is_searchable: true,
        admin_locked: true,
        source: 'admin',
        admin_notes: body.adminNotes || null,
      };
      const inserted = await requestJson('part_catalog', { method: 'POST', body: JSON.stringify(row) });
      result = inserted?.[0] || null;
      if (body.submissionId && result?.id) {
        await requestJson(`part_catalog_submissions?id=eq.${encodeURIComponent(body.submissionId)}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'approved', linked_part_id: result.id, reviewed_at: new Date().toISOString(), admin_notes: body.adminNotes || null }),
        });
      }
    } else if (body.action === 'link') {
      result = await requestJson(`part_catalog_submissions?id=eq.${encodeURIComponent(body.submissionId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'linked', linked_part_id: body.partId, reviewed_at: new Date().toISOString(), admin_notes: body.adminNotes || null }),
      });
    } else if (body.action === 'update') {
      result = await requestJson(`part_catalog?id=eq.${encodeURIComponent(body.partId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: body.name,
          normalized_name: body.normalizedName,
          aliases: body.aliases || [],
          primary_category: body.primaryCategory,
          category_name: body.primaryCategory,
          secondary_categories: body.secondaryCategories || [],
          is_high_value: Boolean(body.isHighValue),
          active: Boolean(body.active),
          is_searchable: Boolean(body.active),
          disabled_at: body.active ? null : new Date().toISOString(),
          admin_locked: true,
          admin_notes: body.adminNotes || null,
        }),
      });
    } else if (body.action === 'ignore') {
      result = await requestJson(`part_catalog_submissions?id=eq.${encodeURIComponent(body.submissionId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ignored', reviewed_at: new Date().toISOString(), admin_notes: body.adminNotes || null }),
      });
    } else {
      throw new Error('Ação de catálogo inválida.');
    }

    response.status(200).json({ result });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
}

import { getAdminConnection } from './_shared.js';

export default async function handler(request, response) {
  try {
    if (request.method !== 'POST') {
      response.status(405).json({ error: 'Método não permitido.' });
      return;
    }
    const { baseUrl, headers } = getAdminConnection();
    const body = request.body || {};
    if (!body.companyId || !body.reason?.trim()) throw new Error('Empresa e justificativa são obrigatórias.');

    const now = new Date();
    const durationDays = Math.max(1, Number(body.durationDays || 30));
    const endsAt = body.indefinite ? null : new Date(now.getTime() + durationDays * 86400000).toISOString();

    const companyResult = await fetch(`${baseUrl}/companies?id=eq.${encodeURIComponent(body.companyId)}&select=plan_code,subscription_current_period_end,manual_plan_ends_at,trial_extended_until,trial_hard_ends_at`, { headers });
    if (!companyResult.ok) throw new Error(await companyResult.text());
    const companyCurrent = (await companyResult.json())?.[0] || {};

    const extendDate = value => new Date(Math.max(now.getTime(), value ? new Date(value).getTime() : 0) + durationDays * 86400000).toISOString();

    let companyPatch;
    let adjustment;
    if (body.action === 'extend_trial') {
      companyPatch = { trial_extended_until: endsAt };
      adjustment = { adjustment_type: 'trial_extension', company_id: body.companyId, reason: body.reason.trim(), starts_at: now.toISOString(), ends_at: endsAt, indefinite: false, no_charge: true };
    } else if (body.action === 'grant_plan') {
      if (!body.planCode) throw new Error('Selecione um plano.');
      companyPatch = { plan_code: body.planCode, subscription_state: 'subscriber_active', manual_plan_ends_at: endsAt, manual_plan_indefinite: Boolean(body.indefinite), manual_plan_reason: body.reason.trim(), subscription_payment_status: 'manual_no_charge' };
      adjustment = { adjustment_type: 'manual_plan', company_id: body.companyId, plan_code: body.planCode, reason: body.reason.trim(), starts_at: now.toISOString(), ends_at: endsAt, indefinite: Boolean(body.indefinite), no_charge: true };
    } else if (body.action === 'billing_pause') {
      companyPatch = {
        billing_pause_until: endsAt,
        billing_pause_reason: body.reason.trim(),
        ...(companyCurrent.subscription_current_period_end ? { subscription_current_period_end: extendDate(companyCurrent.subscription_current_period_end) } : {}),
        ...(companyCurrent.manual_plan_ends_at ? { manual_plan_ends_at: extendDate(companyCurrent.manual_plan_ends_at) } : {}),
        ...(!companyCurrent.plan_code ? { trial_extended_until: extendDate(companyCurrent.trial_extended_until || companyCurrent.trial_hard_ends_at) } : {}),
      };
      adjustment = { adjustment_type: 'billing_pause', company_id: body.companyId, plan_code: companyCurrent.plan_code || null, reason: body.reason.trim(), starts_at: now.toISOString(), ends_at: endsAt, indefinite: false, no_charge: true };
    } else {
      throw new Error('Ação administrativa inválida.');
    }

    const patchResult = await fetch(`${baseUrl}/companies?id=eq.${encodeURIComponent(body.companyId)}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify(companyPatch) });
    if (!patchResult.ok) throw new Error(await patchResult.text());
    const auditResult = await fetch(`${baseUrl}/company_entitlement_adjustments`, { method: 'POST', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify(adjustment) });
    if (!auditResult.ok) throw new Error(await auditResult.text());

    response.status(200).json({ company: (await patchResult.json())?.[0], adjustment: (await auditResult.json())?.[0] });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
}

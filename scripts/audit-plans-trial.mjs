import fs from 'node:fs/promises';

const read = path => fs.readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [migration, app, dashboard, header, plans, trial, catalogAdmin, vite, registration, team, dataService] = await Promise.all([
  read('supabase/migrations/20260723130000_business_plans_trial_catalog.sql'),
  read('src/App.jsx'),
  read('src/components/CompanyDashboard.jsx'),
  read('src/components/AppHeader.jsx'),
  read('src/components/CompanyPlans.jsx'),
  read('src/components/CompanyTrialExperience.jsx'),
  read('src/components/CatalogAdminPanel.jsx'),
  read('vite.config.js'),
  read('src/components/UserRegistration.jsx'),
  read('src/components/CompanyTeamManagement.jsx'),
  read('src/lib/dataService.js'),
]);

const checks = [
  ['cinco planos persistidos', [...migration.matchAll(/\('(?:local|regional|multiregional|estadual|nacional)'/g)].length >= 5],
  ['trial com critérios de 30 dias e 30 respostas', migration.includes("responded_count < 30") && migration.includes("interval '30 days'")],
  ['teto de segurança de 90 dias', migration.includes("interval '90 days'")],
  ['trial único por CNPJ', migration.includes('company_trial_registry') && migration.includes('ON CONFLICT (cnpj) DO NOTHING')],
  ['alcance definido pelo plano da empresa', migration.includes("plan_record.scope = 'radius'") && migration.includes("plan_record.scope = 'state'") && migration.includes("plan_record.scope = 'national'")],
  ['atraso por prioridade aplicado na API', migration.includes('visibility_delay_minutes') && migration.includes('make_interval(mins => delay_minutes)')],
  ['empresa incompatível com veículo bloqueada', migration.includes('jsonb_array_elements_text') && migration.includes('p_vehicle_type')],
  ['bloqueio de resposta após trial', migration.includes('Assine um plano para responder a esta procura')],
  ['trinta respostas contabilizadas por procura única', migration.includes('count(DISTINCT response.procura_id)')],
  ['resumo compara cobertura dos planos', migration.includes("'plan_coverage'") && trial.includes('Procuras que cada alcance teria incluído')],
  ['boas-vindas e progresso persistente', trial.includes('TrialWelcomeModal') && trial.includes('TrialProgressCard') && app.includes('markTrialWelcomeSeen')],
  ['popup no encerramento', trial.includes('TrialEndModal') && app.includes('markTrialEndSummarySeen')],
  ['botões permanecem visíveis e abrem bloqueio', dashboard.includes('SubscriptionBlockedDialog') && dashboard.includes('!subscriptionContext.canRespond')],
  ['menu de planos sempre disponível ao responsável', header.includes('Planos e assinatura') && header.includes('!isCompanyOperator')],
  ['tela exibe os cinco planos', plans.includes('SUBSCRIPTION_PLANS.map')],
  ['pagamento não é simulado', plans.includes('Nenhuma cobrança foi realizada')],
  ['comprador não escolhe mais raio', !dashboard.includes('searchRadiusKm || 10') && !app.includes('distance <= Number(p.searchRadiusKm')],
  ['admin revisa itens manuais', catalogAdmin.includes('Aprovar como novo item') && catalogAdmin.includes('Vincular')],
  ['admin concede e prorroga benefícios com histórico', vite.includes('company_entitlement_adjustments') && vite.includes('extend_trial') && vite.includes('grant_plan')],
  ['colaborador entra sem a senha principal', registration.includes('Sou colaborador') && dataService.includes('loginCollaborator')],
  ['colaborador usa CNPJ, usuário e PIN', registration.includes('collaborator-cnpj') && registration.includes('collaborator-username') && registration.includes('collaborator-pin')],
  ['usuário da equipe é sugerido profissionalmente', team.includes('suggestUsername') && team.includes('`${first}_${second')],
  ['credenciais da equipe são enviadas ao email', team.includes('Salvar e enviar') && dataService.includes('send-operator-access')],
];

const failures = checks.filter(([, ok]) => !ok);
if (failures.length) {
  console.error(JSON.stringify({ success: false, failures: failures.map(([name]) => name) }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ success: true, checks: checks.map(([name]) => name) }, null, 2));

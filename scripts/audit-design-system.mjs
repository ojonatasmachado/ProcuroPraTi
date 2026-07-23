import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const read = (path) => readFileSync(join(root, path), 'utf8');
const checks = [];
const assert = (name, condition) => {
  if (!condition) throw new Error(`Falha no design system: ${name}`);
  checks.push(name);
};

const css = read('src/index.css');
const dialog = read('src/components/ui/dialog.jsx');
const terms = read('src/components/TermsModal.jsx');
const registration = read('src/components/UserRegistration.jsx');
const responseModal = read('src/components/ResponseModal.jsx');
const themeContext = read('src/contexts/ThemeContext.jsx');
const userDashboard = read('src/components/UserDashboard.jsx');
const companyDashboard = read('src/components/CompanyDashboard.jsx');
const dashboardTabs = read('src/components/DashboardSectionTabs.jsx');

assert('azul oficial da marca', css.includes('--primary: 220.12 89.36% 56.67%'));
assert('fundo escuro oficial', css.includes('--background: 221.05 57.58% 6.47%'));
assert('cartão escuro oficial', css.includes('--card: 218.71 47.69% 12.75%'));
assert('borda escura oficial', css.includes('--border: 221.05 38.78% 19.22%'));
assert('verde ágil oficial', css.includes('--accent-agile: 171.69 71.55% 45.49%'));
assert('área de toque segura no fechamento', dialog.includes('h-10 w-10'));
assert('rótulo de fechamento em português', dialog.includes("closeLabel = 'Fechar'"));
assert('termos obrigatórios sem fechamento inativo', terms.includes('showClose={!requiresAcceptance}'));
assert('cadastro longo começa no topo', registration.includes("isRegistration ? 'justify-start' : 'justify-center'"));
assert('selo depende de validação real', responseModal.includes("validationStatus === 'validated'"));
assert('tema claro é o padrão inicial', themeContext.includes("? savedTheme : 'light'"));
assert('detalhe da resposta precede o chat', responseModal.includes('Ver resposta') && responseModal.includes('Proximidade do seu endereço'));
assert('homes compartilham a mesma navegação', userDashboard.includes('DashboardSectionTabs') && companyDashboard.includes('DashboardSectionTabs'));
assert('abas possuem o mesmo estado ativo', dashboardTabs.includes("bg-primary/15 text-primary"));
assert('títulos das páginas têm hierarquia forte', userDashboard.includes('text-xl font-extrabold') && companyDashboard.includes('text-xl font-extrabold'));
assert('nome da peça tem hierarquia compacta', userDashboard.includes('min-h-10 text-lg font-extrabold') && companyDashboard.includes('min-h-10 text-lg font-extrabold'));

const componentFiles = [];
const walk = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.name.endsWith('.jsx')) componentFiles.push(path);
  }
};
walk(join(root, 'src/components'));

const forbiddenColor = /(?:text|bg|border|from|via|to)-(?:blue|indigo|purple|pink|green|yellow|orange|red|teal)-\d+/g;
const violations = componentFiles.flatMap((path) => {
  const matches = readFileSync(path, 'utf8').match(forbiddenColor) || [];
  return matches.map((match) => `${path.replace(root, '')}: ${match}`);
});
assert(`componentes usam apenas cores semânticas${violations.length ? ` (${violations.join(', ')})` : ''}`, violations.length === 0);

console.log(JSON.stringify({ success: true, checks }, null, 2));

import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(file, 'utf8');
const checks = [
  ['viewport com áreas seguras', read('index.html').includes('viewport-fit=cover')],
  ['proteção global contra rolagem horizontal', read('src/index.css').includes('overflow-x: hidden')],
  ['altura dinâmica para navegadores móveis', read('src/index.css').includes('100dvh')],
  ['áreas seguras para cabeçalho e ações', read('src/index.css').includes('env(safe-area-inset-top)') && read('src/index.css').includes('env(safe-area-inset-bottom)')],
  ['campos sem zoom automático no iOS', read('src/index.css').includes('font-size: 16px !important')],
  ['cabeçalho compacto em celular', read('src/components/AppHeader.jsx').includes('compactOnMobile')],
  ['notificações limitadas à largura do celular', read('src/components/NotificationDropdown.jsx').includes('w-[calc(100vw-1rem)]') && read('src/components/NotificationDropdown.jsx').includes('collisionPadding={8}')],
  ['cadastro limitado à largura disponível', read('src/components/UserRegistration.jsx').includes('className="w-full max-w-md"')],
  ['formulário reorganiza cabeçalho no celular', read('src/components/SearchForm.jsx').includes('flex flex-col sm:flex-row')],
  ['modal de chat usa altura dinâmica', read('src/components/ChatModal.jsx').includes('80dvh')],
  ['lista de chats usa altura dinâmica', read('src/components/ChatListModal.jsx').includes('80dvh')],
  ['landing usa CTAs empilhados no celular', read('src/components/landing/HeroSection.jsx').includes('grid-cols-1 sm:grid-cols-2')],
  ['cards mantêm leitura confortável em qualquer tela', read('src/components/SearchList.jsx').includes('max-w-2xl') && read('src/components/SearchList.jsx').includes('grid-cols-1')],
];

const sourceFiles = [
  'src/App.jsx', 'src/components/AppHeader.jsx', 'src/components/UserRegistration.jsx',
  'src/components/SearchForm.jsx', 'src/components/ChatModal.jsx', 'src/components/ChatListModal.jsx',
];
checks.push(['nenhum breakpoint não configurado', !sourceFiles.some((file) => /\bxs:/.test(read(file)))]);

const failed = checks.filter(([, passed]) => !passed).map(([name]) => name);
if (failed.length) throw new Error(`Falhas responsivas: ${failed.join(', ')}`);
console.log(JSON.stringify({ success: true, checks: checks.map(([name]) => name) }, null, 2));

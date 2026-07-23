import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'dist/index.html',
  'dist/manifest.webmanifest',
  'dist/sw.js',
  'dist/push-sw.js',
  'dist/pwa-192x192-v2.png',
  'dist/pwa-512x512-v2.png',
  'dist/apple-touch-icon-v2.png',
];

for (const file of requiredFiles) {
  if (!existsSync(file)) throw new Error(`Arquivo PWA ausente: ${file}`);
}

const manifest = JSON.parse(readFileSync('dist/manifest.webmanifest', 'utf8'));
if (manifest.display !== 'standalone') throw new Error('O manifesto não está configurado como standalone.');
if (manifest.start_url !== '/' || manifest.scope !== '/') throw new Error('Escopo ou URL inicial inválidos.');
if (!manifest.icons?.some((icon) => icon.sizes === '192x192')) throw new Error('Ícone de 192px ausente.');
if (!manifest.icons?.some((icon) => icon.sizes === '512x512' && icon.purpose === 'maskable')) throw new Error('Ícone maskable ausente.');

const index = readFileSync('dist/index.html', 'utf8');
if (!index.includes('manifest.webmanifest')) throw new Error('Manifesto não vinculado ao HTML.');
if (!index.includes('apple-touch-icon')) throw new Error('Ícone Apple não vinculado ao HTML.');
if (!index.includes('apple-touch-icon-v2.png')) throw new Error('O HTML ainda referencia o ícone Apple antigo.');
if (!index.includes('apple-mobile-web-app-status-bar-style\" content=\"default')) throw new Error('A barra de status do iOS não acompanha o tema claro padrão.');

const serviceWorker = readFileSync('dist/sw.js', 'utf8');
if (!serviceWorker.includes('push-sw.js')) throw new Error('Tratador de push não importado pelo service worker.');
const pushWorker = readFileSync('dist/push-sw.js', 'utf8');
if (pushWorker.includes("payload.title || 'Procuro pra ti'")) throw new Error('O push ainda repete a marca no título padrão.');
if (!pushWorker.includes('pwa-192x192-v2.png')) throw new Error('O push ainda usa o ícone antigo.');
if (!pushWorker.includes("data: { url: payload.url || '/' }")) throw new Error('O push não preserva o destino da ação.');
if (!pushWorker.includes('existing.navigate(targetUrl).then')) throw new Error('Uma janela aberta do PWA não navega até o destino do push.');
if (!pushWorker.includes("payload.kind === 'chat_message'") || !pushWorker.includes("visibilityState === 'visible'")) throw new Error('Push de chat não é suprimido quando o aplicativo está visível.');
if (!pushWorker.includes("type: 'CHAT_MESSAGE_RECEIVED'")) throw new Error('O aplicativo aberto não recebe o sinal interno da nova mensagem.');
if (!pushWorker.includes("type !== 'APP_VISIBILITY'")) throw new Error('O service worker não recebe o estado real de visibilidade do aplicativo.');
if (!pushWorker.includes("client.focused === true")) throw new Error('O push do chat pode ser silenciado quando o aplicativo está em segundo plano.');
if (!pushWorker.includes('now - appState.updatedAt < 15000')) throw new Error('O estado de primeiro plano não expira e pode bloquear notificações em segundo plano.');

const pushFunction = readFileSync('supabase/functions/send-web-push/index.ts', 'utf8');
for (const destination of ['destino=mensagem', 'destino=respostas', 'destino=procuras']) {
  if (!pushFunction.includes(destination)) throw new Error(`Destino ausente no envio de push: ${destination}`);
}
if (!pushFunction.includes("seconds: 2 * 60") || !pushFunction.includes("seconds: 10 * 60")) throw new Error('As janelas de agrupamento de push não estão configuradas.');
if (!pushFunction.includes('claim_push_notification_window')) throw new Error('O envio de push não aplica o agrupamento por destinatário e contexto.');

const pwaRegistration = readFileSync('src/lib/pwa.js', 'utf8');
if (!pwaRegistration.includes('registration.update()')) throw new Error('O PWA não verifica novas versões ao ser reaberto.');
if (!pwaRegistration.includes("visibilitychange")) throw new Error('O PWA não verifica atualizações ao voltar para o primeiro plano.');
if (!pwaRegistration.includes("url.searchParams.set('atualizacao'")) throw new Error('A recuperação do PWA não força uma navegação para a versão atual.');
if (!pwaRegistration.includes("'controllerchange'")) throw new Error('A recuperação não aguarda o novo service worker assumir o aplicativo.');

const main = readFileSync('src/main.jsx', 'utf8');
const app = readFileSync('src/App.jsx', 'utf8');
const errorBoundary = readFileSync('src/components/AppErrorBoundary.jsx', 'utf8');
const installOnboarding = readFileSync('src/components/InstallOnboarding.jsx', 'utf8');
if (main.includes('<InstallOnboarding')) throw new Error('O convite de instalação ainda é exibido fora da sessão autenticada.');
if (!app.includes('<InstallOnboarding isAuthenticated={Boolean(currentUser)}')) throw new Error('O convite de instalação não está vinculado ao login.');
if (!installOnboarding.includes('if (!isAuthenticated)')) throw new Error('O convite de instalação não fecha ao sair da conta.');
if (!errorBoundary.includes('refreshPwaApplication')) throw new Error('A tela de recuperação não busca a versão atual do PWA.');

console.log(JSON.stringify({ success: true, checks: requiredFiles.length + 23 }, null, 2));

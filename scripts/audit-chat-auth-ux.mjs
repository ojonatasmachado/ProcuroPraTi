import { readFileSync } from 'node:fs';

const chat = readFileSync('src/components/ChatModal.jsx', 'utf8');
if (!chat.includes('scrollTop = scrollAreaRef.current.scrollHeight')) throw new Error('O chat não posiciona a rolagem na mensagem mais recente.');
if (!chat.includes('messagesEndRef')) throw new Error('O chat não possui âncora para a última mensagem.');

const registration = readFileSync('src/components/UserRegistration.jsx', 'utf8');
for (const requirement of ['Pelo menos 8 caracteres', 'Uma letra maiúscula e uma minúscula', 'Pelo menos um número', 'Pelo menos um caractere especial', 'As senhas são iguais.']) {
  if (!registration.includes(requirement)) throw new Error(`Orientação de senha ausente: ${requirement}`);
}
if (!registration.includes('noValidate')) throw new Error('O cadastro ainda depende apenas das mensagens nativas do navegador.');

const app = readFileSync('src/App.jsx', 'utf8');
if (!app.includes('await hydrateSession(result.session)')) throw new Error('O cadastro não inicia a sessão imediatamente.');
if (!app.includes('Seu acesso já está liberado e a confirmação continua pendente.')) throw new Error('A confirmação de email pendente não está visível sem bloquear o acesso.');
if (!app.includes('dataService.confirmOwnEmail()')) throw new Error('O retorno pelo link não registra a confirmação do email.');

const emailMigration = readFileSync('supabase/migrations/20260716200000_non_blocking_email_verification.sql', 'utf8');
if (!emailMigration.includes('email_verified_at') || !emailMigration.includes('confirm_own_email')) throw new Error('Persistência da confirmação de email ausente.');

console.log(JSON.stringify({ success: true, checks: 12 }, null, 2));

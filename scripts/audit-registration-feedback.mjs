import { readFileSync } from 'node:fs';

const registration = readFileSync('src/components/UserRegistration.jsx', 'utf8');
const vehicleSelector = readFileSync('src/components/VehicleSelector.jsx', 'utf8');
const combobox = readFileSync('src/components/CityCombobox.jsx', 'utf8');
const vehicleTypeSelector = readFileSync('src/components/VehicleTypeSelector.jsx', 'utf8');
const profile = readFileSync('src/components/UserProfile.jsx', 'utf8');
const cepLookup = readFileSync('src/components/CepAddressLookup.jsx', 'utf8');
const cnpjLookup = readFileSync('src/components/CnpjLookup.jsx', 'utf8');
const passwordReset = readFileSync('src/components/PasswordResetForm.jsx', 'utf8');
const dataService = readFileSync('src/lib/dataService.js', 'utf8');
const errorMessages = readFileSync('src/lib/errorMessages.js', 'utf8');
const app = readFileSync('src/App.jsx', 'utf8');

const checks = [
  ['mensagem geral de falha no formulário', registration.includes('setFormError') && registration.includes('role="alert"')],
  ['avisos abaixo dos campos', registration.includes('const FieldError') && registration.includes('<FieldError>{fieldErrors.email}</FieldError>')],
  ['cadastro informa falha de persistência', registration.includes('Não foi possível efetuar o cadastro')],
  ['login informa falha no formulário', registration.includes('Não foi possível entrar. Confira o email e a senha.')],
  ['cadastro de cliente não exige CPF', !registration.includes('htmlFor="cpf"') && !registration.includes('isValidCpf')],
  ['cadastro de cliente é salvo por etapas', registration.includes("registrationStage === 'personal'") && registration.includes("registrationStage === 'address'") && registration.includes("registrationStage === 'vehicle'")],
  ['progresso do cadastro é persistido', registration.includes('onSaveRegistrationProgress')],
  ['CNPJ possui aviso específico', registration.includes('fieldErrors.cnpj')],
  ['catálogo de modelos permite todos os resultados da marca', vehicleSelector.includes('maxResults={500}') && combobox.includes('maxResults = 100')],
  ['modelo pode ser pesquisado por texto', vehicleSelector.includes('searchPlaceholder="Digite modelo ou versão"')],
  ['empresa escolhe tipos de veículos atendidos', registration.includes('<VehicleTypeSelector') && registration.includes('fieldErrors.vehicleTypes') && vehicleTypeSelector.includes('motorcycle')],
  ['empresa informa número exato obrigatório', registration.includes('addressNumber:') && registration.includes('Número da empresa *') && registration.includes('Informe o número da empresa.')],
  ['telefone e WhatsApp são distintos', registration.includes('Telefone da empresa') && registration.includes('htmlFor="whatsapp"')],
  ['cadastro e perfil da empresa não exibem mapa', !registration.includes('LocationMapPicker') && !profile.includes('LocationMapPicker')],
  ['CEP e CNPJ são consultados automaticamente', cepLookup.includes('useEffect') && cnpjLookup.includes('useEffect') && !cepLookup.includes('>Buscar<') && !cnpjLookup.includes('>Consultar<')],
  ['perfil da empresa repete os campos do cadastro', ['cnpj', 'name', 'email', 'phone', 'whatsapp', 'addressCep', 'addressStreet', 'addressNumber', 'addressState', 'addressCity', 'vehicleTypes'].every(field => profile.includes(field))],
  ['perfil da empresa oferece exclusão confirmada', profile.includes('Excluir conta') && profile.includes('Sim, excluir') && profile.includes('onDeleteAccount')],
  ['veículos atendidos aparecem por último no cadastro da empresa', registration.lastIndexOf('id="vehicleTypesSection"') > registration.lastIndexOf('htmlFor="whatsapp"')],
  ['login oferece recuperação de senha', registration.includes('Esqueci minha senha') && registration.includes('onRequestPasswordReset')],
  ['recuperação usa o fluxo seguro do Supabase', dataService.includes('resetPasswordForEmail') && dataService.includes('/redefinir-senha') && dataService.includes('updateUser({ password })')],
  ['nova senha possui validação e confirmação', passwordReset.includes('Pelo menos 8 caracteres') && passwordReset.includes('As senhas não coincidem.') && passwordReset.includes('Salvar nova senha')],
  ['confirmação é reenviada automaticamente após bloqueio temporário', dataService.includes('retryOnRateLimit') && dataService.includes('getEmailRetryDelayMs') && app.includes('{ retryOnRateLimit: true }')],
  ['erros de autenticação são apresentados em português', errorMessages.includes('over_email_send_rate_limit') && errorMessages.includes('aguarde até 60 segundos') && dataService.includes('toPortugueseError')],
];

const failures = checks.filter(([, passed]) => !passed);
if (failures.length) throw new Error(failures.map(([name]) => name).join(', '));
console.log(JSON.stringify({ success: true, checks: checks.map(([name]) => name) }, null, 2));

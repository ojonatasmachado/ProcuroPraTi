const AUTH_ERROR_MESSAGES = {
  over_email_send_rate_limit: 'Por segurança, aguarde até 60 segundos antes de solicitar um novo e-mail.',
  over_request_rate_limit: 'Foram feitas muitas tentativas. Aguarde alguns minutos e tente novamente.',
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Seu e-mail ainda não foi confirmado.',
  email_address_invalid: 'Informe um endereço de e-mail válido.',
  email_exists: 'Este e-mail já está cadastrado.',
  user_already_exists: 'Este e-mail já está cadastrado.',
  user_not_found: 'Não encontramos uma conta com esses dados.',
  weak_password: 'A senha não atende aos requisitos de segurança.',
  same_password: 'A nova senha deve ser diferente da senha atual.',
  otp_expired: 'Este link expirou. Solicite um novo e-mail.',
  validation_failed: 'Revise as informações e tente novamente.',
};

const MESSAGE_PATTERNS = [
  [/for security purposes.*(?:after|in).*seconds?/i, 'Por segurança, aguarde até 60 segundos antes de solicitar um novo e-mail.'],
  [/email rate limit exceeded|too many emails/i, 'Por segurança, aguarde até 60 segundos antes de solicitar um novo e-mail.'],
  [/rate limit|too many requests/i, 'Foram feitas muitas tentativas. Aguarde alguns minutos e tente novamente.'],
  [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
  [/email not confirmed/i, 'Seu e-mail ainda não foi confirmado.'],
  [/user already registered|already been registered|email.*already exists/i, 'Este e-mail já está cadastrado.'],
  [/unable to validate email|invalid email/i, 'Informe um endereço de e-mail válido.'],
  [/password should be at least|weak password/i, 'A senha não atende aos requisitos de segurança.'],
  [/new password should be different|same password/i, 'A nova senha deve ser diferente da senha atual.'],
  [/otp.*expired|token.*expired|link.*expired/i, 'Este link expirou. Solicite um novo e-mail.'],
  [/failed to fetch|network request failed|load failed/i, 'Não foi possível conectar ao serviço. Verifique sua internet e tente novamente.'],
];

const rawMessage = (error) => String(error?.message || error || '').trim();

export const isEmailSendRateLimitError = (error) => {
  const message = rawMessage(error);
  return error?.code === 'over_email_send_rate_limit'
    || /for security purposes.*(?:after|in).*seconds?/i.test(message)
    || /email rate limit exceeded|too many emails/i.test(message);
};

export const getEmailRetryDelayMs = (error) => {
  const message = rawMessage(error);
  const seconds = Number(message.match(/(?:after|in)\s+(\d+)\s+seconds?/i)?.[1] || 60);
  return (Math.max(1, seconds) * 1000) + 2000;
};

export const getPortugueseErrorMessage = (error, fallback = 'Não foi possível concluir a operação. Tente novamente.') => {
  if (error?.code && AUTH_ERROR_MESSAGES[error.code]) return AUTH_ERROR_MESSAGES[error.code];
  const message = rawMessage(error);
  const translated = MESSAGE_PATTERNS.find(([pattern]) => pattern.test(message));
  if (translated) return translated[1];
  if (/[áàâãéêíóôõúç]|\b(não|informe|tente|aguarde|senha|e-mail|email|cadastro|conta)\b/i.test(message)) return message;
  return fallback;
};

export const toPortugueseError = (error, fallback) => {
  const localized = new Error(getPortugueseErrorMessage(error, fallback));
  if (error?.code) localized.code = error.code;
  if (error?.status) localized.status = error.status;
  return localized;
};

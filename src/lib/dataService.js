import { supabase } from './supabaseClient';
import { optimizeImageForUpload } from './imageOptimization';
import { getEmailRetryDelayMs, isEmailSendRateLimitError, toPortugueseError } from './errorMessages';

const requireSupabase = () => {
  if (!supabase) throw new Error('A conexão com o Supabase não está configurada.');
  return supabase;
};

export const toCamel = (value) => {
  if (Array.isArray(value)) return value.map(toCamel);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key.replace(/_([a-z])/g, (_, char) => char.toUpperCase()), toCamel(val)]));
  }
  return value;
};

const toSnake = (value) => {
  if (Array.isArray(value)) return value.map(toSnake);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key.replace(/([A-Z])/g, '_$1').toLowerCase(), toSnake(val)]));
  }
  return value;
};

const normalizeMessages = (rows = []) => rows.map(toCamel).reduce((groups, message) => {
  if (!groups[message.chatId]) groups[message.chatId] = [];
  groups[message.chatId].push(message);
  groups[message.chatId].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return groups;
}, {});

const attachChatImageUrls = async (rows = []) => {
  const normalized = rows.map(toCamel);
  const paths = [...new Set(normalized.map(message => message.imagePath).filter(Boolean))];
  if (paths.length === 0) return normalized;
  const { data, error } = await requireSupabase().storage.from('chat-images').createSignedUrls(paths, 60 * 60);
  if (error) return normalized;
  const urls = new Map((data || []).map(item => [item.path, item.signedUrl]));
  return normalized.map(message => ({ ...message, imageUrl: message.imagePath ? urls.get(message.imagePath) || '' : '' }));
};

const throwIfError = (error) => { if (error) throw toPortugueseError(error); };
const wait = (milliseconds) => new Promise(resolve => window.setTimeout(resolve, milliseconds));

const getEmailRedirectUrl = () => `${window.location.origin}/confirmacao`;
const getPasswordResetRedirectUrl = () => `${window.location.origin}/redefinir-senha`;

export const dataService = {
  async getSession() {
    const { data, error } = await requireSupabase().auth.getSession();
    throwIfError(error);
    return data.session;
  },
  async resolveAuthCallback() {
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
    const errorDescription = url.searchParams.get('error_description') || hash.get('error_description');
    const isPasswordRecovery = url.pathname === '/redefinir-senha' || hash.get('type') === 'recovery';
    const isCallback = url.pathname === '/confirmacao' || isPasswordRecovery || Boolean(url.searchParams.get('code')) || hash.has('access_token') || Boolean(errorDescription);
    if (errorDescription) throw toPortugueseError(new Error(decodeURIComponent(errorDescription.replace(/\+/g, ' '))), 'Não foi possível validar este link. Solicite um novo e-mail.');

    const { data: existing, error: sessionError } = await requireSupabase().auth.getSession();
    throwIfError(sessionError);
    const hashAccessToken = hash.get('access_token');
    const hasVerificationToken = Boolean(url.searchParams.get('code')) || Boolean(hashAccessToken && existing.session?.access_token === hashAccessToken);
    if (!url.searchParams.get('code')) return { session: existing.session, isCallback, hasVerificationToken, isPasswordRecovery };

    const { data, error } = await requireSupabase().auth.exchangeCodeForSession(url.searchParams.get('code'));
    throwIfError(error);
    return { session: data.session, isCallback, hasVerificationToken, isPasswordRecovery };
  },
  onAuthStateChange(callback) { return requireSupabase().auth.onAuthStateChange(callback); },
  async getAccountType(email) {
    const { data, error } = await requireSupabase().rpc('account_type_for_email', { p_email: email.trim().toLowerCase() });
    throwIfError(error);
    return data || null;
  },
  async identifierExists(kind, value) {
    const { data, error } = await requireSupabase().rpc('identifier_registered', { p_kind: kind, p_value: value });
    throwIfError(error);
    return Boolean(data);
  },
  async saveRegistrationProgress(progress) {
    const { error } = await requireSupabase().rpc('save_registration_progress', {
      p_email: progress.email.trim().toLowerCase(),
      p_name: progress.name?.trim() || '',
      p_phone: progress.phone?.trim() || '',
      p_stage: progress.stage,
      p_data: progress.data || {},
    });
    throwIfError(error);
  },
  async register(profile, type) {
    const metadata = {
      account_type: type, name: profile.name, phone: profile.phone || null,
      ...(type === 'user'
        ? { cpf: profile.cpf, location: profile.location || null, postal_code: profile.postalCode || null, vehicles: profile.vehicles || [] }
        : { cnpj: profile.cnpj, whatsapp: profile.whatsapp || null, address: profile.address, address_number: profile.addressNumber || null, postal_code: profile.postalCode || null, latitude: profile.latitude ?? null, longitude: profile.longitude ?? null, location_source: profile.locationSource || 'cep', serves_locations: profile.servesLocations || [], vehicle_types: profile.vehicleTypes || ['car'] }),
    };
    const { data, error } = await requireSupabase().auth.signUp({
      email: profile.email.trim().toLowerCase(),
      password: profile.password,
      options: { data: metadata, emailRedirectTo: getEmailRedirectUrl() },
    });
    throwIfError(error);
    if (data.session) return { session: data.session, user: data.user, termsAcceptedDate: null };

    try {
      const login = await this.login(profile.email, profile.password);
      return { session: login.session, user: login.user, termsAcceptedDate: null };
    } catch {
      return { session: null, user: data.user, termsAcceptedDate: null };
    }
  },
  async resendConfirmation(email) {
    const { error } = await requireSupabase().auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: getEmailRedirectUrl() },
    });
    throwIfError(error);
  },
  async requestPasswordReset(email) {
    const { error } = await requireSupabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: getPasswordResetRedirectUrl() });
    throwIfError(error);
  },
  async updatePassword(password) {
    const { data, error } = await requireSupabase().auth.updateUser({ password });
    throwIfError(error);
    return data.user;
  },
  async sendEmailVerification(email, { retryOnRateLimit = false } = {}) {
    const send = () => requireSupabase().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false, emailRedirectTo: getEmailRedirectUrl() },
    });
    let { error } = await send();
    let delayed = false;
    if (error && retryOnRateLimit && isEmailSendRateLimitError(error)) {
      delayed = true;
      await wait(getEmailRetryDelayMs(error));
      ({ error } = await send());
    }
    throwIfError(error);
    return { delayed };
  },
  async confirmOwnEmail() {
    const { data, error } = await requireSupabase().rpc('confirm_own_email');
    throwIfError(error);
    return data;
  },
  async login(email, password) {
    const { data, error } = await requireSupabase().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    throwIfError(error);
    return data;
  },
  async loginCollaborator({ cnpj, username, pin, deviceId, deviceName }) {
    const client = requireSupabase();
    const { data: access, error: accessError } = await client.functions.invoke('company-collaborator-login', {
      body: { cnpj, username, pin },
    });
    throwIfError(accessError);
    if (!access?.tokenHash || !access?.email) throw new Error(access?.error || 'Não foi possível liberar o acesso.');
    const { data, error } = await client.auth.verifyOtp({ token_hash: access.tokenHash, type: 'magiclink' });
    throwIfError(error);
    const { data: claimed, error: claimError } = await client.rpc('claim_company_access', {
      p_mode: 'operator',
      p_username: username,
      p_pin: pin,
      p_device_id: deviceId,
      p_device_name: deviceName,
    });
    throwIfError(claimError);
    if (!claimed?.success) throw new Error(claimed?.message || 'Não foi possível liberar o acesso do colaborador.');
    return data;
  },
  async logout() {
    const { error } = await requireSupabase().auth.signOut();
    throwIfError(error);
  },
  async getCompanyAccessContext() {
    const { data, error } = await requireSupabase().rpc('get_company_access_context');
    throwIfError(error);
    return toCamel(data || {});
  },
  async getSubscriptionPlans() {
    const { data, error } = await requireSupabase().from('subscription_plans').select('*').eq('active', true).order('sort_order');
    throwIfError(error);
    return (data || []).map(toCamel);
  },
  async getCompanySubscriptionContext() {
    const { data, error } = await requireSupabase().rpc('get_company_subscription_context');
    throwIfError(error);
    return toCamel(data || {});
  },
  async markTrialWelcomeSeen() {
    const { error } = await requireSupabase().rpc('mark_trial_welcome_seen');
    throwIfError(error);
  },
  async markTrialEndSummarySeen() {
    const { error } = await requireSupabase().rpc('mark_trial_end_summary_seen');
    throwIfError(error);
  },
  async enableCompanyTeamAccess(ownerPin, deviceId, deviceName) {
    const { data, error } = await requireSupabase().rpc('enable_company_team_access', {
      p_owner_pin: ownerPin, p_device_id: deviceId, p_device_name: deviceName,
    });
    throwIfError(error);
    return toCamel(data || {});
  },
  async claimCompanyAccess({ mode, username = '', pin, deviceId, deviceName }) {
    const { data, error } = await requireSupabase().rpc('claim_company_access', {
      p_mode: mode, p_username: username, p_pin: pin, p_device_id: deviceId, p_device_name: deviceName,
    });
    throwIfError(error);
    const result = toCamel(data || {});
    if (!result.success) {
      const accessError = new Error(result.message || 'Não foi possível liberar o acesso.');
      accessError.limitReached = Boolean(result.limitReached);
      throw accessError;
    }
    return result;
  },
  async heartbeatCompanyAccess() {
    const { data, error } = await requireSupabase().rpc('heartbeat_company_access');
    throwIfError(error);
    return Boolean(data);
  },
  async releaseCompanyAccess() {
    const { error } = await requireSupabase().rpc('release_company_access');
    throwIfError(error);
  },
  async getCompanyOperators() {
    const { data, error } = await requireSupabase().rpc('list_company_operators');
    throwIfError(error);
    return (data || []).map(toCamel);
  },
  async saveCompanyOperator({ id = null, name, username, pin, contactEmail }) {
    const { data, error } = await requireSupabase().rpc('save_company_operator', {
      p_name: name, p_username: username, p_pin: pin, p_contact_email: contactEmail, p_operator_id: id,
    });
    throwIfError(error);
    const saved = toCamel(data || {});
    const { error: emailError } = await requireSupabase().functions.invoke('send-operator-access', {
      body: { operatorId: saved.id, pin },
    });
    return { ...saved, emailSent: !emailError };
  },
  async disableCompanyOperator(operatorId) {
    const { error } = await requireSupabase().rpc('disable_company_operator', { p_operator_id: operatorId });
    throwIfError(error);
  },
  async getCompanyAccessSessions() {
    const { data, error } = await requireSupabase().rpc('list_company_access_sessions');
    throwIfError(error);
    return (data || []).map(toCamel);
  },
  async revokeCompanyAccessSession(accessSessionId) {
    const { error } = await requireSupabase().rpc('revoke_company_access_session', { p_access_session_id: accessSessionId });
    throwIfError(error);
  },
  async deleteOwnCompanyAccount() {
    const client = requireSupabase();
    const { data, error } = await client.rpc('delete_own_company_account');
    throwIfError(error);
    await client.auth.signOut({ scope: 'local' }).catch(() => {});
    return data;
  },
  async getCurrentProfile(userId, preferredType) {
    const client = requireSupabase();
    const types = preferredType === 'company' ? ['company', 'user'] : ['user', 'company'];
    for (const type of types) {
      const table = type === 'company' ? 'companies' : 'users';
      const { data, error } = await client.from(table).select('*').eq('id', userId).maybeSingle();
      throwIfError(error);
      if (data) return { profile: toCamel(data), type };
    }
    return null;
  },
  async getUsers() {
    const { data, error } = await requireSupabase().from('user_directory').select('id,name');
    throwIfError(error);
    return (data || []).map(toCamel);
  },
  async getCompanies() {
    const { data, error } = await requireSupabase().from('company_directory').select('*');
    throwIfError(error);
    return (data || []).map(toCamel);
  },
  async getProcuras() {
    const { data, error } = await requireSupabase().from('procuras').select('*, responses(*)').order('created_at', { ascending: false });
    throwIfError(error);
    return (data || []).map(toCamel);
  },
  async getMessages() {
    const { error: deliveryError } = await requireSupabase().rpc('mark_messages_delivered');
    throwIfError(deliveryError);
    const { data, error } = await requireSupabase().from('messages').select('*').order('timestamp', { ascending: true });
    throwIfError(error);
    return normalizeMessages(await attachChatImageUrls(data || []));
  },
  subscribeToDataChanges(onChange) {
    const client = requireSupabase();
    const channel = client
      .channel(`app-data-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'procuras' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'responses' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, onChange)
      .subscribe();
    return () => { void client.removeChannel(channel); };
  },
  async createProcura(procura) {
    const allowed = ['id', 'userId', 'vehicleType', 'vehicleBrand', 'vehicleModel', 'vehicleYear', 'partName', 'partDescription', 'wantsPhotos', 'referencePhotoUrl', 'preferredCondition', 'locations', 'createdAt', 'status', 'duration', 'vehicleBrandId', 'vehicleModelId', 'vehicleYearId', 'vehicleFuel', 'searchLatitude', 'searchLongitude', 'searchLocationSource', 'searchRadiusKm'];
    const row = Object.fromEntries(Object.entries(procura).filter(([key, value]) => allowed.includes(key) && value !== undefined));
    const { data, error } = await requireSupabase().from('procuras').insert(toSnake(row)).select().single();
    throwIfError(error);
    return { ...toCamel(data), responses: [] };
  },
  async updateProcura(procuraId, procura) {
    const allowed = ['vehicleType', 'vehicleBrand', 'vehicleModel', 'vehicleYear', 'partName', 'partDescription', 'wantsPhotos', 'referencePhotoUrl', 'preferredCondition', 'locations', 'duration', 'vehicleBrandId', 'vehicleModelId', 'vehicleYearId', 'vehicleFuel', 'searchLatitude', 'searchLongitude', 'searchLocationSource', 'searchRadiusKm'];
    const row = Object.fromEntries(Object.entries(procura).filter(([key, value]) => allowed.includes(key) && value !== undefined));
    const { data, error } = await requireSupabase().from('procuras').update(toSnake(row)).eq('id', procuraId).select().single();
    throwIfError(error);
    return toCamel(data);
  },
  async updateProcuraStatus(procuraId, status, createdAt) {
    const { error } = await requireSupabase().from('procuras').update({ status, ...(createdAt ? { created_at: createdAt } : {}) }).eq('id', procuraId);
    throwIfError(error);
  },
  async upsertResponse(procuraId, response) {
    const allowed = ['id', 'companyId', 'companyName', 'responseDate', 'status', 'price', 'message', 'partCondition', 'partType', 'photoUrl', 'cnpj', 'address', 'location', 'isReadByUser', 'isReadByCompany'];
    const sanitized = Object.fromEntries(Object.entries(response).filter(([key, value]) => allowed.includes(key) && value !== undefined));
    const { data, error } = await requireSupabase().rpc('save_company_response', { p_procura_id: procuraId, p_response: toSnake(sanitized) });
    throwIfError(error);
    return toCamel(data);
  },
  async markResponseRead(responseId) {
    const { error } = await requireSupabase().rpc('mark_response_read', { p_response_id: responseId });
    throwIfError(error);
  },
  async createMessage(message) {
    const { data, error } = await requireSupabase().from('messages').insert(toSnake(message)).select().single();
    throwIfError(error);
    return (await attachChatImageUrls([data]))[0];
  },
  async uploadChatImage(file, userId) {
    const optimizedFile = await optimizeImageForUpload(file);
    const path = `${userId}/${crypto.randomUUID()}.webp`;
    const { error } = await requireSupabase().storage.from('chat-images').upload(path, optimizedFile, { cacheControl: '3600', contentType: 'image/webp', upsert: false });
    throwIfError(error);
    return path;
  },
  async removeChatImage(path) {
    const { error } = await requireSupabase().storage.from('chat-images').remove([path]);
    throwIfError(error);
  },
  async uploadPartPhoto(file, companyId) {
    const optimizedFile = await optimizeImageForUpload(file);
    const path = `${companyId}/${crypto.randomUUID()}.webp`;
    const client = requireSupabase();
    const { error } = await client.storage.from('part-photos').upload(path, optimizedFile, { cacheControl: '3600', contentType: 'image/webp', upsert: false });
    throwIfError(error);
    return client.storage.from('part-photos').getPublicUrl(path).data.publicUrl;
  },
  async uploadSearchPhoto(file, userId) {
    const optimizedFile = await optimizeImageForUpload(file);
    const path = `${userId}/procuras/${crypto.randomUUID()}.webp`;
    const client = requireSupabase();
    const { error } = await client.storage.from('part-photos').upload(path, optimizedFile, { cacheControl: '3600', contentType: 'image/webp', upsert: false });
    throwIfError(error);
    return client.storage.from('part-photos').getPublicUrl(path).data.publicUrl;
  },
  async markMessageRead(messageId) {
    const { error } = await requireSupabase().rpc('mark_message_read', { p_message_id: messageId });
    throwIfError(error);
  },
  async updateProfile(type, userId, changes) {
    const allowed = type === 'company'
      ? ['name', 'phone', 'whatsapp', 'cnpj', 'address', 'addressNumber', 'postalCode', 'latitude', 'longitude', 'locationSource', 'servesLocations', 'vehicleTypes', 'termsAcceptedDate']
      : ['name', 'phone', 'cpf', 'location', 'postalCode', 'vehicles', 'termsAcceptedDate'];
    const sanitized = Object.fromEntries(Object.entries(changes).filter(([key, value]) => allowed.includes(key) && value !== undefined));
    const table = type === 'company' ? 'companies' : 'users';
    const { data, error } = await requireSupabase().from(table).update(toSnake(sanitized)).eq('id', userId).select().single();
    throwIfError(error);
    return toCamel(data);
  },
  async recordCompanyAccess(companyId, accessedAt) {
    const { error } = await requireSupabase().rpc('record_company_access', { p_company_id: companyId, p_accessed_at: accessedAt });
    throwIfError(error);
  },
  async createFeedback(feedback) {
    const { error } = await requireSupabase().rpc('submit_feedback', {
      p_id: feedback.id, p_user_id: feedback.userId, p_user_type: feedback.userType,
      p_user_name: feedback.userName, p_type: feedback.type, p_text_content: feedback.text || '',
      p_rating: feedback.rating ?? null, p_contact: feedback.contact || null, p_created_at: feedback.createdAt,
    });
    throwIfError(error);
  },
  async savePushSubscription(userId, userType, subscription) {
    const row = {
      user_id: userId,
      user_type: userType,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys?.p256dh,
      auth: subscription.keys?.auth,
      user_agent: navigator.userAgent,
      updated_at: new Date().toISOString(),
    };
    const { error } = await requireSupabase().from('push_subscriptions').upsert(row, { onConflict: 'endpoint' });
    throwIfError(error);
  },
  async removePushSubscription(endpoint) {
    const { error } = await requireSupabase().from('push_subscriptions').delete().eq('endpoint', endpoint);
    throwIfError(error);
  },
  async sendPushEvent(eventType, recordId) {
    const { data, error } = await requireSupabase().functions.invoke('send-web-push', { body: { eventType, recordId } });
    throwIfError(error);
    return data;
  },
};

export default dataService;

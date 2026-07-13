import { supabase } from './supabaseClient';

const hasSupabase = typeof window !== 'undefined' && import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;

const localStorageService = {
  get(key, fallback) {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      console.error('localStorage get error', e);
      return fallback;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('localStorage set error', e);
    }
  }
};

const toCamel = (value) => {
  if (Array.isArray(value)) return value.map(toCamel);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key.replace(/_([a-z])/g, (_, char) => char.toUpperCase()), toCamel(val)])
    );
  }
  return value;
};

const toSnake = (value) => {
  if (Array.isArray(value)) return value.map(toSnake);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key.replace(/([A-Z])/g, '_$1').toLowerCase(), toSnake(val)])
    );
  }
  return value;
};

const groupBy = (items, key) => items.reduce((acc, item) => {
  const groupKey = item[key] || item[key.replace(/([A-Z])/g, '_$1').toLowerCase()];
  if (!acc[groupKey]) acc[groupKey] = [];
  acc[groupKey].push(item);
  return acc;
}, {});

const normalizeMessages = (rows) => {
  const messages = Array.isArray(rows) ? rows : [];
  return Object.fromEntries(
    Object.entries(groupBy(messages.map(toCamel), 'chatId')).map(([chatId, list]) => [chatId, list])
  );
};

const flattenResponses = (procuras) => {
  return procuras.reduce((acc, procura) => {
    const responses = Array.isArray(procura.responses) ? procura.responses : [];
    const responseRows = responses.map((response) => ({ ...response, procuraId: procura.id }));
    return [...acc, ...responseRows];
  }, []);
};

const stripResponses = (procuras) => procuras.map(({ responses, ...rest }) => rest);

export const dataService = {
  async getUsers() {
    if (hasSupabase) {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      return data ? data.map(toCamel) : [];
    }
    return localStorageService.get('users', []);
  },
  async upsertUsers(users) {
    if (hasSupabase) {
      const { error } = await supabase.from('users').upsert(users.map(toSnake));
      if (error) throw error;
      return true;
    }
    localStorageService.set('users', users);
    return true;
  },

  async getCompanies() {
    if (hasSupabase) {
      const { data, error } = await supabase.from('companies').select('*');
      if (error) throw error;
      return data ? data.map(toCamel) : [];
    }
    return localStorageService.get('companies', []);
  },
  async upsertCompanies(companies) {
    if (hasSupabase) {
      const { error } = await supabase.from('companies').upsert(companies.map(toSnake));
      if (error) throw error;
      return true;
    }
    localStorageService.set('companies', companies);
    return true;
  },

  async getProcuras() {
    if (hasSupabase) {
      const { data, error } = await supabase.from('procuras').select('*, responses(*)');
      if (error) throw error;
      return data ? data.map(toCamel) : [];
    }
    return localStorageService.get('procuras', []);
  },
  async upsertProcuras(procuras) {
    if (hasSupabase) {
      const procuraRows = stripResponses(procuras).map(toSnake);
      const { error: procuraError } = await supabase.from('procuras').upsert(procuraRows);
      if (procuraError) throw procuraError;

      const responseRows = flattenResponses(procuras).map(toSnake);
      if (responseRows.length) {
        const { error: responseError } = await supabase.from('responses').upsert(responseRows);
        if (responseError) throw responseError;
      }
      return true;
    }
    localStorageService.set('procuras', procuras);
    return true;
  },

  async getResponses() {
    if (hasSupabase) {
      const { data, error } = await supabase.from('responses').select('*');
      if (error) throw error;
      return data ? data.map(toCamel) : [];
    }
    return localStorageService.get('responses', []);
  },
  async upsertResponses(responses) {
    if (hasSupabase) {
      const { error } = await supabase.from('responses').upsert(responses.map(toSnake));
      if (error) throw error;
      return true;
    }
    localStorageService.set('responses', responses);
    return true;
  },

  async getMessages() {
    if (hasSupabase) {
      const { data, error } = await supabase.from('messages').select('*');
      if (error) throw error;
      return normalizeMessages(data);
    }
    return localStorageService.get('messages', {});
  },
  async upsertMessages(messages) {
    if (hasSupabase) {
      const messageRows = Object.values(messages)
        .flat()
        .map(toSnake);
      if (messageRows.length) {
        const { error } = await supabase.from('messages').upsert(messageRows);
        if (error) throw error;
      }
      return true;
    }
    localStorageService.set('messages', messages);
    return true;
  },

  async getFeedbacks() {
    if (hasSupabase) {
      const { data, error } = await supabase.from('feedbacks').select('*');
      if (error) throw error;
      return data ? data.map(toCamel) : [];
    }
    return localStorageService.get('feedbacks', []);
  },
  async upsertFeedbacks(feedbacks) {
    if (hasSupabase) {
      const { error } = await supabase.from('feedbacks').upsert(feedbacks.map(toSnake));
      if (error) throw error;
      return true;
    }
    localStorageService.set('feedbacks', feedbacks);
    return true;
  }
};

export default dataService;

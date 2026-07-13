import { supabase } from './supabaseClient';
import { useLocalStorage as _useLocalStorage } from '@/hooks/useLocalStorage';

const hasSupabase = typeof window !== 'undefined' && import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;

function lsKey(key) {
  return key;
}

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

export const dataService = {
  // Users
  async getUsers() {
    if (hasSupabase) {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      return data || [];
    }
    return localStorageService.get('users', []);
  },
  async upsertUsers(users) {
    if (hasSupabase) {
      const { error } = await supabase.from('users').upsert(users);
      if (error) throw error;
      return true;
    }
    localStorageService.set('users', users);
    return true;
  },

  // Companies
  async getCompanies() {
    if (hasSupabase) {
      const { data, error } = await supabase.from('companies').select('*');
      if (error) throw error;
      return data || [];
    }
    return localStorageService.get('companies', []);
  },
  async upsertCompanies(companies) {
    if (hasSupabase) {
      const { error } = await supabase.from('companies').upsert(companies);
      if (error) throw error;
      return true;
    }
    localStorageService.set('companies', companies);
    return true;
  },

  // Procuras
  async getProcuras() {
    if (hasSupabase) {
      const { data, error } = await supabase.from('procuras').select('*');
      if (error) throw error;
      return data || [];
    }
    return localStorageService.get('procuras', []);
  },
  async upsertProcuras(procuras) {
    if (hasSupabase) {
      const { error } = await supabase.from('procuras').upsert(procuras);
      if (error) throw error;
      return true;
    }
    localStorageService.set('procuras', procuras);
    return true;
  },

  // Responses
  async getResponses() {
    if (hasSupabase) {
      const { data, error } = await supabase.from('responses').select('*');
      if (error) throw error;
      return data || [];
    }
    return localStorageService.get('responses', []);
  },
  async upsertResponses(responses) {
    if (hasSupabase) {
      const { error } = await supabase.from('responses').upsert(responses);
      if (error) throw error;
      return true;
    }
    localStorageService.set('responses', responses);
    return true;
  },

  // Chats / messages
  async getMessages() {
    if (hasSupabase) {
      const { data, error } = await supabase.from('messages').select('*');
      if (error) throw error;
      return data || [];
    }
    return localStorageService.get('messages', {});
  },
  async upsertMessages(messages) {
    if (hasSupabase) {
      const { error } = await supabase.from('messages').upsert(messages);
      if (error) throw error;
      return true;
    }
    localStorageService.set('messages', messages);
    return true;
  },

  // Feedbacks
  async getFeedbacks() {
    if (hasSupabase) {
      const { data, error } = await supabase.from('feedbacks').select('*');
      if (error) throw error;
      return data || [];
    }
    return localStorageService.get('feedbacks', []);
  },
  async upsertFeedbacks(feedbacks) {
    if (hasSupabase) {
      const { error } = await supabase.from('feedbacks').upsert(feedbacks);
      if (error) throw error;
      return true;
    }
    localStorageService.set('feedbacks', feedbacks);
    return true;
  }
};

export default dataService;

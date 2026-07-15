import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not set. The app will run in local mock mode.');
}

// createClient throws on an invalid/empty URL, so only construct a real
// client when both env vars are present — otherwise leave it null and let
// dataService's hasSupabase guard route everything to localStorage instead.
export const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

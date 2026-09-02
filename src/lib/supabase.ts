import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default / fallback demo or custom credentials stored in localStorage
const DEFAULT_URL = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('fog_supabase_url') || '';
const DEFAULT_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('fog_supabase_anon_key') || '';

let supabaseInstance: SupabaseClient | null = null;

export const isSupabaseConfigured = (): boolean => {
  const url = localStorage.getItem('fog_supabase_url') || import.meta.env.VITE_SUPABASE_URL;
  const key = localStorage.getItem('fog_supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(url && key && url.startsWith('http'));
};

export const getSupabaseClient = (): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance;

  const url = localStorage.getItem('fog_supabase_url') || DEFAULT_URL;
  const key = localStorage.getItem('fog_supabase_anon_key') || DEFAULT_ANON_KEY;

  if (url && key && url.startsWith('http')) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      return supabaseInstance;
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      return null;
    }
  }

  return null;
};

export const updateSupabaseCredentials = (url: string, key: string) => {
  if (url) localStorage.setItem('fog_supabase_url', url.trim());
  if (key) localStorage.setItem('fog_supabase_anon_key', key.trim());
  supabaseInstance = null; // force re-init
  return getSupabaseClient();
};

export const clearSupabaseCredentials = () => {
  localStorage.removeItem('fog_supabase_url');
  localStorage.removeItem('fog_supabase_anon_key');
  supabaseInstance = null;
};


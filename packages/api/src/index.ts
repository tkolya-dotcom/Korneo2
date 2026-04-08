import { createClient } from '@supabase/supabase-js';

export const createSupabaseClient = (url: string, anonKey: string) =>
  createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

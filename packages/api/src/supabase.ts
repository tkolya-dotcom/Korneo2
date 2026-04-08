import { createClient } from '@supabase/supabase-js';

export function createKorneoSupabaseClient(url: string, anonKey: string) {
  if (!url || !anonKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

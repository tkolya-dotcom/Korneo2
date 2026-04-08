import type { SupabaseClient } from '@supabase/supabase-js';

export async function signInWithPassword(client: SupabaseClient, email: string, password: string) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithPassword(client: SupabaseClient, email: string, password: string) {
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function sendRecoveryEmail(client: SupabaseClient, email: string) {
  const { error } = await client.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

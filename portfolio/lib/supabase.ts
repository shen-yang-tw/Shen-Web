import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && anonKey) {
    client = createClient(url, anonKey);
  } else {
    client = createClient('https://placeholder.supabase.co', 'placeholder-key');
  }

  return client;
}

export const supabase = getSupabaseClient();

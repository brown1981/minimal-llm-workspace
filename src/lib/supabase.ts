import { createClient } from '@supabase/supabase-js';

export const getSupabase = (url?: string, key?: string) => {
  if (!url || !key) return null;
  return createClient(url, key);
};

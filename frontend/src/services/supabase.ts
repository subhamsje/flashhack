import { createClient } from '@supabase/supabase-js';

const storageUrl = typeof window !== 'undefined' ? localStorage.getItem('VITE_SUPABASE_URL') : null;
const storageKey = typeof window !== 'undefined' ? localStorage.getItem('VITE_SUPABASE_ANON_KEY') : null;

const supabaseUrl = storageUrl || import.meta.env.VITE_SUPABASE_URL || 'https://demo-warehouse.supabase.co';
const supabaseAnonKey = storageKey || import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo-anon-key-flashhack';

export const isSupabaseConfigured = Boolean(
  (storageUrl && storageKey) ||
  (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

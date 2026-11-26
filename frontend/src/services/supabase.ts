import { createClient } from '@supabase/supabase-js';

// Default Supabase Warehouse Credentials (uwixhlszkexsyvjgrcas)
export const DEFAULT_SUPABASE_URL = 'https://uwixhlszkexsyvjgrcas.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3aXhobHN6a2V4c3l2amdyY2FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU2NjcwODMsImV4cCI6MjExMTI0MzA4M30.2E97PdAcJGxsRMyEzuiRGVlIOn7clDKencEnOfe8EyA';

const storageUrl = typeof window !== 'undefined' ? localStorage.getItem('VITE_SUPABASE_URL') : null;
const storageKey = typeof window !== 'undefined' ? localStorage.getItem('VITE_SUPABASE_ANON_KEY') : null;

export const supabaseUrl = storageUrl || import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
export const supabaseAnonKey = storageKey || import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

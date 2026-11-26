import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://uwixhlszkexsyvjgrcas.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3aXhobHN6a2V4c3l2amdyY2FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU2NjcwODMsImV4cCI6MjExMTI0MzA4M30.2E97PdAcJGxsRMyEzuiRGVlIOn7clDKencEnOfe8EyA';

export const isSupabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

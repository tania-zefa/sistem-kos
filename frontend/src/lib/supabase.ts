import { createClient } from '@supabase/supabase-js';

// Anon key adalah kredensial publik yang aman diexpose di frontend.
// Keamanan data diatur melalui Row Level Security (RLS) di Supabase.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://lkmrkdkoslwvjnqkbntl.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrbXJrZGtvc2x3dmpucWtibnRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2NzUxMDUsImV4cCI6MjEwOTI1MTEwNX0.3oNXaIiZb_LN5WEIvY24qdW_qizSGTyVSdq5Vvj12wI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

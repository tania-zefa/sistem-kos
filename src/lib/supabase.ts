import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl === 'https://your-project-id.supabase.co') {
  console.error(
    '[Supabase] VITE_SUPABASE_URL belum diatur. ' +
      'Salin .env.example ke .env lalu isi dengan URL project Supabase Anda.'
  );
}

if (!supabaseAnonKey || supabaseAnonKey === 'your-anon-key-here') {
  console.error(
    '[Supabase] VITE_SUPABASE_ANON_KEY belum diatur. ' +
      'Salin .env.example ke .env lalu isi dengan Anon Key project Supabase Anda.'
  );
}

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-key'
);

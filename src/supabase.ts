import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Diagnostic logging for production
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[CRITICAL] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing in the environment.');
} else {
  // Safe logging of the URL and key length to verify they are loaded
  console.log(`[AUTH] Supabase initialized with URL: ${supabaseUrl.substring(0, 15)}...`);
  if (!supabaseUrl.startsWith('https://')) {
    console.warn('[WARNING] Supabase URL does not start with https://. This will likely cause "Failed to fetch" errors.');
  }
}

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

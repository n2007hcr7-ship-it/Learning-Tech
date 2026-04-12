import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Diagnostic logging for production
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[CRITICAL] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing in the environment.');
} else {
  // Safe logging for verification
  const maskedKey = `...${supabaseAnonKey.slice(-4)}`;
  const maskedUrl = `${supabaseUrl.substring(0, 15)}...`;
  console.log(`[AUTH] Supabase initialized. URL: ${maskedUrl} | Key: ${maskedKey}`);
  
  if (!supabaseUrl.startsWith('https://')) {
    console.warn('[WARNING] Supabase URL does not start with https://. This will likely cause "Failed to fetch" errors.');
  }
}

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

import 'dotenv/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

// Cliente Supabase padrão (para operações sem autenticação)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY
);

/**
 * Cria um cliente Supabase autenticado com o token JWT do usuário
 * Necessário para respeitar as políticas RLS (Row Level Security)
 */
export function getSupabaseClient(accessToken: string): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    }
  );
}

export default supabase;

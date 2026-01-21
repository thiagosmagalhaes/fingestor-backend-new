import 'dotenv/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Pool de clientes Supabase para evitar memory leaks
 *
 * Problema: Criar um novo cliente Supabase a cada requisição causa memory leak
 * Solução: Reutilizar clientes existentes baseados no token
 */

// Cache de clientes por token (LRU)
const clientCache = new Map<string, { client: SupabaseClient; timestamp: number }>();
const MAX_CACHE_SIZE = 100;
const CACHE_TTL = 60 * 60 * 1000; // 1 hora

// Cliente Supabase padrão (para operações sem autenticação) - Singleton
export const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        },
        global: {
            headers: { 'X-Client-Info': 'fingestor-backend/1.0' }
        }
    }
);

// Cliente admin - Singleton
export const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        },
        global: {
            headers: { 'X-Client-Info': 'fingestor-backend/1.0' }
        }
    }
);

/**
 * Obtém ou cria um cliente Supabase para um token específico
 * Usa cache LRU para evitar criar múltiplos clientes
 */
export function getSupabaseClient(accessToken: string): SupabaseClient {
    // Verificar cache
    const cached = clientCache.get(accessToken);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.client;
    }

    // Criar novo cliente
    const client = createClient(
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

    // Adicionar ao cache
    clientCache.set(accessToken, {
        client,
        timestamp: Date.now()
    });

    // Limpar cache se exceder tamanho máximo (LRU)
    if (clientCache.size > MAX_CACHE_SIZE) {
        const entries = Array.from(clientCache.entries());
        const sorted = entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
        const toRemove = sorted.slice(0, clientCache.size - MAX_CACHE_SIZE);
        toRemove.forEach(([key]) => clientCache.delete(key));
    }

    return client;
}

/**
 * Limpa cache de clientes expirados (executado periodicamente)
 */
function cleanExpiredClients() {
    const now = Date.now();
    let removed = 0;

    for (const [token, data] of clientCache.entries()) {
        if (now - data.timestamp > CACHE_TTL) {
            clientCache.delete(token);
            removed++;
        }
    }

    if (removed > 0) {
        console.log(`🧹 [SupabasePool] ${removed} cliente(s) expirado(s) removido(s) do cache`);
    }
}

// Limpeza automática a cada 30 minutos
setInterval(cleanExpiredClients, 30 * 60 * 1000);

/**
 * Obtém estatísticas do pool
 */
export function getPoolStats() {
    return {
        cached_clients: clientCache.size,
        max_cache_size: MAX_CACHE_SIZE,
        cache_ttl_ms: CACHE_TTL
    };
}

/**
 * Limpa todo o cache (útil para testes)
 */
export function clearCache() {
    const size = clientCache.size;
    clientCache.clear();
    console.log(`🧹 [SupabasePool] Cache limpo: ${size} cliente(s) removido(s)`);
    return size;
}

export default supabase;

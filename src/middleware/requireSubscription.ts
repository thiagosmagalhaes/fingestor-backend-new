import { Response, NextFunction } from 'express';
import supabase, { getSupabaseClient } from '../config/database';
import { AuthRequest } from './auth';

/**
 * Middleware para verificar se o usuário tem assinatura ativa ou trial válido
 * Deve ser usado APÓS o authMiddleware
 */
export const requireActiveSubscription = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const userId = req.user?.id;
    const accessToken = req.accessToken;

    if (!userId || !accessToken) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Usuário não autenticado',
      });
    }

    // Criar cliente Supabase autenticado
    const supabase = getSupabaseClient(accessToken);

    // Buscar data de criação do usuário na tabela profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('created_at')
      .eq('user_id', userId)
      .limit(1);

    if (profileError || !profiles || profiles.length === 0) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Erro ao buscar informações do usuário',
      });
    }

    const userCreatedAt = new Date(profiles[0].created_at);
    const now = new Date();
    const daysSinceCreation = Math.floor(
      (now.getTime() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Buscar assinatura ativa
    const { data: activeSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Se tem assinatura ativa, permitir acesso
    if (activeSubscription) {
      return next();
    }

    // Não tem assinatura - verificar período de trial de 15 dias
    if (daysSinceCreation < 15) {
      // Trial ainda válido, permitir acesso
      return next();
    }

    // Trial expirado e sem assinatura - bloquear acesso
    return res.status(402).json({
      error: 'Payment Required',
      message: 'Assine o Fingestor Plus para continuar usando o sistema',
      requires_subscription: true,
      trial_expired: true,
      trial_days_elapsed: daysSinceCreation,
    });
  } catch (error: any) {
    console.error('Erro ao verificar assinatura:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Erro ao verificar status da assinatura',
    });
  }
};

import { Response, NextFunction } from 'express';
import { getSupabaseClient } from '../config/database';
import { AuthRequest } from './auth';

/**
 * Verifica se o usuario e admin
 */
export const isUserAdmin = async (accessToken: string, userId: string): Promise<boolean> => {
    const supabase = getSupabaseClient(accessToken);
    const { data } = await supabase
        .from('user_roles')
    .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .single();
    
    return !!data;
};

/**
 * Middleware para proteger rotas que exigem admin
 */
export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.id;
        const accessToken = req.accessToken;

        if (!userId || !accessToken) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
            return;
        }

        const isAdmin = await isUserAdmin(accessToken, userId);

        if (!isAdmin) {
            res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
            return;
        }

        next();
    } catch (error) {
        console.error('Error checking admin status:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

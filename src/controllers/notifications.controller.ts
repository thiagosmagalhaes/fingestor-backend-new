import { Request, Response } from 'express';
import { getSupabaseClient } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { Notification, NotificationFromDB, CreateNotificationRequest } from '../types/notifications.types';

export class NotificationsController {
  /**
   * GET /api/notifications?companyId=xxx
   * Retorna todas as notificações da empresa
   */
  async getNotifications(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      if (!authReq.user || !authReq.user.id) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      if (!authReq.accessToken) {
        return res.status(401).json({ error: 'Token de acesso não encontrado' });
      }

      const supabase = getSupabaseClient(authReq.accessToken);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', authReq.user.id)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        throw error;
      }

      const notifications: Notification[] = (data || []).map((n: NotificationFromDB) => ({
        id: n.id,
        user_id: n.user_id,
        company_id: n.company_id,
        title: n.title,
        message: n.message,
        type: n.type as Notification['type'],
        link_to: n.link_to || undefined,
        is_read: n.is_read,
        created_at: n.created_at,
        read_at: n.read_at || undefined,
      }));

      const unreadCount = notifications.filter(n => !n.is_read).length;

      res.json({
        notifications,
        unread_count: unreadCount,
      });
    } catch (error) {
      console.error('Error in getNotifications:', error);
      res.status(500).json({ error: 'Erro ao buscar notificações' });
    }
  }

  /**
   * PATCH /api/notifications/:id/read
   * Marca uma notificação como lida
   */
  async markAsRead(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'id é obrigatório' });
      }

      if (!authReq.user || !authReq.user.id || !authReq.accessToken) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const supabase = getSupabaseClient(authReq.accessToken);

      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', authReq.user.id);

      if (error) {
        console.error('Error marking notification as read:', error);
        throw error;
      }

      res.json({ message: 'Notificação marcada como lida' });
    } catch (error) {
      console.error('Error in markAsRead:', error);
      res.status(500).json({ error: 'Erro ao marcar notificação como lida' });
    }
  }

  /**
   * PATCH /api/notifications/read-all?companyId=xxx
   * Marca todas as notificações da empresa como lidas
   */
  async markAllAsRead(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      if (!authReq.user || !authReq.user.id || !authReq.accessToken) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const supabase = getSupabaseClient(authReq.accessToken);

      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', authReq.user.id)
        .eq('company_id', companyId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all as read:', error);
        throw error;
      }

      res.json({ message: 'Todas as notificações foram marcadas como lidas' });
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      res.status(500).json({ error: 'Erro ao marcar todas como lidas' });
    }
  }

  /**
   * DELETE /api/notifications/:id
   * Deleta uma notificação
   */
  async deleteNotification(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'id é obrigatório' });
      }

      if (!authReq.user || !authReq.user.id || !authReq.accessToken) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const supabase = getSupabaseClient(authReq.accessToken);

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', authReq.user.id);

      if (error) {
        console.error('Error deleting notification:', error);
        throw error;
      }

      res.json({ message: 'Notificação deletada com sucesso' });
    } catch (error) {
      console.error('Error in deleteNotification:', error);
      res.status(500).json({ error: 'Erro ao deletar notificação' });
    }
  }

  /**
   * POST /api/notifications
   * Cria uma nova notificação
   */
  async createNotification(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId, title, message, type, linkTo }: CreateNotificationRequest = req.body;

      if (!companyId || !title || !message || !type) {
        return res.status(400).json({
          error: 'companyId, title, message e type são obrigatórios',
        });
      }

      if (!['expense_due', 'expense_overdue', 'info', 'warning'].includes(type)) {
        return res.status(400).json({
          error: 'type deve ser: expense_due, expense_overdue, info ou warning',
        });
      }

      if (!authReq.user || !authReq.user.id || !authReq.accessToken) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const supabase = getSupabaseClient(authReq.accessToken);

      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: authReq.user.id,
          company_id: companyId,
          title,
          message,
          type,
          link_to: linkTo,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating notification:', error);
        throw error;
      }

      res.status(201).json(data);
    } catch (error) {
      console.error('Error in createNotification:', error);
      res.status(500).json({ error: 'Erro ao criar notificação' });
    }
  }

  /**
   * GET /api/notifications/unread-count?companyId=xxx
   * Retorna apenas a contagem de notificações não lidas
   */
  async getUnreadCount(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      if (!authReq.user || !authReq.user.id || !authReq.accessToken) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const supabase = getSupabaseClient(authReq.accessToken);

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', authReq.user.id)
        .eq('company_id', companyId)
        .eq('is_read', false);

      if (error) {
        console.error('Error fetching unread count:', error);
        throw error;
      }

      res.json({ unread_count: count || 0 });
    } catch (error) {
      console.error('Error in getUnreadCount:', error);
      res.status(500).json({ error: 'Erro ao buscar contagem de não lidas' });
    }
  }
}

export default new NotificationsController();

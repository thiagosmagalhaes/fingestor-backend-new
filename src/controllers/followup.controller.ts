import { Request, Response } from 'express';
import { getSupabaseClient } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import {
  CreateFollowupTaskRequest,
  UpdateFollowupTaskRequest,
} from '../types/budgets.types';

export class FollowupController {
  /**
   * GET /api/followup/tasks?companyId=xxx&status=pending
   * Lista tarefas de follow-up
   */
  async getTasks(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId, status, customerId, budgetId, assignedTo } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      let query = supabaseClient
        .from('followup_tasks')
        .select(`
          *,
          customers (
            id,
            name,
            email,
            mobile
          ),
          budgets (
            id,
            budget_number,
            total_amount
          )
        `)
        .eq('company_id', companyId);

      if (status && typeof status === 'string') {
        query = query.eq('status', status);
      }

      if (customerId && typeof customerId === 'string') {
        query = query.eq('customer_id', customerId);
      }

      if (budgetId && typeof budgetId === 'string') {
        query = query.eq('budget_id', budgetId);
      }

      if (assignedTo && typeof assignedTo === 'string') {
        query = query.eq('assigned_to', assignedTo);
      }

      query = query.order('due_date', { ascending: true });

      const { data: tasks, error } = await query;

      if (error) {
        console.error('Error fetching followup_tasks:', error);
        throw error;
      }

      res.json(tasks || []);
    } catch (error) {
      console.error('Error in getTasks:', error);
      res.status(500).json({ error: 'Erro ao buscar tarefas' });
    }
  }

  /**
   * GET /api/followup/tasks/:id?companyId=xxx
   * Obtém uma tarefa específica
   */
  async getTaskById(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { companyId } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID é obrigatório' });
      }

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { data: task, error } = await supabaseClient
        .from('followup_tasks')
        .select(`
          *,
          customers (
            id,
            name,
            email,
            mobile
          ),
          budgets (
            id,
            budget_number,
            total_amount
          )
        `)
        .eq('id', id)
        .eq('company_id', companyId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Tarefa não encontrada' });
        }
        console.error('Error fetching task:', error);
        throw error;
      }

      res.json(task);
    } catch (error) {
      console.error('Error in getTaskById:', error);
      res.status(500).json({ error: 'Erro ao buscar tarefa' });
    }
  }

  /**
   * POST /api/followup/tasks
   * Cria uma nova tarefa de follow-up
   */
  async createTask(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const taskData = req.body as CreateFollowupTaskRequest;

      if (!taskData.companyId || !taskData.title || !taskData.dueDate || !taskData.assignedTo) {
        return res.status(400).json({
          error: 'companyId, title, dueDate e assignedTo são obrigatórios',
        });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { data: task, error } = await supabaseClient
        .from('followup_tasks')
        .insert({
          company_id: taskData.companyId,
          customer_id: taskData.customerId,
          budget_id: taskData.budgetId,
          title: taskData.title,
          description: taskData.description,
          task_type: taskData.taskType || 'followup',
          priority: taskData.priority || 'medium',
          due_date: taskData.dueDate,
          due_time: taskData.dueTime,
          assigned_to: taskData.assignedTo,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating task:', error);
        throw error;
      }

      res.status(201).json(task);
    } catch (error) {
      console.error('Error in createTask:', error);
      res.status(500).json({ error: 'Erro ao criar tarefa' });
    }
  }

  /**
   * PUT /api/followup/tasks/:id
   * Atualiza uma tarefa de follow-up
   */
  async updateTask(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { companyId } = req.query;
      const updateData = req.body as UpdateFollowupTaskRequest;

      if (!id) {
        return res.status(400).json({ error: 'ID é obrigatório' });
      }

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const dataToUpdate: any = {};
      if (updateData.title !== undefined) dataToUpdate.title = updateData.title;
      if (updateData.description !== undefined) dataToUpdate.description = updateData.description;
      if (updateData.taskType !== undefined) dataToUpdate.task_type = updateData.taskType;
      if (updateData.priority !== undefined) dataToUpdate.priority = updateData.priority;
      if (updateData.dueDate !== undefined) dataToUpdate.due_date = updateData.dueDate;
      if (updateData.dueTime !== undefined) dataToUpdate.due_time = updateData.dueTime;
      if (updateData.status !== undefined) dataToUpdate.status = updateData.status;
      if (updateData.outcome !== undefined) dataToUpdate.outcome = updateData.outcome;
      if (updateData.assignedTo !== undefined) dataToUpdate.assigned_to = updateData.assignedTo;

      // Se marcando como completa, adicionar timestamp
      if (updateData.status === 'completed' && !dataToUpdate.completed_at) {
        dataToUpdate.completed_at = new Date().toISOString();
      }

      const { data: task, error } = await supabaseClient
        .from('followup_tasks')
        .update(dataToUpdate)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        console.error('Error updating task:', error);
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Tarefa não encontrada' });
        }
        throw error;
      }

      res.json(task);
    } catch (error) {
      console.error('Error in updateTask:', error);
      res.status(500).json({ error: 'Erro ao atualizar tarefa' });
    }
  }

  /**
   * DELETE /api/followup/tasks/:id?companyId=xxx
   * Remove uma tarefa de follow-up
   */
  async deleteTask(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { companyId } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID é obrigatório' });
      }

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { error } = await supabaseClient
        .from('followup_tasks')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);

      if (error) {
        console.error('Error deleting task:', error);
        throw error;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error in deleteTask:', error);
      res.status(500).json({ error: 'Erro ao deletar tarefa' });
    }
  }
}

export default new FollowupController();

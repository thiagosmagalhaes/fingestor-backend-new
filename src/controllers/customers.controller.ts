import { Request, Response } from 'express';
import { getSupabaseClient } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import {
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CreateInteractionRequest,
} from '../types/customers.types';

export class CustomersController {
  /**
   * GET /api/customers?companyId=xxx&status=lead&search=xxx
   * Lista todos os clientes de uma empresa
   */
  async getAll(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId, status, priority, search } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      let query = supabaseClient
        .from('customers')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .is('deleted_at', null);

      if (status && typeof status === 'string') {
        query = query.eq('status', status);
      }

      if (priority && typeof priority === 'string') {
        query = query.eq('priority', priority);
      }

      if (search && typeof search === 'string') {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,document.ilike.%${search}%`);
      }

      query = query.order('name', { ascending: true });

      const { data: customers, error } = await query;

      if (error) {
        console.error('Error fetching customers:', error);
        throw error;
      }

      res.json(customers || []);
    } catch (error) {
      console.error('Error in getAll customers:', error);
      res.status(500).json({ error: 'Erro ao buscar clientes' });
    }
  }

  /**
   * GET /api/customers/:id?companyId=xxx
   * Obtém um cliente específico
   */
  async getById(req: Request, res: Response): Promise<Response | void> {
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

      const { data: customer, error } = await supabaseClient
        .from('customers')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Cliente não encontrado' });
        }
        console.error('Error fetching customer:', error);
        throw error;
      }

      res.json(customer);
    } catch (error) {
      console.error('Error in getById customer:', error);
      res.status(500).json({ error: 'Erro ao buscar cliente' });
    }
  }

  /**
   * GET /api/customers/:id/interactions?companyId=xxx
   * Lista interações de um cliente
   */
  async getInteractions(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { companyId, limit = '50' } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID do cliente é obrigatório' });
      }

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { data: interactions, error } = await supabaseClient
        .from('customer_interactions')
        .select('*')
        .eq('customer_id', id)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit as string));

      if (error) {
        console.error('Error fetching interactions:', error);
        throw error;
      }

      res.json(interactions || []);
    } catch (error) {
      console.error('Error in getInteractions:', error);
      res.status(500).json({ error: 'Erro ao buscar interações' });
    }
  }

  /**
   * POST /api/customers
   * Cria um novo cliente
   */
  async create(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const customerData = req.body as CreateCustomerRequest;

      if (!customerData.companyId || !customerData.name) {
        return res.status(400).json({
          error: 'companyId e name são obrigatórios',
        });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { data: customer, error } = await supabaseClient
        .from('customers')
        .insert({
          company_id: customerData.companyId,
          name: customerData.name,
          document: customerData.document,
          document_type: customerData.documentType,
          email: customerData.email,
          phone: customerData.phone,
          mobile: customerData.mobile,
          address: customerData.address,
          customer_type: customerData.customerType || 'individual',
          notes: customerData.notes,
          status: customerData.status || 'lead',
          priority: customerData.priority || 'medium',
          source: customerData.source,
          assigned_to: customerData.assignedTo,
          tags: customerData.tags,
          first_contact_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating customer:', error);
        throw error;
      }

      res.status(201).json(customer);
    } catch (error) {
      console.error('Error in create customer:', error);
      res.status(500).json({ error: 'Erro ao criar cliente' });
    }
  }

  /**
   * POST /api/customers/:id/interactions
   * Cria uma nova interação com o cliente
   */
  async createInteraction(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const interactionData = req.body as CreateInteractionRequest;

      if (!id) {
        return res.status(400).json({ error: 'ID do cliente é obrigatório' });
      }

      if (!interactionData.description || !interactionData.interactionType) {
        return res.status(400).json({
          error: 'description e interactionType são obrigatórios',
        });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { data: interaction, error } = await supabaseClient
        .from('customer_interactions')
        .insert({
          company_id: interactionData.companyId,
          customer_id: id,
          interaction_type: interactionData.interactionType,
          direction: interactionData.direction,
          subject: interactionData.subject,
          description: interactionData.description,
          outcome: interactionData.outcome,
          next_action: interactionData.nextAction,
          next_action_date: interactionData.nextActionDate,
          duration_minutes: interactionData.durationMinutes,
          attachments: interactionData.attachments,
          budget_id: interactionData.budgetId,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating interaction:', error);
        throw error;
      }

      res.status(201).json(interaction);
    } catch (error) {
      console.error('Error in createInteraction:', error);
      res.status(500).json({ error: 'Erro ao criar interação' });
    }
  }

  /**
   * PUT /api/customers/:id
   * Atualiza um cliente
   */
  async update(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { companyId } = req.query;
      const updateData = req.body as UpdateCustomerRequest;

      if (!id) {
        return res.status(400).json({ error: 'ID é obrigatório' });
      }

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const dataToUpdate: any = {};
      if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
      if (updateData.document !== undefined) dataToUpdate.document = updateData.document;
      if (updateData.documentType !== undefined) dataToUpdate.document_type = updateData.documentType;
      if (updateData.email !== undefined) dataToUpdate.email = updateData.email;
      if (updateData.phone !== undefined) dataToUpdate.phone = updateData.phone;
      if (updateData.mobile !== undefined) dataToUpdate.mobile = updateData.mobile;
      if (updateData.address !== undefined) dataToUpdate.address = updateData.address;
      if (updateData.customerType !== undefined) dataToUpdate.customer_type = updateData.customerType;
      if (updateData.notes !== undefined) dataToUpdate.notes = updateData.notes;
      if (updateData.isActive !== undefined) dataToUpdate.is_active = updateData.isActive;
      if (updateData.status !== undefined) dataToUpdate.status = updateData.status;
      if (updateData.priority !== undefined) dataToUpdate.priority = updateData.priority;
      if (updateData.source !== undefined) dataToUpdate.source = updateData.source;
      if (updateData.nextFollowupDate !== undefined) dataToUpdate.next_followup_date = updateData.nextFollowupDate;
      if (updateData.assignedTo !== undefined) dataToUpdate.assigned_to = updateData.assignedTo;
      if (updateData.tags !== undefined) dataToUpdate.tags = updateData.tags;

      const { data: customer, error } = await supabaseClient
        .from('customers')
        .update(dataToUpdate)
        .eq('id', id)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) {
        console.error('Error updating customer:', error);
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Cliente não encontrado' });
        }
        throw error;
      }

      res.json(customer);
    } catch (error) {
      console.error('Error in update customer:', error);
      res.status(500).json({ error: 'Erro ao atualizar cliente' });
    }
  }

  /**
   * DELETE /api/customers/:id?companyId=xxx
   * Remove um cliente (soft delete)
   */
  async delete(req: Request, res: Response): Promise<Response | void> {
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
        .from('customers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('company_id', companyId);

      if (error) {
        console.error('Error deleting customer:', error);
        throw error;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error in delete customer:', error);
      res.status(500).json({ error: 'Erro ao deletar cliente' });
    }
  }

  /**
   * GET /api/customers/search?companyId=xxx&q=nome
   * Busca rápida de clientes (otimizada para autocomplete/dropdowns)
   */
  async search(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId, q } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Parâmetro q (query) é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { data: customers, error } = await supabaseClient
        .from('customers')
        .select('id, name, email, mobile, document, customer_type')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .or(`name.ilike.%${q}%,email.ilike.%${q}%,document.ilike.%${q}%,mobile.ilike.%${q}%`)
        .order('name', { ascending: true })
        .limit(20);

      if (error) {
        console.error('Error searching customers:', error);
        throw error;
      }

      res.json(customers || []);
    } catch (error) {
      console.error('Error in search customers:', error);
      res.status(500).json({ error: 'Erro ao buscar clientes' });
    }
  }
}

export default new CustomersController();

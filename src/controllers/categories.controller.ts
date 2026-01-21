import { Request, Response } from 'express';
import { getSupabaseClient } from '../config/database';
import { AuthRequest } from '../middleware/auth';

interface CreateCategoryRequest {
  companyId: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  nature?: 'COST' | 'EXPENSE';
}

interface UpdateCategoryRequest {
  name?: string;
  type?: 'income' | 'expense';
  color?: string;
  nature?: 'COST' | 'EXPENSE';
}

export class CategoriesController {
  /**
   * GET /api/categories?companyId=xxx
   * Lista todas as categorias de uma empresa
   */
  async getAll(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { data: categories, error } = await supabaseClient
        .from('categories')
        .select('*')
        .eq('company_id', companyId)
        .order('type', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching categories:', error);
        throw error;
      }

      res.json(categories || []);
    } catch (error) {
      console.error('Error in getAll categories:', error);
      res.status(500).json({ error: 'Erro ao buscar categorias' });
    }
  }

  /**
   * GET /api/categories/:id?companyId=xxx
   * Obtém uma categoria específica
   */
  async getById(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { companyId } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID da categoria é obrigatório' });
      }

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { data: category, error } = await supabaseClient
        .from('categories')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Categoria não encontrada' });
        }
        console.error('Error fetching category:', error);
        throw error;
      }

      res.json(category);
    } catch (error) {
      console.error('Error in getById category:', error);
      res.status(500).json({ error: 'Erro ao buscar categoria' });
    }
  }

  /**
   * POST /api/categories
   * Cria uma nova categoria
   */
  async create(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId, name, type, color, nature } = req.body as CreateCategoryRequest;

      // Validações
      if (!companyId) {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Nome da categoria é obrigatório' });
      }

      if (name.trim().length < 2) {
        return res.status(400).json({ error: 'Nome da categoria deve ter pelo menos 2 caracteres' });
      }

      if (!type || (type !== 'income' && type !== 'expense')) {
        return res.status(400).json({ error: 'Tipo deve ser "income" ou "expense"' });
      }

      if (!color || !color.match(/^#[0-9A-Fa-f]{6}$/)) {
        return res.status(400).json({ error: 'Cor deve estar no formato hexadecimal (#RRGGBB)' });
      }

      // Validação da nature
      if (nature !== undefined) {
        if (nature !== 'COST' && nature !== 'EXPENSE') {
          return res.status(400).json({ error: 'Nature deve ser "COST" ou "EXPENSE"' });
        }
        if (type === 'income') {
          return res.status(400).json({ error: 'Nature só pode ser definida para categorias de despesa' });
        }
      }

      // Validar que categorias de despesa devem ter nature
      if (type === 'expense' && !nature) {
        return res.status(400).json({ error: 'Nature é obrigatória para categorias de despesa' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      // Verificar se a empresa existe e pertence ao usuário
      const { data: company, error: companyError } = await supabaseClient
        .from('companies')
        .select('id')
        .eq('id', companyId)
        .single();

      if (companyError || !company) {
        return res.status(404).json({ error: 'Empresa não encontrada ou você não tem permissão' });
      }

      // Verificar se já existe categoria com o mesmo nome e tipo
      const { data: existingCategory } = await supabaseClient
        .from('categories')
        .select('id')
        .eq('company_id', companyId)
        .eq('name', name.trim())
        .eq('type', type)
        .single();

      if (existingCategory) {
        return res.status(409).json({ error: 'Já existe uma categoria com este nome e tipo' });
      }

      const insertData: any = {
        company_id: companyId,
        name: name.trim(),
        type,
        color: color.toUpperCase(),
      };

      // Adicionar nature apenas se for fornecida
      if (nature) {
        insertData.nature = nature;
      }

      const { data: category, error } = await supabaseClient
        .from('categories')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating category:', error);
        throw error;
      }

      res.status(201).json(category);
    } catch (error) {
      console.error('Error in create category:', error);
      res.status(500).json({ error: 'Erro ao criar categoria' });
    }
  }

  /**
   * PUT /api/categories/:id
   * Atualiza uma categoria existente
   */
  async update(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { name, type, color, nature } = req.body as UpdateCategoryRequest;
      const { companyId } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID da categoria é obrigatório' });
      }

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      // Validações
      if (name !== undefined) {
        if (name.trim().length === 0) {
          return res.status(400).json({ error: 'Nome da categoria não pode ser vazio' });
        }
        if (name.trim().length < 2) {
          return res.status(400).json({ error: 'Nome da categoria deve ter pelo menos 2 caracteres' });
        }
      }

      if (type !== undefined && type !== 'income' && type !== 'expense') {
        return res.status(400).json({ error: 'Tipo deve ser "income" ou "expense"' });
      }

      if (color !== undefined && !color.match(/^#[0-9A-Fa-f]{6}$/)) {
        return res.status(400).json({ error: 'Cor deve estar no formato hexadecimal (#RRGGBB)' });
      }

      // Validação da nature
      if (nature !== undefined) {
        if (nature !== 'COST' && nature !== 'EXPENSE') {
          return res.status(400).json({ error: 'Nature deve ser "COST" ou "EXPENSE"' });
        }
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      // Buscar categoria atual para validações
      const { data: currentCategory } = await supabaseClient
        .from('categories')
        .select('type')
        .eq('id', id)
        .eq('company_id', companyId)
        .single();

      if (!currentCategory) {
        return res.status(404).json({ error: 'Categoria não encontrada' });
      }

      // Determinar o tipo final da categoria
      const finalType = type !== undefined ? type : currentCategory.type;

      // Validar nature com base no tipo final
      if (nature !== undefined && finalType === 'income') {
        return res.status(400).json({ error: 'Nature só pode ser definida para categorias de despesa (expense)' });
      }

      // Se está mudando de expense para income, remover nature
      if (type === 'income' && currentCategory.type === 'expense') {
        // Nature será automaticamente removida pelo constraint do banco
      }

      // Se está mudando de income para expense, nature é obrigatória
      if (type === 'expense' && currentCategory.type === 'income' && !nature) {
        return res.status(400).json({ error: 'Nature é obrigatória ao mudar para categoria de despesa (expense)' });
      }

      // Preparar dados para atualização
      const updateData: any = {};

      if (name !== undefined) {
        updateData.name = name.trim();
      }

      if (type !== undefined) {
        updateData.type = type;
        // Se mudando para income, garantir que nature seja null
        if (type === 'income') {
          updateData.nature = null;
        }
      }

      if (color !== undefined) {
        updateData.color = color.toUpperCase();
      }

      if (nature !== undefined) {
        updateData.nature = nature;
      }

      // Se não há nada para atualizar
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar' });
      }

      // Verificar se existe duplicata (se estiver alterando nome ou tipo)
      if (name !== undefined || type !== undefined) {
        const { data: existingCategory } = await supabaseClient
          .from('categories')
          .select('id, name, type')
          .eq('company_id', companyId)
          .eq('id', id)
          .single();

        if (existingCategory) {
          const checkName = name !== undefined ? name.trim() : existingCategory.name;
          const checkType = type !== undefined ? type : existingCategory.type;

          const { data: duplicate } = await supabaseClient
            .from('categories')
            .select('id')
            .eq('company_id', companyId)
            .eq('name', checkName)
            .eq('type', checkType)
            .neq('id', id)
            .single();

          if (duplicate) {
            return res.status(409).json({ error: 'Já existe uma categoria com este nome e tipo' });
          }
        }
      }

      const { data: category, error } = await supabaseClient
        .from('categories')
        .update(updateData)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Categoria não encontrada ou você não tem permissão' });
        }
        console.error('Error updating category:', error);
        throw error;
      }

      res.json(category);
    } catch (error) {
      console.error('Error in update category:', error);
      res.status(500).json({ error: 'Erro ao atualizar categoria' });
    }
  }

  /**
   * DELETE /api/categories/:id?companyId=xxx
   * Deleta uma categoria
   */
  async delete(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { companyId } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'ID da categoria é obrigatório' });
      }

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { error } = await supabaseClient
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);

      if (error) {
        // Verificar se é erro de violação de foreign key (categoria tem transações vinculadas)
        if (error.code === '23503') {
          return res.status(409).json({ 
            error: 'Não é possível deletar esta categoria pois existem transações vinculadas a ela. Remova ou reatribua as transações antes de deletar a categoria.' 
          });
        }
        console.error('Error deleting category:', error);
        throw error;
      }

      res.json({ message: 'Categoria deletada com sucesso' });
    } catch (error) {
      res.status(500).json({ error: 'Existem transações vinculadas a esta categoria. Remova ou reatribua as transações antes de deletar a categoria.' });
    }
  }
}

export default new CategoriesController();

import { Request, Response } from 'express';
import { getSupabaseClient } from '../config/database';
import { AuthRequest } from '../middleware/auth';

interface CreateCompanyRequest {
  name: string;
  cnpj?: string;
}

interface UpdateCompanyRequest {
  name?: string;
  cnpj?: string;
}

export class CompaniesController {
  /**
   * GET /api/companies
   * Lista todas as companies do usuário autenticado
   */
  async getAll(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { data: companies, error } = await supabaseClient
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching companies:', error);
        throw error;
      }

      res.json(companies || []);
    } catch (error) {
      console.error('Error in getAll companies:', error);
      res.status(500).json({ error: 'Erro ao buscar empresas' });
    }
  }

  /**
   * GET /api/companies/:id
   * Obtém uma company específica do usuário autenticado
   */
  async getById(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'ID da empresa é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { data: company, error } = await supabaseClient
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Empresa não encontrada' });
        }
        console.error('Error fetching company:', error);
        throw error;
      }

      res.json(company);
    } catch (error) {
      console.error('Error in getById company:', error);
      res.status(500).json({ error: 'Erro ao buscar empresa' });
    }
  }

  /**
   * POST /api/companies
   * Cria uma nova company para o usuário autenticado
   */
  async create(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { name, cnpj } = req.body as CreateCompanyRequest;

      // Validações
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Nome da empresa é obrigatório' });
      }

      if (name.trim().length < 3) {
        return res.status(400).json({ error: 'Nome da empresa deve ter pelo menos 3 caracteres' });
      }

      // Validação de CNPJ/CPF (se fornecido)
      if (cnpj) {
        const cnpjClean = cnpj.replace(/[^\d]/g, '');
        if (cnpjClean.length !== 11 && cnpjClean.length !== 14) {
          return res.status(400).json({ error: 'Documento deve ter 11 dígitos (CPF) ou 14 dígitos (CNPJ)' });
        }
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      // Obter user_id do token
      const { data: { user } } = await supabaseClient.auth.getUser();
      
      if (!user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const { data: company, error } = await supabaseClient
        .from('companies')
        .insert({
          user_id: user.id,
          name: name.trim(),
          cnpj: cnpj || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating company:', error);
        throw error;
      }

      // Criar categorias default após criar a empresa
      try {
        const cnpjClean = cnpj ? cnpj.replace(/[^\d]/g, '') : '';
        const isPessoaFisica = cnpjClean.length === 11; // CPF tem 11 dígitos
        
        let defaultCategories;
        
        if (isPessoaFisica) {
          // Categorias para Pessoa Física (CPF)
          defaultCategories = [
            { name: 'Salário', type: 'income', color: '#22c55e' },
            { name: 'Freelance', type: 'income', color: '#3b82f6' },
            { name: 'Investimentos', type: 'income', color: '#8b5cf6' },
            { name: 'Outros Rendimentos', type: 'income', color: '#10b981' },
            { name: 'Moradia', type: 'expense', color: '#ef4444', nature: 'EXPENSE' },
            { name: 'Alimentação', type: 'expense', color: '#f97316', nature: 'EXPENSE' },
            { name: 'Transporte', type: 'expense', color: '#eab308', nature: 'EXPENSE' },
            { name: 'Saúde', type: 'expense', color: '#ec4899', nature: 'EXPENSE' },
            { name: 'Educação', type: 'expense', color: '#14b8a6', nature: 'EXPENSE' },
            { name: 'Lazer', type: 'expense', color: '#6366f1', nature: 'EXPENSE' },
            { name: 'Contas e Serviços', type: 'expense', color: '#8b5cf6', nature: 'EXPENSE' },
            { name: 'Outros', type: 'expense', color: '#64748b', nature: 'EXPENSE' },
          ];
        } else {
          // Categorias para Pessoa Jurídica (CNPJ) ou sem documento
          defaultCategories = [
            { name: 'Vendas', type: 'income', color: '#22c55e' },
            { name: 'Serviços', type: 'income', color: '#3b82f6' },
            { name: 'Investimentos', type: 'income', color: '#8b5cf6' },
            { name: 'Folha de Pagamento', type: 'expense', color: '#ef4444', nature: 'EXPENSE' },
            { name: 'Aluguel', type: 'expense', color: '#f97316', nature: 'EXPENSE' },
            { name: 'Impostos', type: 'expense', color: '#eab308', nature: 'EXPENSE' },
            { name: 'Marketing', type: 'expense', color: '#ec4899', nature: 'EXPENSE' },
            { name: 'Fornecedores', type: 'expense', color: '#14b8a6', nature: 'COST' },
            { name: 'Utilidades', type: 'expense', color: '#6366f1', nature: 'EXPENSE' },
            { name: 'Outros', type: 'expense', color: '#64748b', nature: 'EXPENSE' },
          ];
        }

        // Inserir categorias no banco
        const categoriesToInsert = defaultCategories.map((cat: any) => {
          const category: any = {
            company_id: company.id,
            name: cat.name,
            type: cat.type,
            color: cat.color,
          };
          // Adicionar nature apenas para categorias de despesa
          if (cat.nature) {
            category.nature = cat.nature;
          }
          return category;
        });

        const { error: categoriesError } = await supabaseClient
          .from('categories')
          .insert(categoriesToInsert);

        if (categoriesError) {
          console.error('Error creating default categories:', categoriesError);
          // Não falha a criação da empresa se as categorias falharem
        }
      } catch (categoryError) {
        console.error('Error setting up default categories:', categoryError);
        // Continua mesmo se falhar ao criar categorias
      }

      res.status(201).json(company);
    } catch (error) {
      console.error('Error in create company:', error);
      res.status(500).json({ error: 'Erro ao criar empresa' });
    }
  }

  /**
   * PUT /api/companies/:id
   * Atualiza uma company existente do usuário autenticado
   */
  async update(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { name, cnpj } = req.body as UpdateCompanyRequest;

      if (!id) {
        return res.status(400).json({ error: 'ID da empresa é obrigatório' });
      }

      // Validações
      if (name !== undefined) {
        if (name.trim().length === 0) {
          return res.status(400).json({ error: 'Nome da empresa não pode ser vazio' });
        }
        if (name.trim().length < 3) {
          return res.status(400).json({ error: 'Nome da empresa deve ter pelo menos 3 caracteres' });
        }
      }

      if (cnpj !== undefined && cnpj !== null && cnpj !== '') {
        const cnpjClean = cnpj.replace(/[^\d]/g, '');
        if (cnpjClean.length !== 11 && cnpjClean.length !== 14) {
          return res.status(400).json({ error: 'Documento deve ter 11 dígitos (CPF) ou 14 dígitos (CNPJ)' });
        }
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      // Preparar dados para atualização
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (name !== undefined) {
        updateData.name = name.trim();
      }

      if (cnpj !== undefined) {
        updateData.cnpj = cnpj || null;
      }

      const { data: company, error } = await supabaseClient
        .from('companies')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Empresa não encontrada ou você não tem permissão para editá-la' });
        }
        console.error('Error updating company:', error);
        throw error;
      }

      res.json(company);
    } catch (error) {
      console.error('Error in update company:', error);
      res.status(500).json({ error: 'Erro ao atualizar empresa' });
    }
  }

  /**
   * DELETE /api/companies/:id
   * Deleta uma company do usuário autenticado
   */
  async delete(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'ID da empresa é obrigatório' });
      }

      const supabaseClient = getSupabaseClient(authReq.accessToken!);

      const { error } = await supabaseClient
        .from('companies')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting company:', error);
        throw error;
      }

      res.json({ message: 'Empresa deletada com sucesso' });
    } catch (error) {
      console.error('Error in delete company:', error);
      res.status(500).json({ error: 'Erro ao deletar empresa' });
    }
  }
}

export default new CompaniesController();

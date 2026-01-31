import { Response } from 'express';
import { getSupabaseClient } from '../config/database';
import { ProfileMetadata, UpdateMetadataRequest } from '../types/metadata.types';
import { AuthRequest } from '../middleware/auth';

export class MetadataController {
  /**
   * GET /api/metadata
   * Retorna todo o metadata do perfil do usuário autenticado
   */
  async getMetadata(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id;

      const supabase = getSupabaseClient(req.accessToken!);

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Buscar metadata do perfil
      const { data, error } = await supabase
        .from('profiles')
        .select('metadata')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching metadata:', error);
        return res.status(500).json({ error: 'Erro ao buscar metadata' });
      }

      // Retornar metadata ou objeto vazio
      const metadata: ProfileMetadata = data?.metadata || {};
      
      return res.status(200).json({ metadata });
    } catch (error) {
      console.error('Error in getMetadata:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * PUT /api/metadata
   * Atualiza ou insere valor(es) no metadata
   * Body (single): { path: string, value: any }
   * Body (batch): { updates: [{ path: string, value: any }, ...] }
   */
  async updateMetadata(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      const supabase = getSupabaseClient(req.accessToken!);
      const body = req.body as UpdateMetadataRequest;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Detectar se é formato single ou batch
      const updates = 'updates' in body ? body.updates : [body];

      // Validar que há updates
      if (!updates || updates.length === 0) {
        return res.status(400).json({ error: 'Nenhuma atualização fornecida' });
      }

      // Validar que todos os updates têm path
      for (const update of updates) {
        if (!update.path) {
          return res.status(400).json({ error: 'Todos os updates devem ter um path' });
        }
      }

      // Buscar metadata atual
      const { data: profileData, error: fetchError } = await supabase
        .from('profiles')
        .select('metadata')
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching metadata:', fetchError);
        return res.status(500).json({ error: 'Erro ao buscar metadata' });
      }

      // Aplicar todas as atualizações
      let updatedMetadata: ProfileMetadata = profileData?.metadata || {};
      for (const update of updates) {
        updatedMetadata = this.setValueByPath(updatedMetadata, update.path, update.value);
      }

      // Salvar metadata atualizado
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ metadata: updatedMetadata })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating metadata:', updateError);
        return res.status(500).json({ error: 'Erro ao atualizar metadata' });
      }

      return res.status(200).json({ 
        message: updates.length === 1 
          ? 'Metadata atualizado com sucesso'
          : `${updates.length} campos atualizados com sucesso`,
        metadata: updatedMetadata,
        updated_count: updates.length
      });
    } catch (error) {
      console.error('Error in updateMetadata:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * DELETE /api/metadata/:path
   * Remove um campo específico do metadata
   */
  async deleteMetadata(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      const supabase = getSupabaseClient(req.accessToken!);
      const { path } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      if (!path) {
        return res.status(400).json({ error: 'Path é obrigatório' });
      }

      // Buscar metadata atual
      const { data: profileData, error: fetchError } = await supabase
        .from('profiles')
        .select('metadata')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching metadata:', fetchError);
        return res.status(500).json({ error: 'Erro ao buscar metadata' });
      }

      // Remover o campo do metadata
      const currentMetadata: ProfileMetadata = profileData?.metadata || {};
      const updatedMetadata = this.deleteValueByPath(currentMetadata, path);

      // Salvar metadata atualizado
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ metadata: updatedMetadata })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating metadata:', updateError);
        return res.status(500).json({ error: 'Erro ao atualizar metadata' });
      }

      return res.status(200).json({ 
        message: 'Campo removido com sucesso',
        metadata: updatedMetadata
      });
    } catch (error) {
      console.error('Error in deleteMetadata:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Helper: Definir valor por path notation
   */
  private setValueByPath(obj: any, path: string, value: any): any {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    
    // Criar cópia profunda do objeto
    const result = JSON.parse(JSON.stringify(obj));
    
    // Navegar até o penúltimo nível
    let current = result;
    for (const key of keys) {
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }
    
    // Definir o valor
    if (value === null || value === undefined) {
      delete current[lastKey];
    } else {
      current[lastKey] = value;
    }
    
    return result;
  }

  /**
   * Helper: Remover valor por path notation
   */
  private deleteValueByPath(obj: any, path: string): any {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    
    // Criar cópia profunda do objeto
    const result = JSON.parse(JSON.stringify(obj));
    
    // Navegar até o penúltimo nível
    let current = result;
    for (const key of keys) {
      if (!(key in current)) {
        return result; // Path não existe
      }
      current = current[key];
    }
    
    // Remover o campo
    delete current[lastKey];
    
    return result;
  }
}

export default new MetadataController();

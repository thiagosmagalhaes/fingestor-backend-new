import { SupabaseClient } from '@supabase/supabase-js';

/**
 * CompanieService
 *
 * Encapsula a lógica de negócio fiscal: criação de documentos,
 * cálculo de impostos, numeração automática e mudanças de status.
 *
 * Integrado com a API Nuvem Fiscal para transmissão real de
 * NFC-e, NF-e e NFS-e à SEFAZ/Prefeitura.
 */
export class CompanieService {
  /**
   * Busca a configuração fiscal da empresa.
   * Retorna null se não existir.
   */
  async getCompanie(supabase: SupabaseClient, companyId: string) {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching company config:', error);
      throw error;
    }

    return data;
  }

}

export default new CompanieService();

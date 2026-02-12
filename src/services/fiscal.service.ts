import { SupabaseClient } from '@supabase/supabase-js';
import {
  FiscalDocumentType,
  FiscalDocumentStatus,
  CreateFiscalDocumentRequest,
  CreateFiscalDocumentItemRequest,
} from '../types/fiscal.types';
import nuvemFiscalService from './nuvem-fiscal.service';
import type { EmissionResult, CancelResult, CorrectionResult } from './nuvem-fiscal.service';
import { decryptSensitiveData } from '../utils/crypto.utils';

/**
 * FiscalService
 *
 * Encapsula a lógica de negócio fiscal: criação de documentos,
 * cálculo de impostos, numeração automática e mudanças de status.
 *
 * Integrado com a API Nuvem Fiscal para transmissão real de
 * NFC-e, NF-e e NFS-e à SEFAZ/Prefeitura.
 */
export class FiscalService {
  /**
   * Busca a configuração fiscal da empresa.
   * Retorna null se não existir.
   */
  async getConfig(supabase: SupabaseClient, companyId: string) {
    const { data, error } = await supabase
      .from('fiscal_config')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching fiscal config:', error);
      throw error;
    }

    return data;
  }

  /**
   * Cria ou atualiza a configuração fiscal da empresa.
   */
  async upsertConfig(
    supabase: SupabaseClient,
    companyId: string,
    configData: Record<string, any>
  ) {
    // Verificar se já existe
    const existing = await this.getConfig(supabase, companyId);

    if (existing) {
      const { data, error } = await supabase
        .from('fiscal_config')
        .update(configData)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) {
        console.error('Error updating fiscal config:', error);
        throw error;
      }
      return data;
    } else {
      const { data, error } = await supabase
        .from('fiscal_config')
        .insert({ company_id: companyId, ...configData })
        .select()
        .single();

      if (error) {
        console.error('Error creating fiscal config:', error);
        throw error;
      }
      return data;
    }
  }

  /**
   * Obtém o próximo número fiscal e a série via function do banco.
   */
  async getNextNumber(
    supabase: SupabaseClient,
    companyId: string,
    documentType: FiscalDocumentType
  ): Promise<{ next_number: number; serie: number }> {
    const { data, error } = await supabase.rpc('generate_fiscal_number', {
      p_company_id: companyId,
      p_document_type: documentType,
    });

    if (error) {
      console.error('Error generating fiscal number:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('Falha ao gerar número fiscal');
    }

    return data[0];
  }

  /**
   * Cria um documento fiscal a partir de dados manuais ou vinculado a uma venda.
   */
  async createDocument(
    supabase: SupabaseClient,
    userId: string,
    request: CreateFiscalDocumentRequest
  ) {
    const { companyId, documentType, saleId, budgetId } = request;

    // 1. Buscar config fiscal
    const config = await this.getConfig(supabase, companyId);
    if (!config) {
      throw new Error('Configuração fiscal não encontrada. Configure os dados fiscais da empresa primeiro.');
    }

    // Validar se o tipo de documento está habilitado
    this.validateDocumentTypeEnabled(config, documentType);

    // 2. Obter próximo número
    const { next_number, serie } = await this.getNextNumber(supabase, companyId, documentType);

    // 3. Se vinculado a uma venda, buscar dados da venda
    let saleData: any = null;
    let saleItems: any[] = [];
    if (saleId) {
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            *,
            products_services!left (
              id, name, sku, ncm, description
            )
          ),
          customers!left (
            id, name, document, document_type, email, phone, mobile, address
          )
        `)
        .eq('id', saleId)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .single();

      if (saleError) {
        console.error('Error fetching sale for fiscal document:', saleError);
        throw new Error('Venda não encontrada');
      }

      saleData = sale;
      saleItems = sale.sale_items || [];
    }

    // 4. Montar dados do documento
    const documentData = {
      company_id: companyId,
      document_type: documentType,
      status: 'draft' as FiscalDocumentStatus,
      environment: config.environment,
      serie,
      number: next_number,
      sale_id: saleId || null,
      budget_id: budgetId || null,

      // Destinatário: prioridade request > venda/customer
      recipient_name: request.recipientName || saleData?.customers?.name || saleData?.customer_name || null,
      recipient_document: request.recipientDocument || saleData?.customers?.document || saleData?.customer_document || null,
      recipient_document_type: request.recipientDocumentType || saleData?.customers?.document_type || null,
      recipient_email: request.recipientEmail || saleData?.customers?.email || null,
      recipient_phone: request.recipientPhone || saleData?.customers?.phone || saleData?.customers?.mobile || null,
      recipient_address: request.recipientAddress || saleData?.customers?.address || {},

      // Valores
      subtotal: request.subtotal ?? saleData?.subtotal ?? 0,
      discount_amount: request.discountAmount ?? saleData?.discount_amount ?? 0,
      tax_amount: request.taxAmount ?? saleData?.tax_amount ?? 0,
      total_amount: request.totalAmount ?? saleData?.total_amount ?? 0,

      // Informações complementares
      nature_of_operation: request.natureOfOperation || this.getDefaultNatureOfOperation(documentType),
      additional_info: request.additionalInfo || null,
      fiscal_notes: request.fiscalNotes || null,

      // NFS-e
      service_code: request.serviceCode || config.nfse_municipal_code || null,
      cnae_code: request.cnaeCode || config.nfse_cnae || null,
      city_service_code: request.cityServiceCode || null,
      service_description: request.serviceDescription || null,

      created_by: userId,
    };

    // 5. Inserir documento
    const { data: document, error: docError } = await supabase
      .from('fiscal_documents')
      .insert(documentData)
      .select()
      .single();

    if (docError) {
      console.error('Error creating fiscal document:', docError);
      throw docError;
    }

    // 6. Inserir itens
    const items = request.items && request.items.length > 0
      ? request.items
      : this.buildItemsFromSale(saleItems, config, documentType);

    if (items.length > 0) {
      const itemRecords = items.map((item, index) => ({
        fiscal_document_id: document.id,
        product_service_id: item.productServiceId || null,
        sale_item_id: item.saleItemId || null,
        item_number: index + 1,
        name: item.name,
        description: item.description || null,
        ncm: item.ncm || null,
        cest: item.cest || null,
        cfop: item.cfop,
        unit: item.unit || 'UN',
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount_amount: item.discountAmount || 0,
        total_amount: (item.quantity * item.unitPrice) - (item.discountAmount || 0),
        icms_origin: item.icmsOrigin ?? 0,
        icms_cst: item.icmsCst || this.getDefaultIcmsCst(config),
        icms_csosn: item.icmsCsosn || this.getDefaultCsosn(config),
        icms_aliquota: item.icmsAliquota || 0,
        pis_cst: item.pisCst || this.getDefaultPisCst(config),
        pis_aliquota: item.pisAliquota || 0,
        cofins_cst: item.cofinsCst || this.getDefaultCofinsCst(config),
        cofins_aliquota: item.cofinsAliquota || 0,
        iss_aliquota: item.issAliquota || (documentType === 'nfse' ? config.nfse_aliquota_iss : 0),
        sort_order: index,
      }));

      const { error: itemsError } = await supabase
        .from('fiscal_document_items')
        .insert(itemRecords);

      if (itemsError) {
        console.error('Error creating fiscal document items:', itemsError);
        throw itemsError;
      }
    }

    // 7. Calcular e atualizar impostos totais
    await this.recalculateDocumentTaxes(supabase, document.id);

    // 8. Registrar evento de criação
    await this.addEvent(supabase, document.id, userId, {
      event_type: 'created',
      new_status: 'draft',
      description: `Documento fiscal ${documentType.toUpperCase()} nº ${next_number} série ${serie} criado`,
    });

    // 9. Vincular à venda se aplicável
    if (saleId) {
      await supabase
        .from('sales')
        .update({ fiscal_document_id: document.id })
        .eq('id', saleId);
    }

    // 10. Auto-emitir se configurado e vinculado a venda
    if (config.auto_emit_on_sale && saleId && nuvemFiscalService.isConfigured()) {
      try {
        await this.emitDocument(supabase, document.id, companyId, userId);
      } catch (emitError: any) {
        console.error('Auto-emit failed (document created as draft):', emitError.message);
        // Não falhar a criação se a emissão automática falhar
      }
    }

    // 11. Retornar documento completo
    return this.getDocumentById(supabase, document.id, companyId);
  }

  /**
   * Emite (transmite) um documento fiscal à SEFAZ/Prefeitura via Nuvem Fiscal.
   * O documento deve estar em status 'draft' ou 'rejected'.
   */
  async emitDocument(
    supabase: SupabaseClient,
    documentId: string,
    companyId: string,
    userId: string
  ) {
    if (!nuvemFiscalService.isConfigured()) {
      throw new Error('API Nuvem Fiscal não configurada. Configure as credenciais no servidor.');
    }

    // Buscar documento completo com itens
    const document = await this.getDocumentById(supabase, documentId, companyId);
    if (!document) {
      throw new Error('Documento fiscal não encontrado');
    }

    // Validar status
    if (document.status !== 'draft' && document.status !== 'rejected') {
      throw new Error(
        `Apenas documentos em rascunho ou rejeitados podem ser emitidos. Status atual: ${document.status}`
      );
    }

    // Buscar config fiscal
    const config = await this.getConfig(supabase, companyId);
    if (!config) {
      throw new Error('Configuração fiscal não encontrada');
    }

    // Atualizar para 'pending' (transmitindo)
    await this.updateStatus(supabase, documentId, companyId, userId, 'pending', {
      description: 'Transmitindo documento para SEFAZ/Prefeitura via Nuvem Fiscal',
    });

    try {
      // Chamar a API Nuvem Fiscal
      const result: EmissionResult = await nuvemFiscalService.emit(
        document.document_type,
        document,
        document.fiscal_document_items || [],
        config
      );

      // Armazenar ID externo no metadata
      const metadataUpdate: Record<string, any> = {
        metadata: {
          ...(document.metadata || {}),
          nuvem_fiscal_id: result.externalId,
        },
      };

      if (result.xml) {
        metadataUpdate.xml_content = result.xml;
      }

      await supabase
        .from('fiscal_documents')
        .update(metadataUpdate)
        .eq('id', documentId);

      // Atualizar status baseado na resposta
      if (result.status === 'authorized') {
        await this.updateStatus(supabase, documentId, companyId, userId, 'authorized', {
          description: 'Documento autorizado pela SEFAZ/Prefeitura',
          protocol: result.protocol,
          responseData: result.rawResponse,
        });

        // Atualizar chave de acesso
        if (result.accessKey) {
          await supabase
            .from('fiscal_documents')
            .update({
              access_key: result.accessKey,
              authorization_protocol: result.protocol,
              authorization_date: new Date().toISOString(),
            })
            .eq('id', documentId);
        }
      } else if (result.status === 'rejected' || result.status === 'denied') {
        await this.updateStatus(supabase, documentId, companyId, userId, result.status, {
          description: result.statusReason || 'Documento rejeitado pela SEFAZ/Prefeitura',
          errorCode: result.statusCode,
          errorMessage: result.statusReason,
          responseData: result.rawResponse,
        });
      } else {
        // processing / pending — documento sendo processado assincronamente
        await this.updateStatus(supabase, documentId, companyId, userId, 'processing', {
          description: 'Documento em processamento na SEFAZ/Prefeitura',
          responseData: result.rawResponse,
        });
      }

      return this.getDocumentById(supabase, documentId, companyId);
    } catch (error: any) {
      // Se falhar, voltar para rejected
      await this.updateStatus(supabase, documentId, companyId, userId, 'rejected', {
        description: `Erro na transmissão: ${error.message}`,
        errorMessage: error.message,
      });
      throw error;
    }
  }

  /**
   * Consulta o status atualizado de um documento na Nuvem Fiscal.
   */
  async consultDocument(
    supabase: SupabaseClient,
    documentId: string,
    companyId: string,
    userId: string
  ) {
    if (!nuvemFiscalService.isConfigured()) {
      throw new Error('API Nuvem Fiscal não configurada');
    }

    const document = await this.getDocumentById(supabase, documentId, companyId);
    if (!document) {
      throw new Error('Documento fiscal não encontrado');
    }

    const externalId = document.metadata?.nuvem_fiscal_id;
    if (!externalId) {
      throw new Error('Documento não possui ID externo na Nuvem Fiscal. Emita o documento primeiro.');
    }

    const result: EmissionResult = await nuvemFiscalService.consult(
      document.document_type,
      externalId
    );

    // Se status mudou, atualizar
    if (result.status !== document.status) {
      const eventData: Record<string, any> = {
        description: `Status atualizado via consulta: ${result.statusReason || result.status}`,
        responseData: result.rawResponse,
      };

      if (result.protocol) eventData.protocol = result.protocol;
      if (result.statusCode) eventData.errorCode = result.statusCode;
      if (result.statusReason) eventData.errorMessage = result.statusReason;

      await this.updateStatus(supabase, documentId, companyId, userId, result.status, eventData);

      // Atualizar chave de acesso se autorizado
      if (result.status === 'authorized' && result.accessKey) {
        await supabase
          .from('fiscal_documents')
          .update({
            access_key: result.accessKey,
            authorization_protocol: result.protocol,
            authorization_date: new Date().toISOString(),
          })
          .eq('id', documentId);
      }
    }

    return this.getDocumentById(supabase, documentId, companyId);
  }

  /**
   * Baixa o PDF (DANFE/DANFCE/DANFSE) de um documento fiscal via Nuvem Fiscal.
   */
  async downloadPdf(documentId: string, companyId: string, supabase: SupabaseClient): Promise<Buffer> {
    const document = await this.getDocumentById(supabase, documentId, companyId);
    if (!document) throw new Error('Documento fiscal não encontrado');

    const externalId = document.metadata?.nuvem_fiscal_id;
    if (!externalId) throw new Error('Documento não possui ID na Nuvem Fiscal');

    if (document.status !== 'authorized' && document.status !== 'corrected' && document.status !== 'cancelled') {
      throw new Error('PDF disponível apenas para documentos autorizados, corrigidos ou cancelados');
    }

    return nuvemFiscalService.downloadPdf(document.document_type, externalId);
  }

  /**
   * Baixa o XML de um documento fiscal via Nuvem Fiscal.
   */
  async downloadXml(documentId: string, companyId: string, supabase: SupabaseClient): Promise<Buffer> {
    const document = await this.getDocumentById(supabase, documentId, companyId);
    if (!document) throw new Error('Documento fiscal não encontrado');

    const externalId = document.metadata?.nuvem_fiscal_id;
    if (!externalId) throw new Error('Documento não possui ID na Nuvem Fiscal');

    return nuvemFiscalService.downloadXml(document.document_type, externalId);
  }

  /**
   * Sincroniza a empresa na Nuvem Fiscal (cadastro + certificado + configurações).
   */
  async syncCompanyToNuvemFiscal(
    supabase: SupabaseClient,
    companyId: string
  ) {
    if (!nuvemFiscalService.isConfigured()) {
      throw new Error('API Nuvem Fiscal não configurada');
    }

    const config = await this.getConfig(supabase, companyId);
    if (!config) {
      throw new Error('Configuração fiscal não encontrada');
    }

    // Buscar dados da empresa
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

      const {data:profile, error:profileError} = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', company.user_id)
      .single();

    if (companyError) throw companyError;
    if (profileError) throw profileError;

    // 1. Sincronizar empresa
    const syncResult = await nuvemFiscalService.syncCompany(config, company, profile);

    const cnpj = config.emitente_cnpj || company.cnpj || '';

    // 2. Upload de certificado digital (se disponível)
    if (config.certificate_data && config.certificate_password) {
      // Descriptografar a senha do certificado antes de enviar para a API
      const decryptedPassword = decryptSensitiveData(config.certificate_password);
      await nuvemFiscalService.uploadCertificate(
        cnpj,
        config.certificate_data,
        decryptedPassword
      );
    }

    // 3. Configurar NFC-e (se habilitada)
    if (config.nfce_enabled) {
      await nuvemFiscalService.configureNfce(cnpj, {
        cscId: config.csc_id,
        cscToken: config.csc_token,
        environment: config.environment,
        regimeTributario: company.regime_tributario,
      });
    }

    // 4. Configurar NF-e (se habilitada)
    if (config.nfe_enabled) {
      await nuvemFiscalService.configureNfe(cnpj, {
        environment: config.environment,
        regimeTributario: company.regime_tributario,
      });
    }

    // 5. Configurar NFS-e (se habilitada)
    if (config.nfse_enabled) {
      await nuvemFiscalService.configureNfse(cnpj, {
        environment: config.environment,
        rpsSerie: config.nfse_rps_serie,
        rpsNumero: config.nfse_next_number,
        rpsLote: config.nfse_serie,
      });
    }

    return syncResult;
  }

  /**
   * Busca um documento fiscal por ID com itens e eventos.
   */
  async getDocumentById(supabase: SupabaseClient, documentId: string, companyId: string) {
    const { data, error } = await supabase
      .from('fiscal_documents')
      .select(`
        *,
        fiscal_document_items (*),
        fiscal_document_events (*)
      `)
      .eq('id', documentId)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single();

    if (error) {
      console.error('Error fetching fiscal document:', error);
      throw error;
    }

    return data;
  }

  /**
   * Lista documentos fiscais com filtros.
   */
  async listDocuments(
    supabase: SupabaseClient,
    filters: {
      companyId: string;
      documentType?: FiscalDocumentType;
      status?: FiscalDocumentStatus;
      from?: string;
      to?: string;
      saleId?: string;
      search?: string;
    }
  ) {
    let query = supabase
      .from('fiscal_documents')
      .select('*')
      .eq('company_id', filters.companyId)
      .is('deleted_at', null);

    if (filters.documentType) {
      query = query.eq('document_type', filters.documentType);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.saleId) {
      query = query.eq('sale_id', filters.saleId);
    }

    if (filters.from) {
      query = query.gte('created_at', `${filters.from}T00:00:00`);
    }

    if (filters.to) {
      query = query.lte('created_at', `${filters.to}T23:59:59`);
    }

    if (filters.search) {
      query = query.or(
        `recipient_name.ilike.%${filters.search}%,recipient_document.ilike.%${filters.search}%,access_key.ilike.%${filters.search}%`
      );
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error listing fiscal documents:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Atualiza o status de um documento fiscal e registra o evento.
   */
  async updateStatus(
    supabase: SupabaseClient,
    documentId: string,
    companyId: string,
    userId: string,
    newStatus: FiscalDocumentStatus,
    eventData?: {
      description?: string;
      errorCode?: string;
      errorMessage?: string;
      protocol?: string;
      responseData?: Record<string, any>;
    }
  ) {
    // Buscar documento atual
    const { data: current, error: fetchError } = await supabase
      .from('fiscal_documents')
      .select('status')
      .eq('id', documentId)
      .eq('company_id', companyId)
      .single();

    if (fetchError) throw fetchError;

    const oldStatus = current.status as FiscalDocumentStatus;

    // Validar transição de status
    this.validateStatusTransition(oldStatus, newStatus);

    // Atualizar status
    const updateData: Record<string, any> = { status: newStatus };

    if (newStatus === 'authorized' && eventData?.protocol) {
      updateData.authorization_protocol = eventData.protocol;
      updateData.authorization_date = new Date().toISOString();
    }

    if (newStatus === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
      if (eventData?.protocol) {
        updateData.cancellation_protocol = eventData.protocol;
      }
    }

    if (newStatus === 'rejected' || newStatus === 'denied') {
      if (eventData?.errorCode) updateData.rejection_code = eventData.errorCode;
      if (eventData?.errorMessage) updateData.rejection_message = eventData.errorMessage;
    }

    const { data: updated, error: updateError } = await supabase
      .from('fiscal_documents')
      .update(updateData)
      .eq('id', documentId)
      .eq('company_id', companyId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Registrar evento
    await this.addEvent(supabase, documentId, userId, {
      event_type: newStatus,
      old_status: oldStatus,
      new_status: newStatus,
      description: eventData?.description,
      error_code: eventData?.errorCode,
      error_message: eventData?.errorMessage,
      protocol: eventData?.protocol,
      response_data: eventData?.responseData || {},
    });

    // Atualizar dados na venda vinculada se autorizado
    if (newStatus === 'authorized' && updated.sale_id) {
      await supabase
        .from('sales')
        .update({
          nfce_number: updated.number?.toString(),
          nfce_key: updated.access_key,
          nfce_status: 'authorized',
        })
        .eq('id', updated.sale_id);
    }

    return updated;
  }

  /**
   * Cancela um documento fiscal.
   * Se autorizado na SEFAZ/Prefeitura, cancela via Nuvem Fiscal primeiro.
   */
  async cancelDocument(
    supabase: SupabaseClient,
    documentId: string,
    companyId: string,
    userId: string,
    reason: string
  ) {
    // Buscar documento
    const { data: doc, error } = await supabase
      .from('fiscal_documents')
      .select('status, sale_id, document_type, metadata')
      .eq('id', documentId)
      .eq('company_id', companyId)
      .single();

    if (error) throw error;

    if (doc.status !== 'authorized' && doc.status !== 'draft') {
      throw new Error('Apenas documentos autorizados ou em rascunho podem ser cancelados');
    }

    // Se autorizado, cancelar via Nuvem Fiscal primeiro
    if (doc.status === 'authorized' && nuvemFiscalService.isConfigured()) {
      const externalId = doc.metadata?.nuvem_fiscal_id;
      if (externalId) {
        const cancelResult: CancelResult = await nuvemFiscalService.cancel(
          doc.document_type,
          externalId,
          reason
        );

        if (!cancelResult.success) {
          throw new Error(
            `Falha ao cancelar na SEFAZ/Prefeitura: ${cancelResult.statusReason || 'erro desconhecido'}`
          );
        }
      }
    }

    const updateData: Record<string, any> = {
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
    };

    const { data: updated, error: updateError } = await supabase
      .from('fiscal_documents')
      .update(updateData)
      .eq('id', documentId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Registrar evento
    await this.addEvent(supabase, documentId, userId, {
      event_type: 'cancelled',
      old_status: doc.status,
      new_status: 'cancelled',
      description: `Cancelamento: ${reason}`,
    });

    // Atualizar venda se vinculada
    if (doc.sale_id) {
      await supabase
        .from('sales')
        .update({
          nfce_status: 'cancelled',
          fiscal_document_id: null,
        })
        .eq('id', doc.sale_id);
    }

    return updated;
  }

  /**
   * Registra uma carta de correção.
   * Para NF-e, transmite à SEFAZ via Nuvem Fiscal.
   */
  async correctDocument(
    supabase: SupabaseClient,
    documentId: string,
    companyId: string,
    userId: string,
    correctionText: string
  ) {
    // Buscar documento
    const { data: doc, error } = await supabase
      .from('fiscal_documents')
      .select('status, correction_sequence, document_type, metadata')
      .eq('id', documentId)
      .eq('company_id', companyId)
      .single();

    if (error) throw error;

    if (doc.status !== 'authorized' && doc.status !== 'corrected') {
      throw new Error('Carta de correção só pode ser emitida para documentos autorizados');
    }

    const newSequence = (doc.correction_sequence || 0) + 1;

    if (newSequence > 20) {
      throw new Error('Limite máximo de 20 cartas de correção atingido');
    }

    if (correctionText.length < 15 || correctionText.length > 1000) {
      throw new Error('Texto da carta de correção deve ter entre 15 e 1000 caracteres');
    }

    // Se NF-e, transmitir carta de correção via Nuvem Fiscal
    if (doc.document_type === 'nfe' && nuvemFiscalService.isConfigured()) {
      const externalId = doc.metadata?.nuvem_fiscal_id;
      if (externalId) {
        const corrResult: CorrectionResult = await nuvemFiscalService.correctNfe(
          externalId,
          correctionText
        );
        if (!corrResult.success) {
          throw new Error('Falha ao registrar carta de correção na SEFAZ');
        }
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('fiscal_documents')
      .update({
        status: 'corrected',
        correction_text: correctionText,
        correction_sequence: newSequence,
        corrected_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Registrar evento
    await this.addEvent(supabase, documentId, userId, {
      event_type: 'corrected',
      old_status: doc.status,
      new_status: 'corrected',
      description: `Carta de Correção nº ${newSequence}: ${correctionText}`,
    });

    return updated;
  }

  /**
   * Busca os eventos de um documento fiscal.
   */
  async getDocumentEvents(supabase: SupabaseClient, documentId: string, companyId: string) {
    // Validar que o documento pertence à empresa
    const { error: docError } = await supabase
      .from('fiscal_documents')
      .select('id')
      .eq('id', documentId)
      .eq('company_id', companyId)
      .single();

    if (docError) throw docError;

    const { data, error } = await supabase
      .from('fiscal_document_events')
      .select('*')
      .eq('fiscal_document_id', documentId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return data || [];
  }

  /**
   * Obtém estatísticas fiscais da empresa.
   */
  async getStats(supabase: SupabaseClient, companyId: string, month?: string) {
    let query = supabase
      .from('fiscal_documents')
      .select('document_type, status, total_amount')
      .eq('company_id', companyId)
      .is('deleted_at', null);

    if (month) {
      const [year, m] = month.split('-');
      const startDate = `${year}-${m}-01T00:00:00`;
      const endDate = new Date(parseInt(year), parseInt(m), 0);
      query = query
        .gte('created_at', startDate)
        .lte('created_at', `${endDate.toISOString().split('T')[0]}T23:59:59`);
    }

    const { data, error } = await query;

    if (error) throw error;

    const docs = data || [];

    const stats = {
      total: docs.length,
      authorized: docs.filter(d => d.status === 'authorized').length,
      cancelled: docs.filter(d => d.status === 'cancelled').length,
      rejected: docs.filter(d => d.status === 'rejected').length,
      draft: docs.filter(d => d.status === 'draft').length,
      pending: docs.filter(d => d.status === 'pending').length,
      totalValue: docs
        .filter(d => d.status === 'authorized')
        .reduce((sum, d) => sum + (d.total_amount || 0), 0),
      byType: {
        nfce: docs.filter(d => d.document_type === 'nfce').length,
        nfse: docs.filter(d => d.document_type === 'nfse').length,
        nfe: docs.filter(d => d.document_type === 'nfe').length,
      },
    };

    return stats;
  }

  // ===== Private Helpers =====

  private validateDocumentTypeEnabled(config: any, documentType: FiscalDocumentType): void {
    switch (documentType) {
      case 'nfce':
        if (!config.nfce_enabled) throw new Error('NFC-e não está habilitada para esta empresa');
        break;
      case 'nfse':
        if (!config.nfse_enabled) throw new Error('NFS-e não está habilitada para esta empresa');
        break;
      case 'nfe':
        if (!config.nfe_enabled) throw new Error('NF-e não está habilitada para esta empresa');
        break;
    }
  }

  private validateStatusTransition(
    currentStatus: FiscalDocumentStatus,
    newStatus: FiscalDocumentStatus
  ): void {
    const validTransitions: Record<string, string[]> = {
      draft: ['pending', 'cancelled'],
      pending: ['processing', 'authorized', 'rejected', 'cancelled'],
      processing: ['authorized', 'rejected', 'denied'],
      authorized: ['cancelled', 'corrected'],
      rejected: ['pending', 'draft'],
      denied: [],
      cancelled: [],
      corrected: ['cancelled', 'corrected'],
    };

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(
        `Transição de status inválida: ${currentStatus} → ${newStatus}. Permitido: ${allowed.join(', ') || 'nenhum'}`
      );
    }
  }

  private getDefaultNatureOfOperation(documentType: FiscalDocumentType): string {
    switch (documentType) {
      case 'nfce': return 'Venda de mercadoria';
      case 'nfse': return 'Prestação de serviço';
      case 'nfe': return 'Venda de mercadoria';
    }
  }

  private getDefaultIcmsCst(config: any): string | null {
    // Simples Nacional usa CSOSN, não CST
    if (config.regime_tributario === 'simples_nacional' || config.regime_tributario === 'mei') {
      return null;
    }
    return '00'; // Tributada integralmente
  }

  private getDefaultCsosn(config: any): string | null {
    if (config.regime_tributario === 'simples_nacional' || config.regime_tributario === 'mei') {
      return '102'; // Tributada pelo Simples Nacional sem permissão de crédito
    }
    return null;
  }

  private getDefaultPisCst(config: any): string {
    if (config.regime_tributario === 'simples_nacional' || config.regime_tributario === 'mei') {
      return '99'; // Outras operações
    }
    return '01'; // Operação tributável
  }

  private getDefaultCofinsCst(config: any): string {
    if (config.regime_tributario === 'simples_nacional' || config.regime_tributario === 'mei') {
      return '99'; // Outras operações
    }
    return '01'; // Operação tributável
  }

  /**
   * Constrói itens fiscais a partir de itens da venda.
   */
  private buildItemsFromSale(
    saleItems: any[],
    config: any,
    documentType: FiscalDocumentType
  ): CreateFiscalDocumentItemRequest[] {
    return saleItems.map((item) => ({
      productServiceId: item.product_service_id,
      saleItemId: item.id,
      name: item.name,
      description: item.description || item.products_services?.description || null,
      ncm: item.products_services?.ncm || null,
      cfop: this.getDefaultCfop(documentType, config),
      unit: 'UN',
      quantity: item.quantity,
      unitPrice: item.unit_price,
      discountAmount: item.discount_amount || 0,
    }));
  }

  private getDefaultCfop(documentType: FiscalDocumentType, _config: any): string {
    switch (documentType) {
      case 'nfce': return '5102'; // Venda de mercadoria para consumidor
      case 'nfse': return '0000'; // NFS-e não usa CFOP
      case 'nfe': return '5102';  // Venda de mercadoria
    }
  }

  /**
   * Recalcula os totais de impostos do documento baseado nos itens.
   */
  private async recalculateDocumentTaxes(supabase: SupabaseClient, documentId: string) {
    const { data: items, error } = await supabase
      .from('fiscal_document_items')
      .select('*')
      .eq('fiscal_document_id', documentId);

    if (error || !items) return;

    const totals = items.reduce(
      (acc, item) => ({
        icms_base: acc.icms_base + (item.icms_base || 0),
        icms_value: acc.icms_value + (item.icms_value || 0),
        pis_value: acc.pis_value + (item.pis_value || 0),
        cofins_value: acc.cofins_value + (item.cofins_value || 0),
        iss_value: acc.iss_value + (item.iss_value || 0),
        ipi_value: acc.ipi_value + (item.ipi_value || 0),
        tax_amount:
          acc.tax_amount +
          (item.icms_value || 0) +
          (item.pis_value || 0) +
          (item.cofins_value || 0) +
          (item.iss_value || 0) +
          (item.ipi_value || 0),
      }),
      {
        icms_base: 0,
        icms_value: 0,
        pis_value: 0,
        cofins_value: 0,
        iss_value: 0,
        ipi_value: 0,
        tax_amount: 0,
      }
    );

    await supabase
      .from('fiscal_documents')
      .update(totals)
      .eq('id', documentId);
  }

  /**
   * Registra um evento no histórico do documento fiscal.
   */
  private async addEvent(
    supabase: SupabaseClient,
    documentId: string,
    userId: string,
    eventData: {
      event_type: string;
      old_status?: FiscalDocumentStatus | string;
      new_status: FiscalDocumentStatus | string;
      description?: string;
      error_code?: string;
      error_message?: string;
      protocol?: string;
      response_data?: Record<string, any>;
    }
  ) {
    const { error } = await supabase
      .from('fiscal_document_events')
      .insert({
        fiscal_document_id: documentId,
        created_by: userId,
        ...eventData,
      });

    if (error) {
      console.error('Error creating fiscal document event:', error);
      // Não lançar erro para não interromper o fluxo principal
    }
  }
}

export default new FiscalService();

import { Request, Response } from 'express';
import { getSupabaseClient } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import fiscalService from '../services/fiscal.service';
import companieService from '../services/companie.service';
import { encryptSensitiveData } from '../utils/crypto.utils';
import {
  CreateFiscalConfigRequest,
  CreateFiscalDocumentRequest,
  CancelFiscalDocumentRequest,
  CorrectFiscalDocumentRequest,
  FiscalDocumentStatus,
} from '../types/fiscal.types';


export class FiscalController {
  // ==========================================
  // CONFIGURAÇÃO FISCAL
  // ==========================================

  /**
   * GET /api/fiscal/config?companyId=xxx
   * Obtém a configuração fiscal da empresa
   */
  async getConfig(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabase = getSupabaseClient(authReq.accessToken!);
      const config = await fiscalService.getConfig(supabase, companyId);
      const company = await companieService.getCompanie(supabase, companyId);

      if (!config) {
        return res.json(null);
      }

      // Ocultar dados sensíveis do certificado
      const safeConfig = {
        ...company,
        ...config,
        certificate_data: config.certificate_data ? '***CONFIGURADO***' : null,
        certificate_password: config.certificate_password ? '***CONFIGURADO***' : null,
      };

      res.json(safeConfig);
    } catch (error: any) {
      console.error('Error in getConfig:', error);
      res.status(500).json({ error: 'Erro ao buscar configuração fiscal', message: error.message });
    }
  }

  /**
   * POST /api/fiscal/config
   * Cria ou atualiza a configuração fiscal
   */
  async upsertConfig(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const body = req.body as CreateFiscalConfigRequest;

      if (!body.companyId) {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabase = getSupabaseClient(authReq.accessToken!);

      // Atualizar dados da empresa (emitente, endereço fiscal, regime)
      const companyUpdateData: Record<string, any> = {};
      if (body.enderecoFiscal !== undefined) companyUpdateData.endereco_fiscal = body.enderecoFiscal;
      if (body.regimeTributario !== undefined) companyUpdateData.regime_tributario = body.regimeTributario;
      if (body.emitenteIe !== undefined) companyUpdateData.inscricao_estadual = body.emitenteIe;
      if (body.emitenteIm !== undefined) companyUpdateData.inscricao_municipal = body.emitenteIm;
      if (body.enderecoFiscal?.codigoMunicipio !== undefined) companyUpdateData.codigo_municipio = body.enderecoFiscal.codigoMunicipio;
      if (body.enderecoFiscal?.uf !== undefined) companyUpdateData.uf = body.enderecoFiscal.uf;
      if (body.emitenteEmail !== undefined) companyUpdateData.email = body.emitenteEmail;
      if (body.emitenteFone !== undefined) companyUpdateData.fone = body.emitenteFone;

      // Se houver dados da empresa para atualizar
      if (Object.keys(companyUpdateData).length > 0) {
        companyUpdateData.updated_at = new Date().toISOString();
        
        const { error: companyError } = await supabase
          .from('companies')
          .update(companyUpdateData)
          .eq('id', body.companyId);

        if (companyError) {
          console.error('Erro ao atualizar dados da empresa:', companyError);
          return res.status(500).json({ 
            error: 'Erro ao atualizar dados da empresa', 
            message: companyError.message 
          });
        }
      }

      // Converter camelCase para snake_case para fiscal_config
      const configData: Record<string, any> = {};
      if (body.environment !== undefined) configData.environment = body.environment;
      // Garantir que o certificado seja base64
      if (body.certificateData !== undefined) {
        // Se o certificado não estiver em base64, converter
        const certData = body.certificateData.trim();
        // Validar se é base64 válido (contém apenas caracteres base64)
        const base64Regex = /^[A-Za-z0-9+/=]+$/;
        if (!base64Regex.test(certData)) {
          return res.status(400).json({ 
            error: 'O certificado deve estar codificado em base64' 
          });
        }
        configData.certificate_data = certData;
      }
      // Criptografar senha do certificado antes de salvar
      if (body.certificatePassword !== undefined) {
        configData.certificate_password = encryptSensitiveData(body.certificatePassword);
      }
      if (body.cscId !== undefined) configData.csc_id = body.cscId;
      if (body.cscToken !== undefined) configData.csc_token = body.cscToken;
      if (body.nfceEnabled !== undefined) configData.nfce_enabled = body.nfceEnabled;
      if (body.nfceSerie !== undefined) configData.nfce_serie = body.nfceSerie;
      if (body.nfseEnabled !== undefined) configData.nfse_enabled = body.nfseEnabled;
      if (body.nfseSerie !== undefined) configData.nfse_serie = body.nfseSerie;
      if (body.nfseRpsSerie !== undefined) configData.nfse_rps_serie = body.nfseRpsSerie;
      if (body.nfseMunicipalCode !== undefined) configData.nfse_municipal_code = body.nfseMunicipalCode;
      if (body.nfseCnae !== undefined) configData.nfse_cnae = body.nfseCnae;
      if (body.nfseAliquotaIss !== undefined) configData.nfse_aliquota_iss = body.nfseAliquotaIss;
      if (body.nfeEnabled !== undefined) configData.nfe_enabled = body.nfeEnabled;
      if (body.nfeSerie !== undefined) configData.nfe_serie = body.nfeSerie;
      if (body.emitenteRazaoSocial !== undefined) configData.emitente_razao_social = body.emitenteRazaoSocial;
      if (body.emitenteNomeFantasia !== undefined) configData.emitente_nome_fantasia = body.emitenteNomeFantasia;
      if (body.emitenteCnpj !== undefined) configData.emitente_cnpj = body.emitenteCnpj;
      if (body.emitenteIe !== undefined) configData.emitente_ie = body.emitenteIe;
      if (body.emitenteIm !== undefined) configData.emitente_im = body.emitenteIm;
      if (body.emitenteEmail !== undefined) configData.emitente_email = body.emitenteEmail;
      if (body.emitenteFone !== undefined) configData.emitente_fone = body.emitenteFone;
      if (body.autoEmitOnSale !== undefined) configData.auto_emit_on_sale = body.autoEmitOnSale;
      if (body.defaultDocumentType !== undefined) configData.default_document_type = body.defaultDocumentType;

      const config = await fiscalService.upsertConfig(supabase, body.companyId, configData);

      // Sincronizar automaticamente com a Nuvem Fiscal após salvar
      let syncWarning: any = null;
      try {
        await fiscalService.syncCompanyToNuvemFiscal(supabase, body.companyId);
        console.log(`Empresa ${body.companyId} sincronizada com a Nuvem Fiscal`);
      } catch (syncError: any) {
        console.error('Erro ao sincronizar empresa com Nuvem Fiscal (config salva com sucesso):', syncError.message);
        // Não falhar a requisição - a config foi salva com sucesso
        // Mas retornar o erro para o frontend exibir
        
        // Extrair detalhes do erro se disponível
        let errorCode = null;
        let errorMessage = syncError.message || 'Erro desconhecido';
        let validationErrors = null;
        
        if (syncError.error) {
          errorCode = syncError.error.code || null;
          errorMessage = syncError.error.message || errorMessage;
          
          // Se houver erros de validação, incluir no warning
          if (syncError.error.errors && Array.isArray(syncError.error.errors)) {
            validationErrors = syncError.error.errors;
            // Concatenar mensagens de validação para exibição rápida
            const validationMessages = syncError.error.errors
              .map((err: any) => err.message)
              .filter(Boolean)
              .join('; ');
            if (validationMessages) {
              errorMessage = `${errorMessage}: ${validationMessages}`;
            }
          }
        }
        
        syncWarning = {
          type: 'sync_error',
          message: 'Configuração salva, mas houve erro na sincronização com a Nuvem Fiscal',
          errorCode,
          errorMessage,
          validationErrors,
          statusCode: syncError.statusCode || null
        };
      }

      // Retornar config + warning se houver
      const response = syncWarning 
        ? { ...config, warning: syncWarning }
        : config;
      
      res.status(200).json(response);
    } catch (error: any) {
      console.error('Error in upsertConfig:', error);
      res.status(500).json({ error: 'Erro ao salvar configuração fiscal', message: error.message });
    }
  }

  // ==========================================
  // DOCUMENTOS FISCAIS
  // ==========================================

  /**
   * GET /api/fiscal/documents?companyId=xxx&documentType=nfce&status=authorized&from=&to=&search=
   * Lista documentos fiscais
   */
  async listDocuments(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId, documentType, status, from, to, saleId, search } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabase = getSupabaseClient(authReq.accessToken!);

      const documents = await fiscalService.listDocuments(supabase, {
        companyId,
        documentType: documentType as any,
        status: status as any,
        from: from as string,
        to: to as string,
        saleId: saleId as string,
        search: search as string,
      });

      res.json(documents);
    } catch (error: any) {
      console.error('Error in listDocuments:', error);
      res.status(500).json({ error: 'Erro ao listar documentos fiscais', message: error.message });
    }
  }

  /**
   * GET /api/fiscal/documents/:id?companyId=xxx
   * Obtém um documento fiscal por ID com itens e eventos
   */
  async getDocument(req: Request, res: Response): Promise<Response | void> {
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

      const supabase = getSupabaseClient(authReq.accessToken!);

      const document = await fiscalService.getDocumentById(supabase, id, companyId);

      if (!document) {
        return res.status(404).json({ error: 'Documento fiscal não encontrado' });
      }

      res.json(document);
    } catch (error: any) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Documento fiscal não encontrado' });
      }
      console.error('Error in getDocument:', error);
      res.status(500).json({ error: 'Erro ao buscar documento fiscal', message: error.message });
    }
  }

  /**
   * POST /api/fiscal/documents
   * Cria um novo documento fiscal
   */
  async createDocument(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const body = req.body as CreateFiscalDocumentRequest;

      if (!body.companyId) {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      if (!body.documentType) {
        return res.status(400).json({ error: 'documentType é obrigatório (nfce, nfse, nfe)' });
      }

      const validTypes = ['nfce', 'nfse', 'nfe'];
      if (!validTypes.includes(body.documentType)) {
        return res.status(400).json({ error: `documentType inválido. Valores permitidos: ${validTypes.join(', ')}` });
      }

      // Se não tem venda vinculada, precisa de itens ou valores
      if (!body.saleId && (!body.items || body.items.length === 0) && !body.totalAmount) {
        return res.status(400).json({
          error: 'Informe saleId para vincular a uma venda, ou forneça itens/valores manualmente',
        });
      }

      const supabase = getSupabaseClient(authReq.accessToken!);

      const document = await fiscalService.createDocument(
        supabase,
        authReq.user!.id,
        body
      );

      res.status(201).json(document);
    } catch (error: any) {
      console.error('Error in createDocument:', error);
      const statusCode = error.message?.includes('não encontrada') || error.message?.includes('não está habilitada')
        ? 400
        : 500;
      res.status(statusCode).json({ error: 'Erro ao criar documento fiscal', message: error.message });
    }
  }

  /**
   * PATCH /api/fiscal/documents/:id/status
   * Atualiza o status de um documento fiscal (transmitir, autorizar, etc.)
   */
  async updateDocumentStatus(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { companyId } = req.query;
      const { status, description, errorCode, errorMessage, protocol, responseData } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID é obrigatório' });
      }

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      if (!status) {
        return res.status(400).json({ error: 'status é obrigatório' });
      }

      const supabase = getSupabaseClient(authReq.accessToken!);

      const updated = await fiscalService.updateStatus(
        supabase,
        id,
        companyId,
        authReq.user!.id,
        status as FiscalDocumentStatus,
        { description, errorCode, errorMessage, protocol, responseData }
      );

      res.json(updated);
    } catch (error: any) {
      console.error('Error in updateDocumentStatus:', error);
      const statusCode = error.message?.includes('inválida') ? 400 : 500;
      res.status(statusCode).json({ error: 'Erro ao atualizar status', message: error.message });
    }
  }

  /**
   * POST /api/fiscal/documents/:id/cancel
   * Cancela um documento fiscal
   */
  async cancelDocument(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { companyId } = req.query;
      const { reason } = req.body as CancelFiscalDocumentRequest;

      if (!id) {
        return res.status(400).json({ error: 'ID é obrigatório' });
      }

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      if (!reason || reason.trim().length < 15) {
        return res.status(400).json({ error: 'Motivo do cancelamento é obrigatório (mínimo 15 caracteres)' });
      }

      const supabase = getSupabaseClient(authReq.accessToken!);

      const document = await fiscalService.cancelDocument(
        supabase,
        id,
        companyId,
        authReq.user!.id,
        reason
      );

      res.json(document);
    } catch (error: any) {
      console.error('Error in cancelDocument:', error);
      const statusCode = error.message?.includes('Apenas documentos') || error.message?.includes('Falha ao cancelar')
        ? 400
        : 500;
      res.status(statusCode).json({ error: 'Erro ao cancelar documento fiscal', message: error.message });
    }
  }

  /**
   * POST /api/fiscal/documents/:id/correct
   * Emite carta de correção
   */
  async correctDocument(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { id } = req.params;
      const { companyId } = req.query;
      const { correctionText } = req.body as CorrectFiscalDocumentRequest;

      if (!id) {
        return res.status(400).json({ error: 'ID é obrigatório' });
      }

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      if (!correctionText || correctionText.trim().length < 15) {
        return res.status(400).json({ error: 'Texto da correção é obrigatório (mínimo 15 caracteres)' });
      }

      const supabase = getSupabaseClient(authReq.accessToken!);

      const document = await fiscalService.correctDocument(
        supabase,
        id,
        companyId,
        authReq.user!.id,
        correctionText
      );

      res.json(document);
    } catch (error: any) {
      console.error('Error in correctDocument:', error);
      const statusCode = error.message?.includes('só pode') || error.message?.includes('Limite') || error.message?.includes('Texto')
        ? 400
        : 500;
      res.status(statusCode).json({ error: 'Erro ao emitir carta de correção', message: error.message });
    }
  }

  /**
   * GET /api/fiscal/documents/:id/events?companyId=xxx
   * Lista os eventos/histórico de um documento fiscal
   */
  async getDocumentEvents(req: Request, res: Response): Promise<Response | void> {
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

      const supabase = getSupabaseClient(authReq.accessToken!);

      const events = await fiscalService.getDocumentEvents(supabase, id, companyId);

      res.json(events);
    } catch (error: any) {
      console.error('Error in getDocumentEvents:', error);
      res.status(500).json({ error: 'Erro ao buscar eventos do documento', message: error.message });
    }
  }

  /**
   * GET /api/fiscal/stats?companyId=xxx&month=2026-02
   * Obtém estatísticas fiscais da empresa
   */
  async getStats(req: Request, res: Response): Promise<Response | void> {
    try {
      const authReq = req as AuthRequest;
      const { companyId, month } = req.query;

      if (!companyId || typeof companyId !== 'string') {
        return res.status(400).json({ error: 'companyId é obrigatório' });
      }

      const supabase = getSupabaseClient(authReq.accessToken!);

      const stats = await fiscalService.getStats(supabase, companyId, month as string);

      res.json(stats);
    } catch (error: any) {
      console.error('Error in getStats:', error);
      res.status(500).json({ error: 'Erro ao buscar estatísticas fiscais', message: error.message });
    }
  }

  // ==========================================
  // NUVEM FISCAL – TRANSMISSÃO E DOWNLOADS
  // ==========================================

  /**
   * POST /api/fiscal/documents/:id/emit?companyId=xxx
   * Transmite o documento fiscal à SEFAZ/Prefeitura via Nuvem Fiscal
   */
  async emitDocument(req: Request, res: Response): Promise<Response | void> {
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

      const supabase = getSupabaseClient(authReq.accessToken!);

      const document = await fiscalService.emitDocument(
        supabase,
        id,
        companyId,
        authReq.user!.id
      );

      res.json(document);
    } catch (error: any) {
      console.error('Error in emitDocument:', error);
      const statusCode =
        error.message?.includes('não configurada') ||
        error.message?.includes('Apenas documentos') ||
        error.message?.includes('não encontrada')
          ? 400
          : 500;
      res.status(statusCode).json({ error: 'Erro ao emitir documento fiscal', message: error.message });
    }
  }

  /**
   * POST /api/fiscal/documents/:id/consult?companyId=xxx
   * Consulta o status atualizado do documento na SEFAZ/Prefeitura
   */
  async consultDocument(req: Request, res: Response): Promise<Response | void> {
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

      const supabase = getSupabaseClient(authReq.accessToken!);

      const document = await fiscalService.consultDocument(
        supabase,
        id,
        companyId,
        authReq.user!.id
      );

      res.json(document);
    } catch (error: any) {
      console.error('Error in consultDocument:', error);
      const statusCode = error.message?.includes('não possui') || error.message?.includes('não configurada')
        ? 400
        : 500;
      res.status(statusCode).json({ error: 'Erro ao consultar documento fiscal', message: error.message });
    }
  }

  /**
   * GET /api/fiscal/documents/:id/pdf?companyId=xxx
   * Baixa o PDF (DANFE/DANFCE/DANFSE) do documento fiscal
   */
  async getDocumentPdf(req: Request, res: Response): Promise<Response | void> {
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

      const supabase = getSupabaseClient(authReq.accessToken!);

      const pdfBuffer = await fiscalService.downloadPdf(id, companyId, supabase);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="documento-fiscal-${id}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error('Error in getDocumentPdf:', error);
      const statusCode = error.message?.includes('não possui') || error.message?.includes('disponível')
        ? 400
        : 500;
      res.status(statusCode).json({ error: 'Erro ao baixar PDF do documento fiscal', message: error.message });
    }
  }

  /**
   * GET /api/fiscal/documents/:id/xml?companyId=xxx
   * Baixa o XML do documento fiscal
   */
  async getDocumentXml(req: Request, res: Response): Promise<Response | void> {
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

      const supabase = getSupabaseClient(authReq.accessToken!);

      const xmlBuffer = await fiscalService.downloadXml(id, companyId, supabase);

      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="documento-fiscal-${id}.xml"`);
      res.send(xmlBuffer);
    } catch (error: any) {
      console.error('Error in getDocumentXml:', error);
      const statusCode = error.message?.includes('não possui') ? 400 : 500;
      res.status(statusCode).json({ error: 'Erro ao baixar XML do documento fiscal', message: error.message });
    }
  }

}

export default new FiscalController();

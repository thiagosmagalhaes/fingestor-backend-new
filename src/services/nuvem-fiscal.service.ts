/**
 * NuvemFiscalService
 *
 * Provider de integração com a API Nuvem Fiscal (https://api.nuvemfiscal.com.br).
 * Responsável por:
 *  - Autenticação OAuth2 (client_credentials) com cache de token
 *  - Cadastro/atualização de empresas e certificados
 *  - Emissão, consulta, cancelamento e download de NFC-e, NF-e e NFS-e
 *  - Carta de correção (NF-e)
 *  - Download de PDF (DANFE/DANFCE/DANFSE) e XML
 */

// ============================================================
// TYPES
// ============================================================

interface OAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  /** Timestamp (ms) em que o token expira */
  expires_at: number;
}

/** Status retornado pela Nuvem Fiscal para NFC-e / NF-e (Dfe) */
type NuvemDfeStatus =
  | 'pendente'
  | 'autorizado'
  | 'rejeitado'
  | 'cancelado'
  | 'denegado'
  | 'erro';

/** Status retornado pela Nuvem Fiscal para NFS-e */
type NuvemNfseStatus =
  | 'processando'
  | 'autorizada'
  | 'negada'
  | 'cancelada'
  | 'substituida'
  | 'erro';

/** Status unificado do Fingestor */
type FingestorFiscalStatus =
  | 'draft'
  | 'pending'
  | 'processing'
  | 'authorized'
  | 'rejected'
  | 'denied'
  | 'cancelled'
  | 'corrected';

/** Resposta genérica de emissão de NFC-e / NF-e */
export interface NuvemDfeResponse {
  id: string;
  ambiente: string;
  status: NuvemDfeStatus;
  chave?: string;
  numero_protocolo?: string;
  motivo_status?: string;
  codigo_status?: number;
  xml?: string;
  created_at?: string;
  [key: string]: any;
}

/** Resposta genérica de emissão de NFS-e */
export interface NuvemNfseResponse {
  id: string;
  ambiente: string;
  status: NuvemNfseStatus;
  numero?: string;
  codigo_verificacao?: string;
  link_url?: string;
  xml?: string;
  mensagens?: Array<{ codigo?: string; descricao?: string }>;
  created_at?: string;
  [key: string]: any;
}

/** Resposta de cancelamento */
export interface NuvemCancelResponse {
  id: string;
  status: string;
  justificativa?: string;
  numero_protocolo?: string;
  [key: string]: any;
}

/** Resposta de carta de correção */
export interface NuvemCorrectionResponse {
  id: string;
  status: string;
  correcao?: string;
  numero_protocolo?: string;
  sequencia_evento?: number;
  [key: string]: any;
}

/** Resultado unificado retornado para o FiscalService */
export interface EmissionResult {
  success: boolean;
  externalId: string;
  status: FingestorFiscalStatus;
  accessKey?: string;
  protocol?: string;
  statusReason?: string;
  statusCode?: string;
  xml?: string;
  rawResponse: Record<string, any>;
}

export interface CancelResult {
  success: boolean;
  externalId: string;
  protocol?: string;
  statusReason?: string;
  rawResponse: Record<string, any>;
}

export interface CorrectionResult {
  success: boolean;
  externalId: string;
  protocol?: string;
  sequenceNumber?: number;
  rawResponse: Record<string, any>;
}

// ============================================================
// SERVICE
// ============================================================

class NuvemFiscalService {
  private readonly baseUrl: string;
  private readonly authUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private token: OAuthToken | null = null;

  constructor() {
    this.baseUrl = process.env.NUVEM_FISCAL_BASE_URL!;
    this.authUrl = process.env.NUVEM_FISCAL_AUTH_URL!;
    this.clientId = process.env.NUVEM_FISCAL_CLIENT_ID!;
    this.clientSecret = process.env.NUVEM_FISCAL_CLIENT_SECRET!;
  }

  // ----------------------------------------------------------
  // AUTH
  // ----------------------------------------------------------

  /**
   * Obtém (ou reutiliza) um access token via OAuth2 client_credentials.
   */
  private async getAccessToken(): Promise<string> {
    // Reutilizar token se ainda válido (margem de 40 s)
    if (this.token && Date.now() < this.token.expires_at - 40_000) {
      return this.token.access_token;
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error(
        'Credenciais Nuvem Fiscal não configuradas. Defina NUVEM_FISCAL_CLIENT_ID e NUVEM_FISCAL_CLIENT_SECRET.'
      );
    }

    // CURL equivalente:
    // curl -X POST https://auth.nuvemfiscal.com.br/oauth/token \
    //   -H "Content-Type: application/x-www-form-urlencoded" \
    //   -d "grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&scope=conta+empresa+cep+cnpj+nfe+nfce+nfse"

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: 'conta empresa cep cnpj nfe nfce nfse',
    });

    const res = await fetch(this.authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      
      // Tentar parsear o JSON de erro
      let errorDetails = null;
      try {
        const errorJson = JSON.parse(text);
        errorDetails = errorJson.error || errorJson;
      } catch (e) {
        // Se não for JSON válido, usar o texto diretamente
      }
      
      const error: any = new Error(`Nuvem Fiscal auth error (${res.status}): ${text}`);
      error.statusCode = res.status;
      error.error = errorDetails;
      throw error;
    }

    const data = (await res.json()) as Record<string, any>;

    this.token = {
      access_token: data.access_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
      expires_at: Date.now() + data.expires_in * 1000,
    };

    return this.token.access_token;
  }

  // ----------------------------------------------------------
  // HTTP helpers
  // ----------------------------------------------------------

  private async request<T = any>(
    method: string,
    path: string,
    body?: unknown,
    acceptBinary = false
  ): Promise<T> {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    if (body && !acceptBinary) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`Nuvem Fiscal API error [${method} ${path}] (${res.status}):`, text);
      
      // Tentar parsear o JSON de erro para obter detalhes estruturados
      let errorDetails = null;
      try {
        const errorJson = JSON.parse(text);
        errorDetails = errorJson.error || errorJson;
      } catch (e) {
        // Se não for JSON válido, usar o texto diretamente
      }
      
      const error: any = new Error(`Nuvem Fiscal API error (${res.status}): ${text}`);
      error.statusCode = res.status;
      error.error = errorDetails;
      throw error;
    }

    if (acceptBinary) {
      return res as unknown as T;
    }

    // 204 No Content
    if (res.status === 204) {
      return {} as T;
    }

    return res.json() as Promise<T>;
  }

  private async get<T = any>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  private async post<T = any>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  private async put<T = any>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  /**
   * Baixa conteúdo binário (PDF, XML) e retorna como Buffer.
   */
  private async downloadBinary(path: string): Promise<Buffer> {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}${path}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      
      // Tentar parsear o JSON de erro
      let errorDetails = null;
      try {
        const errorJson = JSON.parse(text);
        errorDetails = errorJson.error || errorJson;
      } catch (e) {
        // Se não for JSON válido, usar o texto diretamente
      }
      
      const error: any = new Error(`Nuvem Fiscal download error (${res.status}): ${text}`);
      error.statusCode = res.status;
      error.error = errorDetails;
      throw error;
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // ----------------------------------------------------------
  // EMPRESA (Company Sync)
  // ----------------------------------------------------------

  /**
   * Consulta uma empresa cadastrada na Nuvem Fiscal.
   */
  async consultCompany(cpfCnpj: string): Promise<any> {
    const cleanDoc = cpfCnpj.replace(/\D/g, '');
    return this.get(`/empresas/${cleanDoc}`);
  }

  /**
   * Cadastra ou atualiza a empresa na Nuvem Fiscal.
   *
   * Campos obrigatórios pela API: cpf_cnpj, nome_razao_social, email, endereco.
   */
  async syncCompany(config: Record<string, any>, companyData: Record<string, any>, profile: Record<string, any>): Promise<any> {
    const cpfCnpj = (config.emitente_cnpj || companyData.cnpj || '').replace(/\D/g, '');
    if (!cpfCnpj) {
      throw new Error('CNPJ/CPF do emitente é obrigatório para sincronizar com Nuvem Fiscal');
    }

    // Montar endereço a partir de endereco_fiscal (JSONB da tabela companies)
    const addr = companyData.endereco_fiscal || {};
    const endereco: Record<string, any> = {
      logradouro: addr.logradouro || '',
      numero: addr.numero || 'S/N',
      complemento: addr.complemento || '',
      bairro: addr.bairro || '',
      codigo_municipio: addr.codigo_municipio || companyData.codigo_municipio || '',
      cidade: addr.cidade || '',
      uf: addr.uf || companyData.uf || '',
      codigo_pais: addr.codigo_pais || '1058',
      pais: addr.pais || 'Brasil',
      cep: (addr.cep || '').replace(/\D/g, '') || '',
    };

    const empresaBody: Record<string, any> = {
      cpf_cnpj: cpfCnpj,
      nome_razao_social: config.emitente_razao_social || companyData.name,
      nome_fantasia: config.emitente_nome_fantasia || companyData.name,
      inscricao_estadual: config.emitente_ie || companyData.inscricao_estadual || '',
      inscricao_municipal: config.emitente_im || companyData.inscricao_municipal || '',
      email: profile.email || companyData.email || config.emitente_email || '',
      fone: companyData.fone || config.emitente_fone,
      endereco
    };

    // Consultar se a empresa já existe
    try {
      await this.get(`/empresas/${cpfCnpj}`);
      // Se encontrou, atualizar
      const updated = await this.put(`/empresas/${cpfCnpj}`, empresaBody);
      return updated;
    } catch (err: any) {
      if (err.message?.includes('404')) {
        // Se não encontrou, cadastrar (PUT sem cpfCnpj no path)
        const created = await this.post('/empresas', empresaBody);
        return created;
      }
      throw err;
    }
  }

  /**
   * Envia o certificado digital da empresa.
   */
  async uploadCertificate(
    cpfCnpj: string,
    certificateBase64: string,
    certificatePassword: string
  ): Promise<any> {
    const cleanCnpj = cpfCnpj.replace(/\D/g, '');

    const body = {
      certificado: certificateBase64,
      password: certificatePassword,
    };

    return this.put(`/empresas/${cleanCnpj}/certificado`, body);
  }

  /**
   * Configura NFC-e para a empresa na Nuvem Fiscal.
   */
  async configureNfce(
    cpfCnpj: string,
    config: { cscId?: string; cscToken?: string; environment?: string; regimeTributario?: string }
  ): Promise<any> {
    const cleanCnpj = cpfCnpj.replace(/\D/g, '');
    const ambiente = config.environment === 'production' ? 'producao' : 'homologacao';

    return this.put(`/empresas/${cleanCnpj}/nfce`, {
      CRT: this.mapCRT(config.regimeTributario),
      sefaz: {
        id_csc: config.cscId ? parseInt(config.cscId, 10) : undefined,
        csc: config.cscToken || undefined,
      },
      ambiente,
    });
  }

  /**
   * Configura NF-e para a empresa na Nuvem Fiscal.
   */
  async configureNfe(
    cpfCnpj: string,
    config: { environment: string; regimeTributario?: string }
  ): Promise<any> {
    const cleanCnpj = cpfCnpj.replace(/\D/g, '');
    const ambiente = config.environment === 'production' ? 'producao' : 'homologacao';

    return this.put(`/empresas/${cleanCnpj}/nfe`, {
      CRT: this.mapCRT(config.regimeTributario),
      ambiente,
    });
  }

  /**
   * Configura NFS-e para a empresa na Nuvem Fiscal.
   *
   * O campo `rps` é obrigatório pela API.
   */
  async configureNfse(
    cpfCnpj: string,
    config: {
      environment: string;
      rpsSerie?: string;
      rpsNumero?: number;
      rpsLote?: number;
      prefeituraLogin?: string;
      prefeituraSenha?: string;
      prefeituraToken?: string;
      incentivoFiscal?: boolean;
    }
  ): Promise<any> {
    const cleanCnpj = cpfCnpj.replace(/\D/g, '');
    const ambiente = config.environment === 'production' ? 'producao' : 'homologacao';

    const body: Record<string, any> = {
      ambiente,
      rps: {
        lote: config.rpsLote || 1,
        serie: config.rpsSerie || '1',
        numero: config.rpsNumero || 1,
      },
    };

    // Prefeitura (login/senha/token) — opcional
    if (config.prefeituraLogin || config.prefeituraSenha || config.prefeituraToken) {
      body.prefeitura = {
        login: config.prefeituraLogin || undefined,
        senha: config.prefeituraSenha || undefined,
        token: config.prefeituraToken || undefined,
      };
    }

    if (config.incentivoFiscal !== undefined) {
      body.incentivo_fiscal = config.incentivoFiscal;
    }

    return this.put(`/empresas/${cleanCnpj}/nfse`, body);
  }

  // ----------------------------------------------------------
  // NFC-e
  // ----------------------------------------------------------

  /**
   * Emite uma NFC-e via Nuvem Fiscal.
   */
  async emitNfce(
    document: Record<string, any>,
    items: Record<string, any>[],
    config: Record<string, any>
  ): Promise<EmissionResult> {
    const payload = this.buildNfePayload(document, items, config, 'nfce');
    const response = await this.post<NuvemDfeResponse>('/nfce', payload);
    return this.mapDfeToEmissionResult(response);
  }

  /**
   * Consulta o status de uma NFC-e.
   */
  async consultNfce(externalId: string): Promise<EmissionResult> {
    const response = await this.get<NuvemDfeResponse>(`/nfce/${externalId}`);
    return this.mapDfeToEmissionResult(response);
  }

  /**
   * Cancela uma NFC-e autorizada.
   */
  async cancelNfce(externalId: string, justificativa: string): Promise<CancelResult> {
    const response = await this.post<NuvemCancelResponse>(`/nfce/${externalId}/cancelamento`, {
      justificativa,
    });
    return this.mapCancelResult(response);
  }

  /**
   * Baixa o PDF (DANFCE) de uma NFC-e.
   */
  async getNfcePdf(externalId: string): Promise<Buffer> {
    return this.downloadBinary(`/nfce/${externalId}/pdf`);
  }

  /**
   * Baixa o XML de uma NFC-e.
   */
  async getNfceXml(externalId: string): Promise<Buffer> {
    return this.downloadBinary(`/nfce/${externalId}/xml`);
  }

  // ----------------------------------------------------------
  // NF-e
  // ----------------------------------------------------------

  /**
   * Emite uma NF-e via Nuvem Fiscal.
   */
  async emitNfe(
    document: Record<string, any>,
    items: Record<string, any>[],
    config: Record<string, any>
  ): Promise<EmissionResult> {
    const payload = this.buildNfePayload(document, items, config, 'nfe');
    const response = await this.post<NuvemDfeResponse>('/nfe', payload);
    return this.mapDfeToEmissionResult(response);
  }

  /**
   * Consulta o status de uma NF-e.
   */
  async consultNfe(externalId: string): Promise<EmissionResult> {
    const response = await this.get<NuvemDfeResponse>(`/nfe/${externalId}`);
    return this.mapDfeToEmissionResult(response);
  }

  /**
   * Cancela uma NF-e autorizada.
   */
  async cancelNfe(externalId: string, justificativa: string): Promise<CancelResult> {
    const response = await this.post<NuvemCancelResponse>(`/nfe/${externalId}/cancelamento`, {
      justificativa,
    });
    return this.mapCancelResult(response);
  }

  /**
   * Emite carta de correção para uma NF-e.
   */
  async correctNfe(externalId: string, correcao: string): Promise<CorrectionResult> {
    const response = await this.post<NuvemCorrectionResponse>(`/nfe/${externalId}/carta-correcao`, {
      correcao,
    });
    return {
      success: response.status === 'concluido' || response.status === 'pendente',
      externalId: response.id,
      protocol: response.numero_protocolo,
      sequenceNumber: response.sequencia_evento,
      rawResponse: response,
    };
  }

  /**
   * Baixa o PDF (DANFE) de uma NF-e.
   */
  async getNfePdf(externalId: string): Promise<Buffer> {
    return this.downloadBinary(`/nfe/${externalId}/pdf`);
  }

  /**
   * Baixa o XML de uma NF-e.
   */
  async getNfeXml(externalId: string): Promise<Buffer> {
    return this.downloadBinary(`/nfe/${externalId}/xml`);
  }

  // ----------------------------------------------------------
  // NFS-e
  // ----------------------------------------------------------

  /**
   * Emite uma NFS-e via DPS na Nuvem Fiscal.
   */
  async emitNfse(
    document: Record<string, any>,
    items: Record<string, any>[],
    config: Record<string, any>
  ): Promise<EmissionResult> {
    const payload = this.buildNfsePayload(document, items, config);
    const response = await this.post<NuvemNfseResponse>('/nfse/dps', payload);
    return this.mapNfseToEmissionResult(response);
  }

  /**
   * Consulta o status de uma NFS-e.
   */
  async consultNfse(externalId: string): Promise<EmissionResult> {
    const response = await this.get<NuvemNfseResponse>(`/nfse/${externalId}`);
    return this.mapNfseToEmissionResult(response);
  }

  /**
   * Cancela uma NFS-e autorizada.
   *
   * A API NFS-e espera `codigo` e `motivo` (variam por município).
   */
  async cancelNfse(externalId: string, motivo: string, codigo?: string): Promise<CancelResult> {
    const body: Record<string, any> = { motivo };
    if (codigo) {
      body.codigo = codigo;
    }
    const response = await this.post<NuvemCancelResponse>(`/nfse/${externalId}/cancelamento`, body);
    return this.mapCancelResult(response);
  }

  /**
   * Baixa o PDF (DANFSE) de uma NFS-e.
   */
  async getNfsePdf(externalId: string): Promise<Buffer> {
    return this.downloadBinary(`/nfse/${externalId}/pdf`);
  }

  /**
   * Baixa o XML de uma NFS-e.
   */
  async getNfseXml(externalId: string): Promise<Buffer> {
    return this.downloadBinary(`/nfse/${externalId}/xml`);
  }

  // ----------------------------------------------------------
  // Unified emit / cancel / correct / consult / download
  // ----------------------------------------------------------

  /**
   * Emite um documento fiscal (NFC-e, NF-e ou NFS-e) com base no tipo.
   */
  async emit(
    documentType: string,
    document: Record<string, any>,
    items: Record<string, any>[],
    config: Record<string, any>
  ): Promise<EmissionResult> {
    switch (documentType) {
      case 'nfce':
        return this.emitNfce(document, items, config);
      case 'nfe':
        return this.emitNfe(document, items, config);
      case 'nfse':
        return this.emitNfse(document, items, config);
      default:
        throw new Error(`Tipo de documento não suportado para emissão: ${documentType}`);
    }
  }

  /**
   * Consulta um documento fiscal pelo tipo e ID externo.
   */
  async consult(documentType: string, externalId: string): Promise<EmissionResult> {
    switch (documentType) {
      case 'nfce':
        return this.consultNfce(externalId);
      case 'nfe':
        return this.consultNfe(externalId);
      case 'nfse':
        return this.consultNfse(externalId);
      default:
        throw new Error(`Tipo de documento não suportado para consulta: ${documentType}`);
    }
  }

  /**
   * Cancela um documento fiscal pelo tipo e ID externo.
   */
  async cancel(documentType: string, externalId: string, justificativa: string): Promise<CancelResult> {
    switch (documentType) {
      case 'nfce':
        return this.cancelNfce(externalId, justificativa);
      case 'nfe':
        return this.cancelNfe(externalId, justificativa);
      case 'nfse':
        return this.cancelNfse(externalId, justificativa);
      default:
        throw new Error(`Tipo de documento não suportado para cancelamento: ${documentType}`);
    }
  }

  /**
   * Baixa o PDF de um documento fiscal.
   */
  async downloadPdf(documentType: string, externalId: string): Promise<Buffer> {
    switch (documentType) {
      case 'nfce':
        return this.getNfcePdf(externalId);
      case 'nfe':
        return this.getNfePdf(externalId);
      case 'nfse':
        return this.getNfsePdf(externalId);
      default:
        throw new Error(`Tipo de documento não suportado para download de PDF: ${documentType}`);
    }
  }

  /**
   * Baixa o XML de um documento fiscal.
   */
  async downloadXml(documentType: string, externalId: string): Promise<Buffer> {
    switch (documentType) {
      case 'nfce':
        return this.getNfceXml(externalId);
      case 'nfe':
        return this.getNfeXml(externalId);
      case 'nfse':
        return this.getNfseXml(externalId);
      default:
        throw new Error(`Tipo de documento não suportado para download de XML: ${documentType}`);
    }
  }

  // ----------------------------------------------------------
  // Payload builders
  // ----------------------------------------------------------

  /**
   * Constrói o payload NfePedidoEmissao para NFC-e / NF-e conforme layout MOC 4.00.
   */
  private buildNfePayload(
    document: Record<string, any>,
    items: Record<string, any>[],
    config: Record<string, any>,
    tipo: 'nfce' | 'nfe'
  ): Record<string, any> {
    const ambiente = config.environment === 'production' ? 'producao' : 'homologacao';
    const isNfce = tipo === 'nfce';
    const mod = isNfce ? 65 : 55;

    // Modelo tributário (Simples Nacional = 1, Regime Normal = 3)
    const CRT = this.mapCRT(config.regime_tributario);

    // IDE (identificação)
    const ide: Record<string, any> = {
      natOp: document.nature_of_operation || 'Venda de mercadoria',
      mod,
      serie: document.serie,
      nNF: document.number,
      dhEmi: new Date().toISOString(),
      tpNF: 1, // 1 = saída
      idDest: 1, // 1 = operação interna
      tpImp: isNfce ? 4 : 1, // 4 = DANFCE, 1 = DANFE retrato
      tpEmis: 1, // 1 = emissão normal
      finNFe: 1, // 1 = NF-e normal
      indFinal: isNfce ? 1 : (document.recipient_document_type === 'cpf' ? 1 : 0),
      indPres: isNfce ? 1 : 0, // 1 = presencial
      procEmi: 0, // 0 = emissão por aplicativo contribuinte
      verProc: 'Fingestor 1.0',
    };

    // Emitente
    const emit: Record<string, any> = {
      CNPJ: (config.emitente_cnpj || '').replace(/\D/g, ''),
      xNome: config.emitente_razao_social || '',
      xFant: config.emitente_nome_fantasia || config.emitente_razao_social || '',
      IE: (config.emitente_ie || '').replace(/\D/g, '') || undefined,
      CRT,
    };

    // Destinatário (opcional para NFC-e se valor < 200)
    let dest: Record<string, any> | undefined;
    const recipientDoc = (document.recipient_document || '').replace(/\D/g, '');
    if (recipientDoc) {
      const isDocCpf = recipientDoc.length <= 11;
      dest = {
        [isDocCpf ? 'CPF' : 'CNPJ']: recipientDoc,
        xNome: document.recipient_name || undefined,
        indIEDest: isNfce ? 9 : 9, // 9 = não contribuinte
      };

      if (document.recipient_address && Object.keys(document.recipient_address).length > 0) {
        const addr = document.recipient_address;
        dest.enderDest = {
          xLgr: addr.street || addr.logradouro || '',
          nro: addr.number || addr.numero || 'S/N',
          xBairro: addr.neighborhood || addr.bairro || '',
          cMun: addr.city_code || addr.codigo_municipio || '',
          xMun: addr.city || addr.municipio || '',
          UF: addr.state || addr.uf || '',
          CEP: (addr.zip_code || addr.cep || '').replace(/\D/g, '') || undefined,
          cPais: '1058',
          xPais: 'Brasil',
        };
      }
    }

    // Detalhes dos itens
    const det = items.map((item, index) => {
      const prod: Record<string, any> = {
        cProd: item.product_service_id || item.id || `ITEM${index + 1}`,
        cEAN: 'SEM GTIN',
        xProd: item.name,
        NCM: (item.ncm || '00000000').replace(/\D/g, ''),
        CFOP: (item.cfop || '5102').replace(/\D/g, ''),
        uCom: item.unit || 'UN',
        qCom: item.quantity,
        vUnCom: item.unit_price,
        vProd: item.total_amount + (item.discount_amount || 0),
        cEANTrib: 'SEM GTIN',
        uTrib: item.unit || 'UN',
        qTrib: item.quantity,
        vUnTrib: item.unit_price,
        indTot: 1,
        vDesc: item.discount_amount > 0 ? item.discount_amount : undefined,
        CEST: item.cest ? item.cest.replace(/\D/g, '') : undefined,
      };

      // Impostos do item
      const imposto: Record<string, any> = {};

      // ICMS
      if (CRT === 1) {
        // Simples Nacional → ICMSSN
        imposto.ICMS = {
          [`ICMSSN${item.icms_csosn || '102'}`]: {
            orig: item.icms_origin ?? 0,
            CSOSN: item.icms_csosn || '102',
          },
        };
      } else {
        // Regime Normal → ICMS
        const cst = item.icms_cst || '00';
        imposto.ICMS = {
          [`ICMS${cst}`]: {
            orig: item.icms_origin ?? 0,
            CST: cst,
            modBC: 3,
            vBC: item.icms_base || 0,
            pICMS: item.icms_aliquota || 0,
            vICMS: item.icms_value || 0,
          },
        };
      }

      // PIS
      imposto.PIS = {
        PISAliq: {
          CST: item.pis_cst || '01',
          vBC: item.pis_base || 0,
          pPIS: item.pis_aliquota || 0,
          vPIS: item.pis_value || 0,
        },
      };

      // COFINS
      imposto.COFINS = {
        COFINSAliq: {
          CST: item.cofins_cst || '01',
          vBC: item.cofins_base || 0,
          pCOFINS: item.cofins_aliquota || 0,
          vCOFINS: item.cofins_value || 0,
        },
      };

      return {
        nItem: index + 1,
        prod,
        imposto,
      };
    });

    // Totais
    const ICMSTot: Record<string, any> = {
      vBC: document.icms_base || 0,
      vICMS: document.icms_value || 0,
      vICMSDeson: 0,
      vFCP: 0,
      vBCST: document.icms_st_base || 0,
      vST: document.icms_st_value || 0,
      vFCPST: 0,
      vFCPSTRet: 0,
      vProd: (document.subtotal || 0) + (document.discount_amount || 0),
      vFrete: 0,
      vSeg: 0,
      vDesc: document.discount_amount || 0,
      vII: 0,
      vIPI: document.ipi_value || 0,
      vIPIDevol: 0,
      vPIS: document.pis_value || 0,
      vCOFINS: document.cofins_value || 0,
      vOutro: 0,
      vNF: document.total_amount || 0,
    };

    // Transporte
    const transp: Record<string, any> = {
      modFrete: 9, // 9 = sem frete
    };

    // Pagamento
    const pag: Record<string, any> = {
      detPag: [
        {
          tPag: isNfce ? '01' : '99', // 01=dinheiro, 99=outros
          vPag: document.total_amount || 0,
        },
      ],
    };

    // Informações adicionais
    const infAdic: Record<string, any> | undefined = document.additional_info
      ? { infCpl: document.additional_info }
      : undefined;

    // Montar payload final
    const infNFe: Record<string, any> = {
      versao: '4.00',
      ide,
      emit,
      det,
      total: { ICMSTot },
      transp,
      pag,
    };

    if (dest) {
      infNFe.dest = dest;
    }

    if (infAdic) {
      infNFe.infAdic = infAdic;
    }

    return {
      ambiente,
      infNFe,
    };
  }

  /**
   * Constrói o payload para emissão de NFS-e via DPS.
   */
  private buildNfsePayload(
    document: Record<string, any>,
    items: Record<string, any>[],
    config: Record<string, any>
  ): Record<string, any> {
    const ambiente = config.environment === 'production' ? 'producao' : 'homologacao';
    const cnpj = (config.emitente_cnpj || '').replace(/\D/g, '');

    // Serviço: consolidar valores dos itens
    const totalServicos = document.total_amount || 0;
    const issAliquota = document.iss_aliquota || config.nfse_aliquota_iss || 0;
    const issValue = document.iss_value || (totalServicos * issAliquota) / 100;

    // Descrição: juntar descripções dos itens ou usar campo dedicado
    const descricaoServico =
      document.service_description ||
      items.map((i) => `${i.name} (${i.quantity}x R$${i.unit_price})`).join('; ') ||
      'Prestação de serviço';

    const payload: Record<string, any> = {
      ambiente,
      infDPS: {
        tpAmb: ambiente === 'producao' ? 1 : 2,
        dhEmi: new Date().toISOString(),
        verAplic: 'Fingestor 1.0',
        serie: document.serie?.toString() || '1',
        nDPS: document.number?.toString() || '1',
        dCompet: new Date().toISOString().slice(0, 10),
        prest: {
          CNPJ: cnpj,
          xNome: config.emitente_razao_social || '',
          IM: (config.emitente_im || '').replace(/\D/g, '') || undefined,
        },
        serv: {
          cServ: {
            cTribNac: document.service_code || config.nfse_municipal_code || '',
            xDescServ: descricaoServico,
            CNAE: (document.cnae_code || config.nfse_cnae || '').replace(/\D/g, '') || undefined,
          },
          vServPrest: {
            vReceb: totalServicos,
          },
          trib: {
            totTrib: {
              vTotTribFed: (document.pis_value || 0) + (document.cofins_value || 0),
              vTotTribMun: issValue,
            },
            ISS: {
              aliq: issAliquota / 100, // API espera decimal (0.05 = 5%)
              vCalcISS: totalServicos,
              vISS: issValue,
            },
          },
        },
      },
    };

    // Tomador (destinatário)
    const recipientDoc = (document.recipient_document || '').replace(/\D/g, '');
    if (recipientDoc) {
      const isCpf = recipientDoc.length <= 11;
      payload.infDPS.toma = {
        [isCpf ? 'CPF' : 'CNPJ']: recipientDoc,
        xNome: document.recipient_name || undefined,
      };
    }

    return payload;
  }

  // ----------------------------------------------------------
  // Response mappers
  // ----------------------------------------------------------

  /**
   * Mapeia resposta da Nuvem Fiscal (NFC-e/NF-e) para resultado unificado.
   */
  private mapDfeToEmissionResult(response: NuvemDfeResponse): EmissionResult {
    return {
      success: response.status === 'autorizado',
      externalId: response.id,
      status: this.mapDfeStatus(response.status),
      accessKey: response.chave,
      protocol: response.numero_protocolo,
      statusReason: response.motivo_status,
      statusCode: response.codigo_status?.toString(),
      xml: response.xml,
      rawResponse: response,
    };
  }

  /**
   * Mapeia resposta da Nuvem Fiscal (NFS-e) para resultado unificado.
   */
  private mapNfseToEmissionResult(response: NuvemNfseResponse): EmissionResult {
    return {
      success: response.status === 'autorizada',
      externalId: response.id,
      status: this.mapNfseStatus(response.status),
      accessKey: response.codigo_verificacao,
      protocol: response.numero,
      statusReason: response.mensagens?.[0]?.descricao,
      statusCode: response.mensagens?.[0]?.codigo,
      xml: response.xml,
      rawResponse: response,
    };
  }

  /**
   * Mapeia resultado de cancelamento.
   */
  private mapCancelResult(response: NuvemCancelResponse): CancelResult {
    return {
      success: response.status === 'concluido' || response.status === 'pendente',
      externalId: response.id,
      protocol: response.numero_protocolo,
      statusReason: response.justificativa,
      rawResponse: response,
    };
  }

  // ----------------------------------------------------------
  // Status mappers
  // ----------------------------------------------------------

  /**
   * Mapeia status da Nuvem Fiscal (NFC-e/NF-e) para status Fingestor.
   */
  private mapDfeStatus(nuvemStatus: NuvemDfeStatus): FingestorFiscalStatus {
    switch (nuvemStatus) {
      case 'pendente':
        return 'processing';
      case 'autorizado':
        return 'authorized';
      case 'rejeitado':
        return 'rejected';
      case 'cancelado':
        return 'cancelled';
      case 'denegado':
        return 'denied';
      case 'erro':
        return 'rejected';
      default:
        return 'processing';
    }
  }

  /**
   * Mapeia status da Nuvem Fiscal (NFS-e) para status Fingestor.
   */
  private mapNfseStatus(nuvemStatus: NuvemNfseStatus): FingestorFiscalStatus {
    switch (nuvemStatus) {
      case 'processando':
        return 'processing';
      case 'autorizada':
        return 'authorized';
      case 'negada':
        return 'rejected';
      case 'cancelada':
        return 'cancelled';
      case 'substituida':
        return 'cancelled';
      case 'erro':
        return 'rejected';
      default:
        return 'processing';
    }
  }

  /**
   * Mapeia CRT (Código de Regime Tributário) do Fingestor para o valor numérico.
   */
  private mapCRT(regimeTributario?: string): number {
    switch (regimeTributario) {
      case 'simples_nacional':
      case 'mei':
        return 1; // Simples Nacional
      case 'simples_nacional_excesso':
        return 2; // Simples Nacional – excesso de sublimite
      case 'regime_normal':
        return 3; // Regime Normal
      default:
        return 1; // Default: Simples Nacional
    }
  }

  // ----------------------------------------------------------
  // Estado
  // ----------------------------------------------------------

  /**
   * Verifica se o serviço está configurado com credenciais válidas.
   */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }
}

export default new NuvemFiscalService();

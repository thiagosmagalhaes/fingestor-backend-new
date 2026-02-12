// Types para o sistema fiscal (NFC-e, NFS-e, NF-e)

// ===== Enums =====

export type FiscalDocumentType = 'nfce' | 'nfse' | 'nfe';

export type FiscalDocumentStatus =
  | 'draft'
  | 'pending'
  | 'processing'
  | 'authorized'
  | 'rejected'
  | 'denied'
  | 'cancelled'
  | 'corrected';

export type FiscalEnvironment = 'production' | 'homologation';

export type FiscalTaxRegime =
  | 'simples_nacional'
  | 'simples_nacional_excesso'
  | 'regime_normal'
  | 'mei';

// ===== Fiscal Config =====

export interface FiscalConfig {
  id: string;
  company_id: string;
  environment: FiscalEnvironment;

  // Certificado Digital
  // certificate_data: Binário do certificado digital (.pfx ou .p12) codificado em base64
  certificate_data?: string;
  // certificate_password: Senha do certificado (armazenada criptografada no banco)
  certificate_password?: string;
  certificate_expires_at?: string;
  certificate_subject?: string;

  // CSC (NFC-e)
  csc_id?: string;
  csc_token?: string;

  // NFC-e
  nfce_enabled: boolean;
  nfce_serie: number;
  nfce_next_number: number;

  // NFS-e
  nfse_enabled: boolean;
  nfse_serie: number;
  nfse_next_number: number;
  nfse_rps_serie?: string;
  nfse_municipal_code?: string;
  nfse_cnae?: string;
  nfse_aliquota_iss: number;

  // NF-e
  nfe_enabled: boolean;
  nfe_serie: number;
  nfe_next_number: number;

  // Emitente
  emitente_razao_social?: string;
  emitente_nome_fantasia?: string;
  emitente_cnpj?: string;
  emitente_ie?: string;
  emitente_im?: string;
  emitente_email?: string;
  emitente_fone?: string;

  // Configurações gerais
  auto_emit_on_sale: boolean;
  default_document_type: FiscalDocumentType;

  created_at: string;
  updated_at: string;
}

export interface CreateFiscalConfigRequest {
  companyId: string;
  environment?: FiscalEnvironment;
  certificateData?: string;
  certificatePassword?: string;
  cscId?: string;
  cscToken?: string;
  nfceEnabled?: boolean;
  nfceSerie?: number;
  nfseEnabled?: boolean;
  nfseSerie?: number;
  nfseRpsSerie?: string;
  nfseMunicipalCode?: string;
  nfseCnae?: string;
  nfseAliquotaIss?: number;
  nfeEnabled?: boolean;
  nfeSerie?: number;
  emitenteRazaoSocial?: string;
  emitenteNomeFantasia?: string;
  emitenteCnpj?: string;
  emitenteIe?: string;
  emitenteIm?: string;
  emitenteEmail?: string;
  emitenteFone?: string;
  enderecoFiscal?: {
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
    codigoMunicipio?: string;
    codigoPais?: string;
    pais?: string;
  };
  regimeTributario?: FiscalTaxRegime;
  codigoMunicipio?: string;
  uf?: string;
  autoEmitOnSale?: boolean;
  defaultDocumentType?: FiscalDocumentType;
}

export interface UpdateFiscalConfigRequest extends Partial<CreateFiscalConfigRequest> {}

// ===== Fiscal Document =====

export interface FiscalDocument {
  id: string;
  company_id: string;
  document_type: FiscalDocumentType;
  status: FiscalDocumentStatus;
  environment: FiscalEnvironment;
  serie: number;
  number: number;
  access_key?: string;
  authorization_protocol?: string;
  authorization_date?: string;

  // RPS (NFS-e)
  rps_number?: number;
  rps_serie?: string;
  rps_type?: number;

  // Vínculos
  sale_id?: string;
  budget_id?: string;

  // Destinatário
  recipient_name?: string;
  recipient_document?: string;
  recipient_document_type?: string;
  recipient_email?: string;
  recipient_phone?: string;
  recipient_address?: Record<string, any>;

  // Valores
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;

  // Impostos detalhados
  icms_base: number;
  icms_value: number;
  icms_st_base: number;
  icms_st_value: number;
  pis_value: number;
  cofins_value: number;
  iss_value: number;
  iss_aliquota: number;
  ipi_value: number;
  ir_value: number;
  csll_value: number;
  inss_value: number;

  // Informações complementares
  nature_of_operation?: string;
  additional_info?: string;
  fiscal_notes?: string;

  // NFS-e específico
  service_code?: string;
  cnae_code?: string;
  city_service_code?: string;
  service_description?: string;

  // XML/PDF
  xml_content?: string;
  xml_signed?: string;
  xml_protocol?: string;
  pdf_url?: string;
  cancel_xml?: string;
  correction_xml?: string;

  // Cancelamento
  cancelled_at?: string;
  cancellation_reason?: string;
  cancellation_protocol?: string;

  // Carta de correção
  correction_text?: string;
  correction_sequence: number;
  corrected_at?: string;

  // Erros
  rejection_code?: string;
  rejection_message?: string;

  metadata?: Record<string, any>;
  created_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface FiscalDocumentItem {
  id: string;
  fiscal_document_id: string;
  product_service_id?: string;
  sale_item_id?: string;
  item_number: number;
  name: string;
  description?: string;
  ncm?: string;
  cest?: string;
  cfop: string;
  unit: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  total_amount: number;

  // ICMS
  icms_origin: number;
  icms_cst?: string;
  icms_csosn?: string;
  icms_base: number;
  icms_aliquota: number;
  icms_value: number;

  // PIS
  pis_cst?: string;
  pis_base: number;
  pis_aliquota: number;
  pis_value: number;

  // COFINS
  cofins_cst?: string;
  cofins_base: number;
  cofins_aliquota: number;
  cofins_value: number;

  // IPI
  ipi_cst?: string;
  ipi_base: number;
  ipi_aliquota: number;
  ipi_value: number;

  // ISS
  iss_base: number;
  iss_aliquota: number;
  iss_value: number;

  metadata?: Record<string, any>;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FiscalDocumentEvent {
  id: string;
  fiscal_document_id: string;
  event_type: string;
  old_status?: FiscalDocumentStatus;
  new_status: FiscalDocumentStatus;
  description?: string;
  error_code?: string;
  error_message?: string;
  protocol?: string;
  response_data?: Record<string, any>;
  created_by?: string;
  created_at: string;
}

// ===== Request Types =====

export interface CreateFiscalDocumentRequest {
  companyId: string;
  documentType: FiscalDocumentType;
  saleId?: string;
  budgetId?: string;

  // Destinatário
  recipientName?: string;
  recipientDocument?: string;
  recipientDocumentType?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientAddress?: Record<string, any>;

  // Valores (se não vinculado a venda)
  subtotal?: number;
  discountAmount?: number;
  taxAmount?: number;
  totalAmount?: number;

  // Informações complementares
  natureOfOperation?: string;
  additionalInfo?: string;
  fiscalNotes?: string;

  // NFS-e
  serviceCode?: string;
  cnaeCode?: string;
  cityServiceCode?: string;
  serviceDescription?: string;

  // Itens (se não vinculado a venda)
  items?: CreateFiscalDocumentItemRequest[];
}

export interface CreateFiscalDocumentItemRequest {
  productServiceId?: string;
  saleItemId?: string;
  name: string;
  description?: string;
  ncm?: string;
  cest?: string;
  cfop: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;

  // ICMS
  icmsOrigin?: number;
  icmsCst?: string;
  icmsCsosn?: string;
  icmsAliquota?: number;

  // PIS
  pisCst?: string;
  pisAliquota?: number;

  // COFINS
  cofinsCst?: string;
  cofinsAliquota?: number;

  // ISS (NFS-e)
  issAliquota?: number;
}

export interface CancelFiscalDocumentRequest {
  reason: string;
}

export interface CorrectFiscalDocumentRequest {
  correctionText: string;
}

export interface FiscalDocumentFilters {
  companyId: string;
  documentType?: FiscalDocumentType;
  status?: FiscalDocumentStatus;
  from?: string;
  to?: string;
  saleId?: string;
  search?: string;
}

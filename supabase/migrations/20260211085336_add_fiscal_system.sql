-- =====================================================
-- FISCAL SYSTEM MIGRATION
-- Adds fiscal document management (NFC-e, NFS-e, NF-e)
-- =====================================================

-- 1. NEW ENUM TYPES
-- -----------------

-- Tipo de documento fiscal
CREATE TYPE public.fiscal_document_type AS ENUM (
  'nfce',   -- Nota Fiscal de Consumidor Eletrônica
  'nfse',   -- Nota Fiscal de Serviço Eletrônica
  'nfe'     -- Nota Fiscal Eletrônica (modelo 55)
);

-- Status do documento fiscal
CREATE TYPE public.fiscal_document_status AS ENUM (
  'draft',       -- Rascunho, ainda não transmitido
  'pending',     -- Aguardando transmissão
  'processing',  -- Em processamento na SEFAZ/Prefeitura
  'authorized',  -- Autorizado
  'rejected',    -- Rejeitado pela SEFAZ/Prefeitura
  'denied',      -- Denegado
  'cancelled',   -- Cancelado
  'corrected'    -- Carta de Correção emitida
);

-- Ambiente fiscal
CREATE TYPE public.fiscal_environment AS ENUM (
  'production',    -- Ambiente de produção
  'homologation'   -- Ambiente de homologação (testes)
);

-- Regime tributário
CREATE TYPE public.fiscal_tax_regime AS ENUM (
  'simples_nacional',            -- Simples Nacional
  'simples_nacional_excesso',    -- Simples Nacional - Excesso de sublimite de receita bruta
  'regime_normal',               -- Regime Normal (Lucro Presumido / Lucro Real)
  'mei'                          -- Microempreendedor Individual
);


-- 2. ALTER EXISTING TABLES
-- ------------------------

-- Adicionar campos fiscais à tabela companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS inscricao_estadual VARCHAR(20),
  ADD COLUMN IF NOT EXISTS inscricao_municipal VARCHAR(20),
  ADD COLUMN IF NOT EXISTS regime_tributario public.fiscal_tax_regime,
  ADD COLUMN IF NOT EXISTS endereco_fiscal JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS codigo_municipio VARCHAR(10),
  ADD COLUMN IF NOT EXISTS uf VARCHAR(2);

COMMENT ON COLUMN public.companies.endereco_fiscal IS 'Endereço fiscal: { logradouro, numero, complemento, bairro, cidade, uf, cep, codigo_municipio, codigo_pais, pais }';

-- Expandir check de sequence_type para suportar sequências fiscais
ALTER TABLE public.number_sequences 
  DROP CONSTRAINT IF EXISTS number_sequences_sequence_type_check;

ALTER TABLE public.number_sequences
  ADD CONSTRAINT number_sequences_sequence_type_check 
  CHECK (sequence_type IN ('budget', 'sale', 'fiscal_nfce', 'fiscal_nfse', 'fiscal_nfe'));

-- Adicionar fiscal_document_id na tabela sales para vincular venda ao documento fiscal
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS fiscal_document_id UUID;


-- 3. NEW TABLES
-- -------------

-- Configuração fiscal por empresa
CREATE TABLE public.fiscal_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Ambiente
  environment public.fiscal_environment DEFAULT 'homologation' NOT NULL,
  
  -- Certificado Digital
  -- certificate_data: Binário do certificado (.pfx ou .p12) codificado em base64
  -- certificate_password: Senha do certificado (armazenada criptografada usando AES-256-CBC)
  certificate_data TEXT,
  certificate_password TEXT,
  certificate_expires_at TIMESTAMPTZ,
  certificate_subject TEXT,
  
  -- CSC (Código de Segurança do Contribuinte) para NFC-e
  csc_id VARCHAR(10),
  csc_token VARCHAR(100),
  
  -- Configurações NFC-e
  nfce_enabled BOOLEAN DEFAULT false NOT NULL,
  nfce_serie INTEGER DEFAULT 1,
  nfce_next_number INTEGER DEFAULT 1,
  
  -- Configurações NFS-e
  nfse_enabled BOOLEAN DEFAULT false NOT NULL,
  nfse_serie INTEGER DEFAULT 1,
  nfse_next_number INTEGER DEFAULT 1,
  nfse_rps_serie VARCHAR(10) DEFAULT '1',
  nfse_municipal_code VARCHAR(50),
  nfse_cnae VARCHAR(10),
  nfse_aliquota_iss NUMERIC(5,2) DEFAULT 0,
  
  -- Configurações NF-e
  nfe_enabled BOOLEAN DEFAULT false NOT NULL,
  nfe_serie INTEGER DEFAULT 1,
  nfe_next_number INTEGER DEFAULT 1,
  
  -- Dados do emitente (podem sobrescrever dados da company)
  emitente_razao_social VARCHAR(255),
  emitente_nome_fantasia VARCHAR(255),
  emitente_cnpj VARCHAR(18),
  emitente_ie VARCHAR(20),
  emitente_im VARCHAR(20),
  
  -- Configurações gerais
  auto_emit_on_sale BOOLEAN DEFAULT false,
  default_document_type public.fiscal_document_type DEFAULT 'nfce',
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  CONSTRAINT fiscal_config_company_unique UNIQUE (company_id)
);

COMMENT ON TABLE public.fiscal_config IS 'Configuração fiscal por empresa para emissão de NFC-e, NFS-e e NF-e';


-- Documentos fiscais emitidos
CREATE TABLE public.fiscal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Tipo e identificação
  document_type public.fiscal_document_type NOT NULL,
  status public.fiscal_document_status DEFAULT 'draft' NOT NULL,
  environment public.fiscal_environment DEFAULT 'homologation' NOT NULL,
  
  -- Numeração
  serie INTEGER NOT NULL,
  number INTEGER NOT NULL,
  
  -- Chave de acesso (44 dígitos para NF-e/NFC-e)
  access_key VARCHAR(44),
  
  -- Protocolo de autorização
  authorization_protocol VARCHAR(50),
  authorization_date TIMESTAMPTZ,
  
  -- RPS (para NFS-e)
  rps_number INTEGER,
  rps_serie VARCHAR(10),
  rps_type INTEGER DEFAULT 1,
  
  -- Vínculo com venda/orçamento
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  budget_id UUID REFERENCES public.budgets(id) ON DELETE SET NULL,
  
  -- Dados do destinatário/tomador
  recipient_name VARCHAR(255),
  recipient_document VARCHAR(18),
  recipient_document_type VARCHAR(10),
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(20),
  recipient_address JSONB DEFAULT '{}',
  
  -- Valores
  subtotal NUMERIC(15,2) DEFAULT 0 NOT NULL,
  discount_amount NUMERIC(15,2) DEFAULT 0,
  tax_amount NUMERIC(15,2) DEFAULT 0,
  total_amount NUMERIC(15,2) DEFAULT 0 NOT NULL,
  
  -- Impostos detalhados
  icms_base NUMERIC(15,2) DEFAULT 0,
  icms_value NUMERIC(15,2) DEFAULT 0,
  icms_st_base NUMERIC(15,2) DEFAULT 0,
  icms_st_value NUMERIC(15,2) DEFAULT 0,
  pis_value NUMERIC(15,2) DEFAULT 0,
  cofins_value NUMERIC(15,2) DEFAULT 0,
  iss_value NUMERIC(15,2) DEFAULT 0,
  iss_aliquota NUMERIC(5,2) DEFAULT 0,
  ipi_value NUMERIC(15,2) DEFAULT 0,
  ir_value NUMERIC(15,2) DEFAULT 0,
  csll_value NUMERIC(15,2) DEFAULT 0,
  inss_value NUMERIC(15,2) DEFAULT 0,
  
  -- Informações complementares
  nature_of_operation VARCHAR(255) DEFAULT 'Venda de mercadoria',
  additional_info TEXT,
  fiscal_notes TEXT,
  
  -- NFS-e específico
  service_code VARCHAR(20),
  cnae_code VARCHAR(10),
  city_service_code VARCHAR(20),
  service_description TEXT,
  
  -- XML e PDF
  xml_content TEXT,
  xml_signed TEXT,
  xml_protocol TEXT,
  pdf_url TEXT,
  cancel_xml TEXT,
  correction_xml TEXT,
  
  -- Cancelamento
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancellation_protocol VARCHAR(50),
  
  -- Carta de correção
  correction_text TEXT,
  correction_sequence INTEGER DEFAULT 0,
  corrected_at TIMESTAMPTZ,
  
  -- Erros
  rejection_code VARCHAR(10),
  rejection_message TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT fiscal_documents_unique_number UNIQUE (company_id, document_type, serie, number)
);

COMMENT ON TABLE public.fiscal_documents IS 'Documentos fiscais emitidos (NFC-e, NFS-e, NF-e) com dados fiscais completos';


-- Itens do documento fiscal
CREATE TABLE public.fiscal_document_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_document_id UUID NOT NULL REFERENCES public.fiscal_documents(id) ON DELETE CASCADE,
  
  -- Vínculo com produto e item da venda
  product_service_id UUID REFERENCES public.products_services(id) ON DELETE SET NULL,
  sale_item_id UUID REFERENCES public.sale_items(id) ON DELETE SET NULL,
  
  -- Dados do item
  item_number INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  ncm VARCHAR(10),
  cest VARCHAR(10),
  cfop VARCHAR(4) NOT NULL,
  unit VARCHAR(10) DEFAULT 'UN' NOT NULL,
  
  -- Valores
  quantity NUMERIC(15,3) DEFAULT 1 NOT NULL,
  unit_price NUMERIC(15,4) NOT NULL,
  discount_amount NUMERIC(15,2) DEFAULT 0,
  total_amount NUMERIC(15,2) NOT NULL,
  
  -- ICMS
  icms_origin INTEGER DEFAULT 0,
  icms_cst VARCHAR(3),
  icms_csosn VARCHAR(4),
  icms_base NUMERIC(15,2) DEFAULT 0,
  icms_aliquota NUMERIC(5,2) DEFAULT 0,
  icms_value NUMERIC(15,2) DEFAULT 0,
  
  -- PIS
  pis_cst VARCHAR(2),
  pis_base NUMERIC(15,2) DEFAULT 0,
  pis_aliquota NUMERIC(7,4) DEFAULT 0,
  pis_value NUMERIC(15,2) DEFAULT 0,
  
  -- COFINS
  cofins_cst VARCHAR(2),
  cofins_base NUMERIC(15,2) DEFAULT 0,
  cofins_aliquota NUMERIC(7,4) DEFAULT 0,
  cofins_value NUMERIC(15,2) DEFAULT 0,
  
  -- IPI (NF-e)
  ipi_cst VARCHAR(2),
  ipi_base NUMERIC(15,2) DEFAULT 0,
  ipi_aliquota NUMERIC(5,2) DEFAULT 0,
  ipi_value NUMERIC(15,2) DEFAULT 0,
  
  -- ISS (NFS-e)
  iss_base NUMERIC(15,2) DEFAULT 0,
  iss_aliquota NUMERIC(5,2) DEFAULT 0,
  iss_value NUMERIC(15,2) DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Audit
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.fiscal_document_items IS 'Itens dos documentos fiscais com tributação detalhada por item';


-- Histórico de eventos dos documentos fiscais
CREATE TABLE public.fiscal_document_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_document_id UUID NOT NULL REFERENCES public.fiscal_documents(id) ON DELETE CASCADE,
  
  -- Evento
  event_type VARCHAR(50) NOT NULL,
  old_status public.fiscal_document_status,
  new_status public.fiscal_document_status NOT NULL,
  
  -- Detalhes
  description TEXT,
  error_code VARCHAR(10),
  error_message TEXT,
  protocol VARCHAR(50),
  
  -- Dados da resposta da SEFAZ/Prefeitura
  response_data JSONB DEFAULT '{}',
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.fiscal_document_events IS 'Log de todos os eventos e mudanças de status de documentos fiscais';


-- 4. FK: sales -> fiscal_documents
ALTER TABLE public.sales
  ADD CONSTRAINT sales_fiscal_document_id_fkey 
  FOREIGN KEY (fiscal_document_id) REFERENCES public.fiscal_documents(id) ON DELETE SET NULL;


-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_fiscal_documents_company_id ON public.fiscal_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_documents_sale_id ON public.fiscal_documents(sale_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_documents_status ON public.fiscal_documents(status);
CREATE INDEX IF NOT EXISTS idx_fiscal_documents_document_type ON public.fiscal_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_fiscal_documents_access_key ON public.fiscal_documents(access_key);
CREATE INDEX IF NOT EXISTS idx_fiscal_documents_created_at ON public.fiscal_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fiscal_document_items_document_id ON public.fiscal_document_items(fiscal_document_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_document_events_document_id ON public.fiscal_document_events(fiscal_document_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_config_company_id ON public.fiscal_config(company_id);


-- 6. ROW LEVEL SECURITY
-- Enable RLS
ALTER TABLE public.fiscal_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_document_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_document_events ENABLE ROW LEVEL SECURITY;

-- fiscal_config: Pattern B (company-scoped)
CREATE POLICY "Users can view own company fiscal config"
  ON public.fiscal_config FOR SELECT
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own company fiscal config"
  ON public.fiscal_config FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own company fiscal config"
  ON public.fiscal_config FOR UPDATE
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own company fiscal config"
  ON public.fiscal_config FOR DELETE
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- fiscal_documents: Pattern B (company-scoped)
CREATE POLICY "Users can view own company fiscal documents"
  ON public.fiscal_documents FOR SELECT
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own company fiscal documents"
  ON public.fiscal_documents FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own company fiscal documents"
  ON public.fiscal_documents FOR UPDATE
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own company fiscal documents"
  ON public.fiscal_documents FOR DELETE
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- fiscal_document_items: Pattern C (via parent fiscal_documents)
CREATE POLICY "Users can view own fiscal document items"
  ON public.fiscal_document_items FOR SELECT
  USING (fiscal_document_id IN (
    SELECT fd.id FROM public.fiscal_documents fd
    JOIN public.companies c ON fd.company_id = c.id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own fiscal document items"
  ON public.fiscal_document_items FOR INSERT
  WITH CHECK (fiscal_document_id IN (
    SELECT fd.id FROM public.fiscal_documents fd
    JOIN public.companies c ON fd.company_id = c.id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own fiscal document items"
  ON public.fiscal_document_items FOR UPDATE
  USING (fiscal_document_id IN (
    SELECT fd.id FROM public.fiscal_documents fd
    JOIN public.companies c ON fd.company_id = c.id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own fiscal document items"
  ON public.fiscal_document_items FOR DELETE
  USING (fiscal_document_id IN (
    SELECT fd.id FROM public.fiscal_documents fd
    JOIN public.companies c ON fd.company_id = c.id
    WHERE c.user_id = auth.uid()
  ));

-- fiscal_document_events: Pattern C (via parent fiscal_documents)
CREATE POLICY "Users can view own fiscal document events"
  ON public.fiscal_document_events FOR SELECT
  USING (fiscal_document_id IN (
    SELECT fd.id FROM public.fiscal_documents fd
    JOIN public.companies c ON fd.company_id = c.id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own fiscal document events"
  ON public.fiscal_document_events FOR INSERT
  WITH CHECK (fiscal_document_id IN (
    SELECT fd.id FROM public.fiscal_documents fd
    JOIN public.companies c ON fd.company_id = c.id
    WHERE c.user_id = auth.uid()
  ));


-- 7. HELPER FUNCTION: Generate next fiscal number
CREATE OR REPLACE FUNCTION public.generate_fiscal_number(
  p_company_id UUID,
  p_document_type public.fiscal_document_type
) RETURNS TABLE(next_number INTEGER, serie INTEGER)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_config RECORD;
  v_next INTEGER;
  v_serie INTEGER;
BEGIN
  SELECT * INTO v_config
  FROM public.fiscal_config
  WHERE company_id = p_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Configuração fiscal não encontrada para a empresa';
  END IF;

  CASE p_document_type
    WHEN 'nfce' THEN
      v_serie := v_config.nfce_serie;
      v_next := v_config.nfce_next_number;
      UPDATE public.fiscal_config
        SET nfce_next_number = nfce_next_number + 1, updated_at = NOW()
        WHERE company_id = p_company_id;
    WHEN 'nfse' THEN
      v_serie := v_config.nfse_serie;
      v_next := v_config.nfse_next_number;
      UPDATE public.fiscal_config
        SET nfse_next_number = nfse_next_number + 1, updated_at = NOW()
        WHERE company_id = p_company_id;
    WHEN 'nfe' THEN
      v_serie := v_config.nfe_serie;
      v_next := v_config.nfe_next_number;
      UPDATE public.fiscal_config
        SET nfe_next_number = nfe_next_number + 1, updated_at = NOW()
        WHERE company_id = p_company_id;
  END CASE;

  next_number := v_next;
  serie := v_serie;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.generate_fiscal_number IS 'Gera o próximo número fiscal para o tipo de documento, incrementando automaticamente o contador na config';


-- 8. TRIGGERS: Update updated_at on fiscal tables
CREATE OR REPLACE FUNCTION public.update_fiscal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fiscal_config_updated_at
  BEFORE UPDATE ON public.fiscal_config
  FOR EACH ROW EXECUTE FUNCTION public.update_fiscal_updated_at();

CREATE TRIGGER fiscal_documents_updated_at
  BEFORE UPDATE ON public.fiscal_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_fiscal_updated_at();

CREATE TRIGGER fiscal_document_items_updated_at
  BEFORE UPDATE ON public.fiscal_document_items
  FOR EACH ROW EXECUTE FUNCTION public.update_fiscal_updated_at();

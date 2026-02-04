-- Drop existing function if exists
DROP FUNCTION IF EXISTS public.get_credit_card_statement(UUID, UUID, DATE);

-- Create RPC function to get credit card statement transactions
-- Regra: closing_day = 5 em fevereiro/2026 busca transações de 05/jan/2026 até 04/fev/2026
-- p_company_id: obrigatório
-- p_credit_card_id: opcional (se NULL, retorna de todos os cartões)
-- p_reference_date: opcional (se NULL, usa mês/ano atual de São Paulo)
CREATE OR REPLACE FUNCTION public.get_credit_card_statement(
  p_company_id UUID,
  p_credit_card_id UUID DEFAULT NULL,
  p_reference_date DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reference_date DATE;
  v_reference_month INTEGER;
  v_reference_year INTEGER;
  v_result JSON;
BEGIN
  -- Se não passou reference_date, usar mês/ano atual (timezone São Paulo)
  v_reference_date := COALESCE(
    p_reference_date, 
    (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::DATE
  );
  
  -- Extrair mês e ano da data de referência
  v_reference_month := EXTRACT(MONTH FROM v_reference_date);
  v_reference_year := EXTRACT(YEAR FROM v_reference_date);

  -- Buscar transações dos cartões com base no período calculado
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'creditCardId', card_data.credit_card_id,
      'creditCardName', card_data.credit_card_name,
      'invoiceDueDate', card_data.invoice_due_date,
      'invoiceClosingDate', card_data.invoice_closing_date,
      'transactions', card_data.transactions
    )
  )
  INTO v_result
  FROM (
    SELECT 
      cc.id AS credit_card_id,
      cc.name AS credit_card_name,
      -- Calcular data de vencimento: se due_day <= closing_day, vence no mês seguinte
      CASE 
        WHEN cc.due_day <= cc.closing_day THEN 
          (DATE_TRUNC('month', v_reference_date) + INTERVAL '1 month')::DATE + (cc.due_day - 1)
        ELSE 
          (DATE_TRUNC('month', v_reference_date))::DATE + (cc.due_day - 1)
      END AS invoice_due_date,
      -- Data de fechamento da fatura
      (DATE_TRUNC('month', v_reference_date))::DATE + (cc.closing_day - 1) AS invoice_closing_date,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', t.id,
            'description', t.description,
            'amount', t.amount,
            'type', t.type,
            'categoryId', t.category_id,
            'companyId', t.company_id,
            'date', t.date,
            'dueDate', t.due_date,
            'paidAt', t.paid_at,
            'paymentDate', t.payment_date,
            'status', t.status,
            'isInstallment', t.is_installment,
            'installmentNumber', t.installment_number,
            'totalInstallments', t.total_installments,
            'isCreditCard', t.is_credit_card,
            'creditCardId', t.credit_card_id,
            'notes', t.notes,
            'invoicePaidAt', t.invoice_paid_at,
            'createdAt', t.created_at
          )
          ORDER BY t.date DESC
        ) FILTER (WHERE t.id IS NOT NULL), 
        '[]'::JSON
      ) AS transactions
    FROM public.credit_cards cc
    LEFT JOIN LATERAL (
      -- Calcular período da fatura para cada cartão
      -- Regra: closing_day = 5 em fevereiro/2026 busca 05/jan/2026 até 04/fev/2026
      SELECT 
        -- Data de fechamento anterior (início do período) - dia closing_day do mês anterior
        (DATE_TRUNC('month', v_reference_date) - INTERVAL '1 month')::DATE + (cc.closing_day - 1) AS period_start,
        -- Data de fechamento atual (fim do período - exclusivo) - dia closing_day do mês de referência
        (DATE_TRUNC('month', v_reference_date))::DATE + (cc.closing_day - 1) AS period_end
    ) AS period_calc ON true
    LEFT JOIN LATERAL (
      SELECT t.*
      FROM public.transactions t
      WHERE t.credit_card_id = cc.id
        AND t.date >= period_calc.period_start
        AND t.date < period_calc.period_end
    ) AS t ON true
    WHERE cc.company_id = p_company_id
      AND (p_credit_card_id IS NULL OR cc.id = p_credit_card_id)
    GROUP BY cc.id, cc.name, cc.due_day, cc.closing_day
  ) AS card_data;

  RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_credit_card_statement(UUID, UUID, DATE) TO authenticated;

COMMENT ON FUNCTION public.get_credit_card_statement IS 'Retorna o extrato (fatura) de cartão(ões) de crédito. Se p_credit_card_id for NULL, retorna de todos os cartões da empresa. Se p_reference_date for NULL, usa data atual.';

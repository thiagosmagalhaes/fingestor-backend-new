-- Função para calcular indicadores de saúde do negócio (visão 360)
-- Reaproveita a mesma classificação de nature (COST/EXPENSE) usada no DRE
-- e adiciona a dimensão fixo/variável baseada em recurring_transaction_id
CREATE OR REPLACE FUNCTION get_business_health_data(
  p_company_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receitas NUMERIC := 0;
  v_custos NUMERIC := 0;
  v_despesas NUMERIC := 0;
  v_custo_fixo NUMERIC := 0;
  v_custo_variavel NUMERIC := 0;
  v_despesas_categorias JSON;
  v_total_vencido NUMERIC := 0;
  v_result JSON;
BEGIN
  -- Receitas do período
  SELECT COALESCE(SUM(t.amount), 0)
  INTO v_receitas
  FROM transactions t
  WHERE t.company_id = p_company_id
    AND t.status = 'paid'
    AND t.type = 'income'
    AND t.date >= p_start_date
    AND t.date <= p_end_date;

  -- Custos (COGS: despesas com nature = 'COST') — mesma regra do get_dre_data
  SELECT COALESCE(SUM(t.amount), 0)
  INTO v_custos
  FROM transactions t
  LEFT JOIN categories c ON t.category_id = c.id
  WHERE t.company_id = p_company_id
    AND t.status = 'paid'
    AND t.type = 'expense'
    AND c.nature = 'COST'
    AND t.date >= p_start_date
    AND t.date <= p_end_date;

  -- Despesas operacionais (nature = 'EXPENSE' ou sem nature) — mesma regra do get_dre_data
  SELECT COALESCE(SUM(t.amount), 0)
  INTO v_despesas
  FROM transactions t
  LEFT JOIN categories c ON t.category_id = c.id
  WHERE t.company_id = p_company_id
    AND t.status = 'paid'
    AND t.type = 'expense'
    AND (c.nature = 'EXPENSE' OR c.nature IS NULL)
    AND t.date >= p_start_date
    AND t.date <= p_end_date;

  -- Custo fixo: despesas vinculadas a uma recorrência ativa (aluguel, assinatura, folha)
  SELECT COALESCE(SUM(t.amount), 0)
  INTO v_custo_fixo
  FROM transactions t
  WHERE t.company_id = p_company_id
    AND t.status = 'paid'
    AND t.type = 'expense'
    AND t.recurring_transaction_id IS NOT NULL
    AND t.date >= p_start_date
    AND t.date <= p_end_date;

  -- Custo variável: despesas avulsas (sem recorrência)
  SELECT COALESCE(SUM(t.amount), 0)
  INTO v_custo_variavel
  FROM transactions t
  WHERE t.company_id = p_company_id
    AND t.status = 'paid'
    AND t.type = 'expense'
    AND t.recurring_transaction_id IS NULL
    AND t.date >= p_start_date
    AND t.date <= p_end_date;

  -- Despesas por categoria (custos + despesas juntos), usado para concentração de despesas
  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'category_name', subq.name,
        'category_color', subq.color,
        'total', subq.cat_total
      )
      ORDER BY subq.cat_total DESC
    ),
    '[]'::JSON
  )
  INTO v_despesas_categorias
  FROM (
    SELECT
      COALESCE(c.name, 'Sem Categoria') as name,
      c.color,
      SUM(t.amount) as cat_total
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.company_id = p_company_id
      AND t.status = 'paid'
      AND t.type = 'expense'
      AND t.date >= p_start_date
      AND t.date <= p_end_date
    GROUP BY c.name, c.color
  ) as subq;

  -- Total vencido: despesas pendentes/agendadas com data anterior a hoje
  SELECT COALESCE(SUM(t.amount), 0)
  INTO v_total_vencido
  FROM transactions t
  WHERE t.company_id = p_company_id
    AND t.status IN ('pending', 'scheduled')
    AND t.type = 'expense'
    AND t.date < CURRENT_DATE;

  v_result := JSON_BUILD_OBJECT(
    'receitas', v_receitas,
    'custos', v_custos,
    'despesas', v_despesas,
    'custo_fixo', v_custo_fixo,
    'custo_variavel', v_custo_variavel,
    'despesas_categorias', v_despesas_categorias,
    'total_vencido', v_total_vencido
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_business_health_data(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

COMMENT ON FUNCTION get_business_health_data(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS 'Calcula indicadores de saúde do negócio para um período: receitas, custos (COGS), despesas operacionais, custo fixo vs variável (por recorrência), despesas por categoria e total vencido.';

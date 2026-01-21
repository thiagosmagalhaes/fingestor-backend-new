-- Função para calcular DRE (Demonstrativo de Resultados do Exercício)
CREATE OR REPLACE FUNCTION get_dre_data(
  p_company_id UUID,
  p_month INTEGER,
  p_year INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date TIMESTAMP WITH TIME ZONE;
  v_end_date TIMESTAMP WITH TIME ZONE;
  v_receitas NUMERIC := 0;
  v_custos NUMERIC := 0;
  v_despesas NUMERIC := 0;
  v_receitas_categorias JSON;
  v_custos_categorias JSON;
  v_despesas_categorias JSON;
  v_result JSON;
  v_last_day INTEGER;
BEGIN
  -- Calcular primeiro dia do mês
  v_start_date := MAKE_DATE(p_year, p_month, 1);
  
  -- Calcular último dia do mês
  v_last_day := EXTRACT(DAY FROM (DATE_TRUNC('month', v_start_date) + INTERVAL '1 month - 1 day'));
  v_end_date := MAKE_TIMESTAMP(p_year, p_month, v_last_day, 23, 59, 59.999);

  -- Calcular receitas totais
  SELECT COALESCE(SUM(t.amount), 0)
  INTO v_receitas
  FROM transactions t
  WHERE t.company_id = p_company_id
    AND t.status = 'paid'
    AND t.type = 'income'
    AND t.date >= v_start_date
    AND t.date <= v_end_date;

  -- Calcular custos totais (despesas com nature = 'COST')
  SELECT COALESCE(SUM(t.amount), 0)
  INTO v_custos
  FROM transactions t
  LEFT JOIN categories c ON t.category_id = c.id
  WHERE t.company_id = p_company_id
    AND t.status = 'paid'
    AND t.type = 'expense'
    AND c.nature = 'COST'
    AND t.date >= v_start_date
    AND t.date <= v_end_date;

  -- Calcular despesas totais (despesas com nature = 'EXPENSE' ou sem nature)
  SELECT COALESCE(SUM(t.amount), 0)
  INTO v_despesas
  FROM transactions t
  LEFT JOIN categories c ON t.category_id = c.id
  WHERE t.company_id = p_company_id
    AND t.status = 'paid'
    AND t.type = 'expense'
    AND (c.nature = 'EXPENSE' OR c.nature IS NULL)
    AND t.date >= v_start_date
    AND t.date <= v_end_date;

  -- Agregar receitas por categoria
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
  INTO v_receitas_categorias
  FROM (
    SELECT 
      COALESCE(c.name, 'Sem Categoria') as name,
      c.color,
      SUM(t.amount) as cat_total
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.company_id = p_company_id
      AND t.status = 'paid'
      AND t.type = 'income'
      AND t.date >= v_start_date
      AND t.date <= v_end_date
    GROUP BY c.name, c.color
  ) as subq;

  -- Agregar custos por categoria
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
  INTO v_custos_categorias
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
      AND c.nature = 'COST'
      AND t.date >= v_start_date
      AND t.date <= v_end_date
    GROUP BY c.name, c.color
  ) as subq;

  -- Agregar despesas por categoria
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
      AND (c.nature = 'EXPENSE' OR c.nature IS NULL)
      AND t.date >= v_start_date
      AND t.date <= v_end_date
    GROUP BY c.name, c.color
  ) as subq;

  -- Montar resultado final
  v_result := JSON_BUILD_OBJECT(
    'receitas', v_receitas,
    'receitas_categorias', v_receitas_categorias,
    'custos', v_custos,
    'custos_categorias', v_custos_categorias,
    'despesas', v_despesas,
    'despesas_categorias', v_despesas_categorias,
    'lucro_bruto', v_receitas - v_custos,
    'lucro_liquido', v_receitas - v_custos - v_despesas
  );

  RETURN v_result;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION get_dre_data(UUID, INTEGER, INTEGER) TO authenticated;

-- Comentário da função (deve incluir assinatura completa dos parâmetros)
COMMENT ON FUNCTION get_dre_data(UUID, INTEGER, INTEGER) IS 'Calcula o DRE (Demonstrativo de Resultados do Exercício) para um mês/ano específico, incluindo breakdown por categorias';

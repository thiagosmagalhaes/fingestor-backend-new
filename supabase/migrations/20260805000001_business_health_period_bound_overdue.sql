-- Ajusta get_business_health_data: total_vencido passava a ser calculado sempre
-- "até hoje" (CURRENT_DATE), ignorando p_start_date/p_end_date. Isso fazia com que
-- filtrar um período no passado ainda retornasse o vencido atual, e distorcia
-- risk.overdueRatio (numerador "até hoje" dividido por um denominador do período
-- filtrado). Também fazia a chamada da RPC para o período anterior (usada na
-- comparação "vs. período anterior") devolver exatamente o mesmo valor do período
-- atual — call redundante, já que o resultado nunca mudava.
--
-- A partir daqui, total_vencido passa a ser "vencido até o fim do período
-- consultado (ou hoje, o que vier primeiro)". Mantém-se sem limite inferior — o
-- objetivo é refletir o saldo vencido acumulado até aquele ponto no tempo, não
-- apenas dívidas cuja data caiu dentro do período.
--
-- Aproveitando a mudança, documentamos aqui a semântica de status/type/nature usada
-- em cada bloco desta função — pedido explícito para deixar claro como os dados da
-- tabela transactions são diferenciados por status:
--
--   status = 'paid'                -> já realizado (dinheiro já movimentou), usado
--                                      para receitas/custos/despesas. Filtra pela
--                                      coluna `date` (data da transação/compra) —
--                                      MESMA convenção da DRE (get_dre_data). Isso é
--                                      intencional e DIFERENTE de Dashboard Summary
--                                      e Cash Flow, que usam COALESCE(payment_date,
--                                      date) — data em que o dinheiro efetivamente
--                                      saiu/entrou, relevante para cartão de crédito
--                                      (compra em um mês, fatura paga no seguinte).
--                                      Uma empresa que usa cartão de crédito pode ver
--                                      números diferentes entre este endpoint/DRE e o
--                                      Dashboard Summary/Cash Flow para o mesmo mês —
--                                      isso é esperado, não um bug.
--   status IN ('pending','scheduled') -> ainda não pago. Usado só para total_vencido
--                                      (contas a pagar em atraso), nunca para
--                                      receita/custo/despesa realizados.
--   type = 'income' | 'expense'    -> receita ou despesa. type = 'investment' é
--                                      sempre excluído (transações de investimento
--                                      não entram em nenhum relatório financeiro).
--   categories.nature = 'COST'     -> custo direto do produto/serviço (COGS).
--   categories.nature = 'EXPENSE'
--     ou NULL                      -> despesa operacional. Categorias de receita não
--                                      têm nature (constraint no banco).
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
  -- Receitas do período: só transações já pagas (status = 'paid'), pela data da
  -- transação (não a data de pagamento — ver nota de convenção acima).
  SELECT COALESCE(SUM(t.amount), 0)
  INTO v_receitas
  FROM transactions t
  WHERE t.company_id = p_company_id
    AND t.status = 'paid'
    AND t.type = 'income'
    AND t.date >= p_start_date
    AND t.date <= p_end_date;

  -- Custos (COGS: despesas pagas com nature = 'COST') — mesma regra do get_dre_data.
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

  -- Despesas operacionais pagas (nature = 'EXPENSE' ou sem nature/categoria) —
  -- mesma regra do get_dre_data.
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

  -- Custo fixo: despesas pagas vinculadas a uma recorrência (aluguel, assinatura,
  -- folha). Particiona o MESMO universo de custos+despesas acima, só que pelo eixo
  -- "é recorrente?" em vez de "é COGS ou operacional?" — custo_fixo + custo_variavel
  -- soma custos + despesas, não só custos.
  SELECT COALESCE(SUM(t.amount), 0)
  INTO v_custo_fixo
  FROM transactions t
  WHERE t.company_id = p_company_id
    AND t.status = 'paid'
    AND t.type = 'expense'
    AND t.recurring_transaction_id IS NOT NULL
    AND t.date >= p_start_date
    AND t.date <= p_end_date;

  -- Custo variável: despesas pagas avulsas (sem recorrência).
  SELECT COALESCE(SUM(t.amount), 0)
  INTO v_custo_variavel
  FROM transactions t
  WHERE t.company_id = p_company_id
    AND t.status = 'paid'
    AND t.type = 'expense'
    AND t.recurring_transaction_id IS NULL
    AND t.date >= p_start_date
    AND t.date <= p_end_date;

  -- Despesas por categoria, usado só para calcular concentração de despesas
  -- (risk.expenseConcentration). Mistura categorias COST + EXPENSE de propósito —
  -- essa lista NÃO reconcilia com custos_categorias/despesas_categorias da DRE, que
  -- mantêm COST e EXPENSE separados.
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

  -- Total vencido: despesas AINDA NÃO PAGAS (status pending/scheduled) cuja data já
  -- passou, até o fim do período consultado (ou hoje, o que vier primeiro). Sem
  -- limite inferior — reflete o saldo vencido acumulado até aquele ponto no tempo,
  -- não só dívidas com data dentro do período. Escopado a type = 'expense' (é sobre
  -- risco de contas a pagar, não a receber).
  SELECT COALESCE(SUM(t.amount), 0)
  INTO v_total_vencido
  FROM transactions t
  WHERE t.company_id = p_company_id
    AND t.status IN ('pending', 'scheduled')
    AND t.type = 'expense'
    AND t.date < LEAST(p_end_date::date, CURRENT_DATE);

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

COMMENT ON FUNCTION get_business_health_data(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS 'Calcula indicadores de saúde do negócio para um período: receitas, custos (COGS), despesas operacionais, custo fixo vs variável (por recorrência), despesas por categoria e total vencido (limitado ao fim do período consultado, ou hoje, o que vier primeiro).';

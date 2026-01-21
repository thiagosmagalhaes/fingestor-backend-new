--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user'
);


--
-- Name: credit_card_brand; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.credit_card_brand AS ENUM (
    'visa',
    'mastercard',
    'elo',
    'amex',
    'hipercard',
    'diners',
    'discover',
    'other'
);


--
-- Name: expense_nature; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.expense_nature AS ENUM (
    'COST',
    'EXPENSE'
);


--
-- Name: transaction_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transaction_status AS ENUM (
    'paid',
    'pending',
    'scheduled'
);


--
-- Name: transaction_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transaction_type AS ENUM (
    'income',
    'expense'
);


--
-- Name: get_cash_flow_chart_data(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_cash_flow_chart_data(p_company_id uuid, p_months integer DEFAULT 6) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_result JSON;
  v_month_data JSON;
  v_months JSON[] := '{}';
  v_start_date DATE;
  v_end_date DATE;
  v_income NUMERIC;
  v_expense NUMERIC;
  i INTEGER;
BEGIN
  -- Iterar pelos últimos N meses
  FOR i IN REVERSE (p_months - 1)..0 LOOP
    v_start_date := DATE_TRUNC('month', CURRENT_DATE - (i || ' months')::INTERVAL)::DATE;
    v_end_date := (DATE_TRUNC('month', CURRENT_DATE - (i || ' months')::INTERVAL) + INTERVAL '1 month - 1 day')::DATE;
    
    -- Calcular receitas do mês (usar payment_date se disponível)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_income
    FROM transactions
    WHERE company_id = p_company_id
      AND status = 'paid'
      AND type = 'income'
      AND COALESCE(payment_date, date)::DATE >= v_start_date
      AND COALESCE(payment_date, date)::DATE <= v_end_date;
    
    -- Calcular despesas do mês (usar payment_date se disponível)
    -- Isso garante que compras no cartão só contam quando a fatura foi paga
    SELECT COALESCE(SUM(amount), 0)
    INTO v_expense
    FROM transactions
    WHERE company_id = p_company_id
      AND status = 'paid'
      AND type = 'expense'
      AND COALESCE(payment_date, date)::DATE >= v_start_date
      AND COALESCE(payment_date, date)::DATE <= v_end_date;
    
    -- Montar objeto do mês
    v_month_data := json_build_object(
      'month', TO_CHAR(v_start_date, 'Mon'),
      'month_full', TO_CHAR(v_start_date, 'YYYY-MM-DD'),
      'receitas', v_income,
      'despesas', v_expense,
      'saldo', v_income - v_expense
    );
    
    v_months := array_append(v_months, v_month_data);
  END LOOP;
  
  -- Retornar array de meses como JSON
  v_result := array_to_json(v_months);
  
  RETURN v_result;
END;
$$;


--
-- Name: FUNCTION get_cash_flow_chart_data(p_company_id uuid, p_months integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_cash_flow_chart_data(p_company_id uuid, p_months integer) IS 'Returns cash flow data using payment_date for paid transactions. Credit card purchases count when invoice is paid, not when purchase was made.';


--
-- Name: get_category_breakdown(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_category_breakdown(p_company_id uuid, p_limit integer DEFAULT 5) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_result JSON;
  v_total_expenses NUMERIC;
BEGIN
  -- Calcular total de despesas
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_total_expenses
  FROM category_breakdown_current_month
  WHERE company_id = p_company_id;
  
  -- Buscar top categorias com percentual
  SELECT json_agg(
    json_build_object(
      'name', COALESCE(category_name, 'Outros'),
      'value', total_amount,
      'color', COALESCE(category_color, '#64748b'),
      'percentage', CASE 
        WHEN v_total_expenses > 0 THEN ROUND((total_amount / v_total_expenses * 100)::NUMERIC, 1)
        ELSE 0
      END,
      'transaction_count', transaction_count
    )
  )
  INTO v_result
  FROM (
    SELECT *
    FROM category_breakdown_current_month
    WHERE company_id = p_company_id
    ORDER BY total_amount DESC
    LIMIT p_limit
  ) sub;
  
  RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;


--
-- Name: get_credit_cards_by_companies(uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_credit_cards_by_companies(company_ids uuid[]) RETURNS TABLE(id uuid, name text, company_id uuid)
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT cc.id, cc.name, cc.company_id
  FROM public.credit_cards cc
  INNER JOIN public.companies c ON c.id = cc.company_id
  WHERE cc.company_id = ANY(company_ids)
    AND c.user_id = auth.uid();
$$;


--
-- Name: get_dashboard_summary(uuid, date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_dashboard_summary(p_company_id uuid, p_start_date date, p_end_date date) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_total_income NUMERIC;
  v_total_expense NUMERIC;
  v_pending_income NUMERIC;
  v_pending_expense NUMERIC;
  v_pending_credit_card_expense NUMERIC;
  v_result JSON;
BEGIN
  -- Calcular receitas pagas (usar payment_date quando disponível)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_income
  FROM transactions
  WHERE company_id = p_company_id
    AND status = 'paid'
    AND type = 'income'
    AND COALESCE(payment_date, date) >= p_start_date
    AND COALESCE(payment_date, date) <= p_end_date;

  -- Calcular despesas pagas (usar payment_date quando disponível)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_expense
  FROM transactions
  WHERE company_id = p_company_id
    AND status = 'paid'
    AND type = 'expense'
    AND COALESCE(payment_date, date) >= p_start_date
    AND COALESCE(payment_date, date) <= p_end_date;

  -- Calcular receitas pendentes (excluir transações de cartão)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_pending_income
  FROM transactions
  WHERE company_id = p_company_id
    AND status IN ('pending', 'scheduled')
    AND type = 'income'
    AND is_credit_card = false
    AND date >= p_start_date
    AND date <= p_end_date;

  -- Calcular despesas pendentes (excluir transações de cartão)
  SELECT COALESCE(SUM(amount), 0)
  INTO v_pending_expense
  FROM transactions
  WHERE company_id = p_company_id
    AND status IN ('pending', 'scheduled')
    AND type = 'expense'
    AND is_credit_card = false
    AND date >= p_start_date
    AND date <= p_end_date;

  -- Calcular despesas de cartão de crédito cujas faturas vencem no mês vigente
  -- A fatura vence no mês se o due_day cair dentro do período
  SELECT COALESCE(SUM(t.amount), 0)
  INTO v_pending_credit_card_expense
  FROM transactions t
  INNER JOIN credit_cards cc ON t.credit_card_id = cc.id
  WHERE t.company_id = p_company_id
    AND t.status = 'pending'
    AND t.type = 'expense'
    AND t.is_credit_card = true
    -- Verifica se a data de vencimento da fatura (invoice_month + due_day) cai no período
    AND (
      -- Calcula o mês da fatura baseado na regra de fechamento
      DATE_TRUNC('month', get_invoice_period(t.date, cc.closing_day))::DATE 
      + INTERVAL '1 day' * (cc.due_day - 1)
    )::DATE >= p_start_date
    AND (
      DATE_TRUNC('month', get_invoice_period(t.date, cc.closing_day))::DATE 
      + INTERVAL '1 day' * (cc.due_day - 1)
    )::DATE <= p_end_date;

  -- Montar o resultado JSON incluindo despesas de cartão que vencem no mês
  v_result := json_build_object(
    'total_income', v_total_income,
    'total_expense', v_total_expense,
    'balance', v_total_income - v_total_expense,
    'pending_income', v_pending_income,
    'pending_expense', v_pending_expense + v_pending_credit_card_expense
  );

  RETURN v_result;
END;
$$;


--
-- Name: FUNCTION get_dashboard_summary(p_company_id uuid, p_start_date date, p_end_date date); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_dashboard_summary(p_company_id uuid, p_start_date date, p_end_date date) IS 'Calculates dashboard summary including credit card transactions due in the current month based on invoice closing and due dates.';


--
-- Name: get_dre_data(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_dre_data(p_company_id uuid, p_month integer, p_year integer) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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
  v_last_day := EXv_start_date
    AND t.date <= vE_TIMESTAMP(p_year, p_month, v_last_day, 23, 59, 59.999);
  -- Calcular receitas totais
  SELECT COALESCE(SUM(t.amount), 0)
  INTO v_receitas
  FROM transactions t
  WHERE t.company_id = p_company_id
    AND t.status = 'paid'
    AND t.type = 'income'
    AND t.date >= p_start_date
    AND t.date <= p_end_date;

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


--
-- Name: FUNCTION get_dre_data(p_company_id uuid, p_month integer, p_year integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_dre_data(p_company_id uuid, p_month integer, p_year integer) IS 'Calcula o DRE (Demonstrativo de Resultados do Exercício) para um mês/ano específico, incluindo breakdown por categorias';


--
-- Name: get_effective_date(text, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_effective_date(p_status text, p_payment_date timestamp with time zone, p_date timestamp with time zone) RETURNS timestamp with time zone
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
  -- If paid, use payment date
  IF p_status = 'paid' AND p_payment_date IS NOT NULL THEN
    RETURN p_payment_date;
  END IF;
  
  -- Otherwise use transaction date
  RETURN p_date;
END;
$$;


--
-- Name: FUNCTION get_effective_date(p_status text, p_payment_date timestamp with time zone, p_date timestamp with time zone); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_effective_date(p_status text, p_payment_date timestamp with time zone, p_date timestamp with time zone) IS 'Returns the most relevant date for a transaction: payment_date if paid, or date as fallback. Used for proper chronological sorting.';


--
-- Name: get_invoice_period(date, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_invoice_period(transaction_date date, closing_day integer) RETURNS date
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
  invoice_month DATE;
BEGIN
  -- If transaction is after closing day, invoice is for next month
  IF EXTRACT(DAY FROM transaction_date) > closing_day THEN
    invoice_month := DATE_TRUNC('month', transaction_date + INTERVAL '1 month');
  ELSE
    invoice_month := DATE_TRUNC('month', transaction_date);
  END IF;
  
  RETURN invoice_month;
END;
$$;


--
-- Name: get_user_subscription(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_subscription() RETURNS TABLE(id uuid, plan_type text, status text, current_period_start timestamp with time zone, current_period_end timestamp with time zone, cancel_at_period_end boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.plan_type,
    s.status,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end
  FROM subscriptions s
  WHERE s.user_id = auth.uid()
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: pay_credit_card_invoice(uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.pay_credit_card_invoice(p_credit_card_id uuid, p_invoice_month date) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_closing_day INTEGER;
  v_affected_rows INTEGER;
  v_payment_date TIMESTAMP WITH TIME ZONE;
BEGIN
  v_payment_date := CURRENT_TIMESTAMP;
  
  -- Get closing day for the credit card
  SELECT closing_day INTO v_closing_day
  FROM public.credit_cards
  WHERE id = p_credit_card_id;
  
  -- Update transactions to paid status
  -- Now we set payment_date to current date (when invoice is paid)
  -- and keep date as the original purchase date
  UPDATE public.transactions
  SET 
    status = 'paid',
    paid_at = v_payment_date,
    payment_date = v_payment_date,
    invoice_paid_at = v_payment_date
  WHERE 
    credit_card_id = p_credit_card_id
    AND get_invoice_period(date, v_closing_day) = p_invoice_month
    AND status = 'pending';
  
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  RETURN v_affected_rows;
END;
$$;


--
-- Name: reopen_credit_card_invoice(uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reopen_credit_card_invoice(p_credit_card_id uuid, p_invoice_month date) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_closing_day INTEGER;
  v_affected_rows INTEGER;
BEGIN
  -- Get closing day for the credit card
  SELECT closing_day INTO v_closing_day
  FROM public.credit_cards
  WHERE id = p_credit_card_id;
  
  -- Update transactions to pending status and clear payment_date
  UPDATE public.transactions
  SET 
    status = 'pending',
    paid_at = NULL,
    payment_date = NULL,
    invoice_paid_at = NULL
  WHERE 
    credit_card_id = p_credit_card_id
    AND get_invoice_period(date, v_closing_day) = p_invoice_month
    AND invoice_paid_at IS NOT NULL;
  
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  RETURN v_affected_rows;
END;
$$;


--
-- Name: sync_profile_email(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_profile_email() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;


--
-- Name: update_subscriptions_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_subscriptions_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name text NOT NULL,
    type public.transaction_type NOT NULL,
    color text DEFAULT '#3B82F6'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    nature public.expense_nature,
    CONSTRAINT categories_nature_check CHECK ((((type = 'expense'::public.transaction_type) AND (nature IS NOT NULL)) OR ((type = 'income'::public.transaction_type) AND (nature IS NULL))))
);


--
-- Name: COLUMN categories.nature; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.categories.nature IS 'Nature of expense: COST (custo) or EXPENSE (despesa). Only applies to expense categories.';


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    category_id uuid,
    type public.transaction_type NOT NULL,
    description text NOT NULL,
    amount numeric(15,2) NOT NULL,
    date date NOT NULL,
    status public.transaction_status DEFAULT 'pending'::public.transaction_status NOT NULL,
    is_installment boolean DEFAULT false NOT NULL,
    installment_number integer,
    total_installments integer,
    is_credit_card boolean DEFAULT false NOT NULL,
    credit_card_name text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    credit_card_id uuid,
    invoice_paid_at timestamp with time zone,
    paid_at date,
    payment_date timestamp with time zone
);


--
-- Name: COLUMN transactions.payment_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transactions.payment_date IS 'Actual date when the money was debited/credited from the account. For credit cards, this is when the invoice was paid, not when the purchase was made.';


--
-- Name: category_breakdown_current_month; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.category_breakdown_current_month AS
 SELECT t.company_id,
    t.category_id,
    c.name AS category_name,
    c.color AS category_color,
    sum(t.amount) AS total_amount,
    count(t.id) AS transaction_count
   FROM (public.transactions t
     LEFT JOIN public.categories c ON ((t.category_id = c.id)))
  WHERE ((t.type = 'expense'::public.transaction_type) AND (t.status = 'paid'::public.transaction_status) AND ((COALESCE(t.payment_date, (t.date)::timestamp with time zone))::date >= (date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone))::date) AND ((COALESCE(t.payment_date, (t.date)::timestamp with time zone))::date <= ((date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone) + '1 mon -1 days'::interval))::date))
  GROUP BY t.company_id, t.category_id, c.name, c.color
  ORDER BY (sum(t.amount)) DESC;


--
-- Name: VIEW category_breakdown_current_month; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.category_breakdown_current_month IS 'Shows expenses by category for current month using payment_date for accurate cash flow tracking.';


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    cnpj text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: credit_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    name text NOT NULL,
    brand public.credit_card_brand DEFAULT 'other'::public.credit_card_brand NOT NULL,
    closing_day integer NOT NULL,
    due_day integer NOT NULL,
    credit_limit numeric(15,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT credit_cards_closing_day_check CHECK (((closing_day >= 1) AND (closing_day <= 31))),
    CONSTRAINT credit_cards_due_day_check CHECK (((due_day >= 1) AND (due_day <= 31)))
);


--
-- Name: credit_card_invoices; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.credit_card_invoices AS
 SELECT cc.id AS credit_card_id,
    cc.company_id,
    cc.name AS credit_card_name,
    cc.brand,
    cc.closing_day,
    cc.due_day,
    public.get_invoice_period(t.date, cc.closing_day) AS invoice_month,
    count(t.id) AS transaction_count,
    sum(t.amount) AS total_amount,
    bool_and((t.status = 'paid'::public.transaction_status)) AS is_paid,
    min(t.invoice_paid_at) AS paid_at
   FROM (public.credit_cards cc
     LEFT JOIN public.transactions t ON (((t.credit_card_id = cc.id) AND (t.is_credit_card = true))))
  GROUP BY cc.id, cc.company_id, cc.name, cc.brand, cc.closing_day, cc.due_day, (public.get_invoice_period(t.date, cc.closing_day));


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    company_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL,
    link_to text,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    read_at timestamp with time zone,
    CONSTRAINT notifications_type_check CHECK ((type = ANY (ARRAY['expense_due'::text, 'expense_overdue'::text, 'info'::text, 'warning'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    email text
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    plan_type text NOT NULL,
    price_id text NOT NULL,
    status text NOT NULL,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    cancel_at_period_end boolean DEFAULT false,
    canceled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT subscriptions_plan_type_check CHECK ((plan_type = ANY (ARRAY['mensal'::text, 'semestral'::text, 'anual'::text]))),
    CONSTRAINT subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'canceled'::text, 'past_due'::text, 'unpaid'::text, 'incomplete'::text, 'incomplete_expired'::text, 'trialing'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role NOT NULL
);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: credit_cards credit_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_cards
    ADD CONSTRAINT credit_cards_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_stripe_subscription_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_credit_cards_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credit_cards_company_id ON public.credit_cards USING btree (company_id);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- Name: idx_notifications_user_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_company ON public.notifications USING btree (user_id, company_id);


--
-- Name: idx_subscriptions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);


--
-- Name: idx_subscriptions_stripe_subscription_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_stripe_subscription_id ON public.subscriptions USING btree (stripe_subscription_id);


--
-- Name: idx_subscriptions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions USING btree (user_id);


--
-- Name: idx_transactions_credit_card_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_credit_card_id ON public.transactions USING btree (credit_card_id);


--
-- Name: idx_transactions_payment_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_payment_date ON public.transactions USING btree (payment_date);


--
-- Name: companies update_companies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: credit_cards update_credit_cards_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_credit_cards_updated_at BEFORE UPDATE ON public.credit_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: subscriptions update_subscriptions_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_subscriptions_updated_at_trigger BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_subscriptions_updated_at();


--
-- Name: transactions update_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: categories categories_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: companies companies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: credit_cards credit_cards_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_cards
    ADD CONSTRAINT credit_cards_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: transactions transactions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_credit_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_credit_card_id_fkey FOREIGN KEY (credit_card_id) REFERENCES public.credit_cards(id) ON DELETE SET NULL;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: subscriptions Service role can manage all subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage all subscriptions" ON public.subscriptions USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text)) WITH CHECK (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: categories Users can create categories for their companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create categories for their companies" ON public.categories FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.companies
  WHERE ((companies.id = categories.company_id) AND (companies.user_id = auth.uid())))));


--
-- Name: credit_cards Users can create credit cards for their companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create credit cards for their companies" ON public.credit_cards FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.companies
  WHERE ((companies.id = credit_cards.company_id) AND (companies.user_id = auth.uid())))));


--
-- Name: companies Users can create their own companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own companies" ON public.companies FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: transactions Users can create transactions for their companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create transactions for their companies" ON public.transactions FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.companies
  WHERE ((companies.id = transactions.company_id) AND (companies.user_id = auth.uid())))));


--
-- Name: categories Users can delete categories of their companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete categories of their companies" ON public.categories FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.companies
  WHERE ((companies.id = categories.company_id) AND (companies.user_id = auth.uid())))));


--
-- Name: credit_cards Users can delete credit cards of their companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete credit cards of their companies" ON public.credit_cards FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.companies
  WHERE ((companies.id = credit_cards.company_id) AND (companies.user_id = auth.uid())))));


--
-- Name: companies Users can delete their own companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own companies" ON public.companies FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: notifications Users can delete their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: transactions Users can delete transactions of their companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete transactions of their companies" ON public.transactions FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.companies
  WHERE ((companies.id = transactions.company_id) AND (companies.user_id = auth.uid())))));


--
-- Name: notifications Users can insert their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own notifications" ON public.notifications FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: categories Users can update categories of their companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update categories of their companies" ON public.categories FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.companies
  WHERE ((companies.id = categories.company_id) AND (companies.user_id = auth.uid())))));


--
-- Name: credit_cards Users can update credit cards of their companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update credit cards of their companies" ON public.credit_cards FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.companies
  WHERE ((companies.id = credit_cards.company_id) AND (companies.user_id = auth.uid())))));


--
-- Name: companies Users can update their own companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own companies" ON public.companies FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: transactions Users can update transactions of their companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update transactions of their companies" ON public.transactions FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.companies
  WHERE ((companies.id = transactions.company_id) AND (companies.user_id = auth.uid())))));


--
-- Name: categories Users can view categories of their companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view categories of their companies" ON public.categories FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.companies
  WHERE ((companies.id = categories.company_id) AND (companies.user_id = auth.uid())))));


--
-- Name: credit_cards Users can view credit cards of their companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view credit cards of their companies" ON public.credit_cards FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.companies
  WHERE ((companies.id = credit_cards.company_id) AND (companies.user_id = auth.uid())))));


--
-- Name: companies Users can view their own companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own companies" ON public.companies FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: subscriptions Users can view their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: transactions Users can view transactions of their companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view transactions of their companies" ON public.transactions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.companies
  WHERE ((companies.id = transactions.company_id) AND (companies.user_id = auth.uid())))));


--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: companies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

--
-- Name: credit_cards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


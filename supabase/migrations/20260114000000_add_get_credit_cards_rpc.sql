-- Create RPC function to get credit cards for import functionality
-- Only returns cards from companies that belong to the authenticated user
CREATE OR REPLACE FUNCTION public.get_credit_cards_by_companies(company_ids UUID[])
RETURNS TABLE (
  id UUID,
  name TEXT,
  company_id UUID
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT cc.id, cc.name, cc.company_id
  FROM public.credit_cards cc
  INNER JOIN public.companies c ON c.id = cc.company_id
  WHERE cc.company_id = ANY(company_ids)
    AND c.user_id = auth.uid();
$$;

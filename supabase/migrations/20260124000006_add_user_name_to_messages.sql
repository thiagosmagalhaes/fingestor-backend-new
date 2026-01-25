-- Function to get support messages with user names
CREATE OR REPLACE FUNCTION get_support_messages(
    p_ticket_id UUID
)
RETURNS TABLE (
    id UUID,
    ticket_id UUID,
    user_id UUID,
    message TEXT,
    is_admin BOOLEAN,
    created_at TIMESTAMPTZ,
    user_name TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sm.id,
        sm.ticket_id,
        sm.user_id,
        sm.message,
        sm.is_admin,
        sm.created_at,
        SPLIT_PART(p.full_name, ' ', 1) as user_name
    FROM support_messages sm
    LEFT JOIN profiles p ON sm.user_id = p.user_id
    WHERE sm.ticket_id = p_ticket_id
    ORDER BY sm.created_at ASC;
END;
$$;

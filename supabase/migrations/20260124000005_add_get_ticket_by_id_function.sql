-- Function to get a support ticket by ID with user information for admins
CREATE OR REPLACE FUNCTION get_support_ticket_by_id(
    p_user_id UUID,
    p_ticket_id UUID
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    title TEXT,
    description TEXT,
    status support_ticket_status,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    closed_by UUID,
    user_email TEXT,
    user_name TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    -- Check if requesting user is admin
    SELECT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_roles.user_id = p_user_id 
        AND role = 'admin'
    ) INTO v_is_admin;

    -- Return ticket with user info if admin, otherwise just ticket info
    IF v_is_admin THEN
        RETURN QUERY
        SELECT 
            st.id,
            st.user_id,
            st.title,
            st.description,
            st.status,
            st.created_at,
            st.updated_at,
            st.closed_at,
            st.closed_by,
            au.email as user_email,
            p.full_name as user_name
        FROM support_tickets st
        LEFT JOIN auth.users au ON st.user_id = au.id
        LEFT JOIN profiles p ON st.user_id = p.id
        WHERE st.id = p_ticket_id;
    ELSE
        RETURN QUERY
        SELECT 
            st.id,
            st.user_id,
            st.title,
            st.description,
            st.status,
            st.created_at,
            st.updated_at,
            st.closed_at,
            st.closed_by,
            NULL::TEXT as user_email,
            NULL::TEXT as user_name
        FROM support_tickets st
        WHERE st.id = p_ticket_id
        AND st.user_id = p_user_id; -- Users can only see their own tickets
    END IF;
END;
$$;

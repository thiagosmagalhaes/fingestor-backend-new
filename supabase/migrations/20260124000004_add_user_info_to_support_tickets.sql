-- Drop existing function first to change return type
DROP FUNCTION IF EXISTS get_support_tickets(UUID);

-- Update get_support_tickets to include user information for admins
CREATE OR REPLACE FUNCTION get_support_tickets(
    p_user_id UUID
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    user_email TEXT,
    user_name TEXT,
    title TEXT,
    description TEXT,
    status support_ticket_status,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    closed_by UUID,
    message_count BIGINT,
    last_message_at TIMESTAMP WITH TIME ZONE,
    has_unread BOOLEAN
) AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    -- Check if user is admin
    SELECT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = p_user_id
        AND user_roles.role = 'admin'
    ) INTO v_is_admin;

    RETURN QUERY
    SELECT 
        t.id,
        t.user_id,
        u.email::TEXT as user_email,
        p.full_name::TEXT as user_name,
        t.title,
        t.description,
        t.status,
        t.created_at,
        t.updated_at,
        t.closed_at,
        t.closed_by,
        COUNT(m.id)::BIGINT as message_count,
        MAX(m.created_at) as last_message_at,
        CASE 
            WHEN v_is_admin THEN 
                EXISTS (
                    SELECT 1 FROM support_messages sm
                    WHERE sm.ticket_id = t.id
                    AND sm.is_admin = false
                    AND sm.created_at > COALESCE(
                        (SELECT MAX(sm2.created_at) FROM support_messages sm2
                         WHERE sm2.ticket_id = t.id AND sm2.is_admin = true),
                        t.created_at
                    )
                )
            ELSE
                EXISTS (
                    SELECT 1 FROM support_messages sm
                    WHERE sm.ticket_id = t.id
                    AND sm.is_admin = true
                    AND sm.created_at > COALESCE(
                        (SELECT MAX(sm2.created_at) FROM support_messages sm2
                         WHERE sm2.ticket_id = t.id AND sm2.is_admin = false),
                        t.created_at
                    )
                )
        END as has_unread
    FROM support_tickets t
    LEFT JOIN support_messages m ON t.id = m.ticket_id
    LEFT JOIN auth.users u ON t.user_id = u.id
    LEFT JOIN profiles p ON t.user_id = p.user_id
    WHERE v_is_admin OR t.user_id = p_user_id
    GROUP BY t.id, u.email, p.full_name
    ORDER BY t.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

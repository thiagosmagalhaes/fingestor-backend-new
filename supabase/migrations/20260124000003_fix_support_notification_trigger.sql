-- Fix notify_ticket_reply function to use correct notification columns
CREATE OR REPLACE FUNCTION notify_ticket_reply()
RETURNS TRIGGER AS $$
DECLARE
    ticket_owner UUID;
    ticket_title TEXT;
    sender_is_admin BOOLEAN;
    recipient_id UUID;
    user_company_id UUID;
BEGIN
    -- Get ticket info
    SELECT user_id, title INTO ticket_owner, ticket_title
    FROM support_tickets
    WHERE id = NEW.ticket_id;

    -- Check if sender is admin
    SELECT NEW.is_admin INTO sender_is_admin;

    -- Get user's company_id (use first company for now)
    SELECT id INTO user_company_id
    FROM companies
    WHERE user_id = ticket_owner
    LIMIT 1;

    -- If user has no company, skip notification
    IF user_company_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Determine recipient
    IF sender_is_admin THEN
        -- Admin sent message, notify ticket owner
        INSERT INTO notifications (user_id, company_id, title, message, type, link_to)
        VALUES (
            ticket_owner,
            user_company_id,
            'Resposta no seu ticket de suporte',
            'Seu ticket "' || ticket_title || '" recebeu uma resposta.',
            'info',
            NEW.ticket_id::TEXT
        );
    ELSE
        -- User sent message, notify all admins
        INSERT INTO notifications (user_id, company_id, title, message, type, link_to)
        SELECT 
            ur.user_id,
            user_company_id,
            'Nova mensagem no ticket #' || LEFT(NEW.ticket_id::TEXT, 8),
            'Ticket: ' || ticket_title,
            'info',
            NEW.ticket_id::TEXT
        FROM user_roles ur
        WHERE ur.role = 'admin';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

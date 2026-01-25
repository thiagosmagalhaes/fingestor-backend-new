-- Create enum for support ticket status
CREATE TYPE support_ticket_status AS ENUM ('open', 'in_progress', 'closed');

-- Create support_tickets table
CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status support_ticket_status NOT NULL DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    closed_by UUID REFERENCES auth.users(id)
);

-- Create support_messages table
CREATE TABLE support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX idx_support_messages_ticket_id ON support_messages(ticket_id);
CREATE INDEX idx_support_messages_created_at ON support_messages(created_at);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets table

-- Users can read their own tickets, admins can read all
CREATE POLICY "Users can read own tickets, admins read all"
    ON support_tickets FOR SELECT
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

-- Authenticated users can create tickets
CREATE POLICY "Authenticated users can create tickets"
    ON support_tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own tickets, admins can update any
CREATE POLICY "Users can update own tickets, admins update any"
    ON support_tickets FOR UPDATE
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

-- RLS Policies for support_messages table

-- Users can read messages from their tickets, admins can read all
CREATE POLICY "Users read own ticket messages, admins read all"
    ON support_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM support_tickets
            WHERE support_tickets.id = support_messages.ticket_id
            AND (
                support_tickets.user_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM user_roles
                    WHERE user_roles.user_id = auth.uid()
                    AND user_roles.role = 'admin'
                )
            )
        )
    );

-- Users can create messages in their tickets, admins can create in any
CREATE POLICY "Users create messages in own tickets, admins in any"
    ON support_messages FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        (
            EXISTS (
                SELECT 1 FROM support_tickets
                WHERE support_tickets.id = support_messages.ticket_id
                AND support_tickets.user_id = auth.uid()
            ) OR
            EXISTS (
                SELECT 1 FROM user_roles
                WHERE user_roles.user_id = auth.uid()
                AND user_roles.role = 'admin'
            )
        )
    );

-- Function to get tickets with message count and last message info
CREATE OR REPLACE FUNCTION get_support_tickets(
    p_user_id UUID
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
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
    is_admin BOOLEAN;
BEGIN
    -- Check if user is admin
    SELECT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = p_user_id
        AND user_roles.role = 'admin'
    ) INTO is_admin;

    RETURN QUERY
    SELECT 
        t.id,
        t.user_id,
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
            WHEN get_support_tickets.is_admin THEN 
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
    WHERE get_support_tickets.is_admin OR t.user_id = p_user_id
    GROUP BY t.id
    ORDER BY t.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification when message is sent
CREATE OR REPLACE FUNCTION notify_ticket_reply()
RETURNS TRIGGER AS $$
DECLARE
    ticket_owner UUID;
    ticket_title TEXT;
    sender_is_admin BOOLEAN;
    recipient_id UUID;
BEGIN
    -- Get ticket info
    SELECT user_id, title INTO ticket_owner, ticket_title
    FROM support_tickets
    WHERE id = NEW.ticket_id;

    -- Check if sender is admin
    SELECT NEW.is_admin INTO sender_is_admin;

    -- Determine recipient
    IF sender_is_admin THEN
        -- Admin sent message, notify ticket owner
        recipient_id := ticket_owner;
    ELSE
        -- User sent message, notify all admins
        INSERT INTO notifications (user_id, title, message, type, related_id)
        SELECT 
            user_roles.user_id,
            'Nova mensagem no ticket #' || LEFT(NEW.ticket_id::TEXT, 8),
            'Ticket: ' || ticket_title,
            'support',
            NEW.ticket_id
        FROM user_roles
        WHERE user_roles.role = 'admin';
        
        RETURN NEW;
    END IF;

    -- Create notification for recipient
    INSERT INTO notifications (user_id, title, message, type, related_id)
    VALUES (
        recipient_id,
        'Resposta no seu ticket de suporte',
        'Seu ticket "' || ticket_title || '" recebeu uma resposta.',
        'support',
        NEW.ticket_id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to send notifications on new messages
CREATE TRIGGER notify_on_ticket_reply
    AFTER INSERT ON support_messages
    FOR EACH ROW
    EXECUTE FUNCTION notify_ticket_reply();

-- Function to update ticket updated_at timestamp
CREATE OR REPLACE FUNCTION update_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE support_tickets
    SET updated_at = NOW()
    WHERE id = NEW.ticket_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update ticket timestamp when message is added
CREATE TRIGGER update_ticket_on_message
    AFTER INSERT ON support_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_timestamp();

-- Function to automatically update updated_at on ticket changes
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_support_tickets_updated_at();

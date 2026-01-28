-- Create whatsapp_message_queue table for managing WhatsApp message dispatch
-- This table stores all scheduled messages for user activation

CREATE TABLE whatsapp_message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  message_key TEXT NOT NULL,
  message_body TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure each user only receives each message once
  CONSTRAINT unique_user_message UNIQUE (user_id, message_key)
);

-- Create indexes for performance
CREATE INDEX idx_whatsapp_queue_status ON whatsapp_message_queue(status);
CREATE INDEX idx_whatsapp_queue_scheduled ON whatsapp_message_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_whatsapp_queue_user_id ON whatsapp_message_queue(user_id);

-- Enable Row Level Security
ALTER TABLE whatsapp_message_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies (only backend service role can access)
CREATE POLICY "Service role can do everything" ON whatsapp_message_queue
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_whatsapp_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON whatsapp_message_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_queue_updated_at();

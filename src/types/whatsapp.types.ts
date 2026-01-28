export type MessageStatus = 'pending' | 'sent' | 'failed';

export interface WhatsAppMessage {
  id: string;
  user_id: string;
  phone: string;
  message_key: MessageKey;
  message_body: string;
  scheduled_for: string;
  sent_at: string | null;
  status: MessageStatus;
  created_at: string;
  updated_at: string;
}

export type MessageKey = 
  | 'welcome_10min'
  | 'create_account_24h'
  | 'first_tx_48h'
  | 'micro_win_72h'
  | 'value_5d'
  | 'help_7d'
  | 'comeback_inactive';

export interface MessageTemplate {
  key: MessageKey;
  delayMinutes: number;
  body: string;
  condition: (userStats: UserStats) => boolean;
}

export interface UserStats {
  userId: string;
  phone: string | null;
  createdAt: string;
  accountCount: number;
  transactionCount: number;
  lastTransactionDate: string | null;
  sentMessages: MessageKey[];
}

export interface WebhookPayload {
  phone: string;
  message: string;
}

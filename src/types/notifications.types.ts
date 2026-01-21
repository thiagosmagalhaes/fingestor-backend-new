export interface Notification {
  id: string;
  user_id: string;
  company_id: string;
  title: string;
  message: string;
  type: 'expense_due' | 'expense_overdue' | 'info' | 'warning';
  link_to?: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

export interface NotificationFromDB {
  id: string;
  user_id: string;
  company_id: string;
  title: string;
  message: string;
  type: string;
  link_to: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface CreateNotificationRequest {
  companyId: string;
  title: string;
  message: string;
  type: 'expense_due' | 'expense_overdue' | 'info' | 'warning';
  linkTo?: string;
}

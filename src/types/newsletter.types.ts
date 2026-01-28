export interface NewsletterFeature {
  title: string;
  description: string;
}

export interface NewsletterData {
  emailSubject: string;
  title: string;
  subtitle: string;
  content: string;
  additionalContent?: string;
  infoBox?: string;
  successBox?: string;
  warningBox?: string;
  featuresTitle?: string;
  features?: NewsletterFeature[];
  ctaUrl?: string;
  ctaText?: string;
  closingText?: string;
  unsubscribeUrl: string;
}

export interface SendNewsletterRequest {
  to: string | string[];
  subject: string;
  title: string;
  subtitle: string;
  content: string;
  additionalContent?: string;
  infoBox?: string;
  successBox?: string;
  warningBox?: string;
  featuresTitle?: string;
  features?: NewsletterFeature[];
  ctaUrl?: string;
  ctaText?: string;
  closingText?: string;
}

export enum NewsletterType {
  WELCOME = 'welcome',
  UPDATE = 'update',
  REMINDER = 'reminder',
  TRIAL_EXPIRING = 'trial_expiring',
  SUBSCRIPTION_CONFIRMED = 'subscription_confirmed',
  CUSTOM = 'custom'
}

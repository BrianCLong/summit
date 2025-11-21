/**
 * Email Service Types
 *
 * Comprehensive type definitions for the email template system
 */

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  encoding?: string;
  cid?: string; // Content-ID for inline images
}

export interface EmailMessage {
  to: EmailAddress | EmailAddress[] | string | string[];
  from?: EmailAddress | string;
  replyTo?: EmailAddress | string;
  cc?: EmailAddress | EmailAddress[] | string | string[];
  bcc?: EmailAddress | EmailAddress[] | string | string[];
  subject: string;
  text: string;
  html: string;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  metadata?: Record<string, any>;
  templateId?: string;
  templateVersion?: string;
  abTestVariant?: string;
  trackingEnabled?: boolean;
  unsubscribeUrl?: string;
  listUnsubscribe?: string;
  priority?: 'high' | 'normal' | 'low';
}

export interface EmailTemplate {
  id: string;
  name: string;
  description?: string;
  category: EmailTemplateCategory;
  subject: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  active: boolean;

  // Template content
  mjmlContent?: string;
  reactEmailComponent?: string;

  // Metadata
  variables: TemplateVariable[];
  previewText?: string;
  tags?: string[];

  // A/B Testing
  variants?: EmailTemplateVariant[];
}

export enum EmailTemplateCategory {
  AUTH = 'auth',
  NOTIFICATION = 'notification',
  INVESTIGATION = 'investigation',
  ALERT = 'alert',
  MARKETING = 'marketing',
  TRANSACTIONAL = 'transactional',
  SYSTEM = 'system',
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'url' | 'object';
  required: boolean;
  defaultValue?: any;
  description?: string;
  example?: any;
}

export interface EmailTemplateVariant {
  id: string;
  name: string;
  weight: number; // Percentage (0-100)
  subject?: string;
  mjmlContent?: string;
  reactEmailComponent?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  recipientEmail: string;
  templateId?: string;
  templateVersion?: string;
  abTestVariant?: string;
  sentAt?: Date;
  error?: Error;
  metadata?: Record<string, any>;
}

export interface EmailProviderConfig {
  provider: 'smtp' | 'sendgrid' | 'aws-ses' | 'mailgun' | 'postmark';

  // SMTP
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth?: {
      user: string;
      pass: string;
    };
    pool?: boolean;
    maxConnections?: number;
    maxMessages?: number;
    rateDelta?: number;
    rateLimit?: number;
  };

  // API-based providers
  apiKey?: string;
  apiSecret?: string;
  region?: string;

  // General settings
  from: EmailAddress;
  replyTo?: EmailAddress;
  timeout?: number;
  retries?: number;
}

export interface EmailQueueJob {
  id: string;
  message: EmailMessage;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  scheduledFor?: Date;
  lastAttemptAt?: Date;
  error?: string;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
}

export interface EmailAnalytics {
  messageId: string;
  templateId?: string;
  recipientEmail: string;
  sentAt: Date;

  // Tracking metrics
  opened: boolean;
  openedAt?: Date;
  openCount: number;

  clicked: boolean;
  clickedAt?: Date;
  clickCount: number;
  clickedLinks: string[];

  bounced: boolean;
  bouncedAt?: Date;
  bounceType?: 'hard' | 'soft' | 'complaint';
  bounceReason?: string;

  unsubscribed: boolean;
  unsubscribedAt?: Date;

  metadata?: Record<string, any>;
}

export interface ABTestConfig {
  id: string;
  name: string;
  templateId: string;
  active: boolean;
  startDate: Date;
  endDate?: Date;

  variants: ABTestVariant[];

  // Success metrics
  goalMetric: 'open-rate' | 'click-rate' | 'conversion-rate' | 'custom';
  goalValue?: number;

  // Traffic allocation
  trafficPercentage: number; // Percentage of total traffic to include in test

  // Results
  results?: ABTestResults;
}

export interface ABTestVariant {
  id: string;
  name: string;
  templateVariantId: string;
  weight: number; // Percentage (0-100)

  // Statistics
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
  bounced: number;
}

export interface ABTestResults {
  winningVariantId?: string;
  confidence: number; // Statistical confidence (0-100)
  startDate: Date;
  endDate: Date;
  totalSent: number;

  variantResults: {
    variantId: string;
    openRate: number;
    clickRate: number;
    conversionRate: number;
    bounceRate: number;
  }[];
}

export interface UnsubscribePreferences {
  userId: string;
  email: string;

  // Global unsubscribe
  unsubscribedFromAll: boolean;
  unsubscribedAt?: Date;

  // Category-based preferences
  categories: {
    [key in EmailTemplateCategory]?: {
      subscribed: boolean;
      updatedAt: Date;
    };
  };

  // Frequency preferences
  frequency?: {
    maxEmailsPerDay?: number;
    maxEmailsPerWeek?: number;
    digestEnabled?: boolean;
    digestFrequency?: 'daily' | 'weekly' | 'monthly';
  };

  metadata?: Record<string, any>;
}

export interface SpamScoreResult {
  score: number; // 0-10, where 10 is definitely spam
  passed: boolean; // score < threshold
  threshold: number;

  issues: SpamScoreIssue[];
  suggestions: string[];

  details: {
    subjectScore: number;
    contentScore: number;
    linksScore: number;
    imagesScore: number;
    authenticationScore: number;
  };
}

export interface SpamScoreIssue {
  severity: 'critical' | 'warning' | 'info';
  category: 'subject' | 'content' | 'links' | 'images' | 'authentication' | 'formatting';
  message: string;
  fix?: string;
}

export interface DeliverabilityReport {
  emailMessage: EmailMessage;
  spamScore: SpamScoreResult;

  // Authentication checks
  authentication: {
    spfConfigured: boolean;
    dkimConfigured: boolean;
    dmarcConfigured: boolean;
  };

  // Content analysis
  contentAnalysis: {
    textToHtmlRatio: number;
    wordCount: number;
    linkCount: number;
    imageCount: number;
    hasUnsubscribeLink: boolean;
    hasPhysicalAddress: boolean;
  };

  // Recommendations
  recommendations: string[];
  overallScore: number; // 0-100, where 100 is perfect deliverability
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  version: string;
  createdAt: Date;
  createdBy: string;

  // Template content snapshot
  subject: string;
  mjmlContent?: string;
  reactEmailComponent?: string;
  variables: TemplateVariable[];

  // Metadata
  changeLog?: string;
  tags?: string[];

  // Status
  active: boolean;
  deployedAt?: Date;
  deprecated: boolean;
  deprecatedAt?: Date;
  deprecationReason?: string;
}

export interface EmailServiceConfig {
  provider: EmailProviderConfig;

  // Queue settings
  queue?: {
    enabled: boolean;
    concurrency: number;
    retryAttempts: number;
    retryBackoff: 'fixed' | 'exponential';
    retryDelay: number; // milliseconds
  };

  // Tracking settings
  tracking?: {
    enabled: boolean;
    openTracking: boolean;
    clickTracking: boolean;
    trackingDomain?: string;
  };

  // Rate limiting
  rateLimit?: {
    enabled: boolean;
    maxPerSecond?: number;
    maxPerMinute?: number;
    maxPerHour?: number;
    maxPerDay?: number;
  };

  // Deliverability
  deliverability?: {
    spamScoreThreshold: number;
    enforceAuthentication: boolean;
    requireUnsubscribeLink: boolean;
  };

  // A/B Testing
  abTesting?: {
    enabled: boolean;
    defaultTrafficPercentage: number;
    minSampleSize: number;
  };
}

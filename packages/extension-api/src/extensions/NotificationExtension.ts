import { ExtensionPoint } from '../ExtensionPoint.js';

/**
 * Notification extension point for custom notification channels
 */
export interface NotificationExtension extends ExtensionPoint<NotificationPayload, NotificationResult> {
  type: 'notification';
  name: string;
  description: string;
  channels: NotificationChannel[];
}

export type NotificationChannel = 'email' | 'slack' | 'teams' | 'webhook' | 'sms' | 'push' | 'custom';

export interface NotificationPayload {
  channel: NotificationChannel;
  recipient: string | string[];
  subject?: string;
  message: string;
  template?: string;
  templateData?: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: Record<string, any>;
  attachments?: Attachment[];
}

export interface Attachment {
  name: string;
  content: string | Buffer;
  contentType: string;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  channel: NotificationChannel;
  sentAt: Date;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Base class for notification extensions
 */
export abstract class BaseNotificationExtension implements NotificationExtension {
  readonly type = 'notification' as const;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly channels: NotificationChannel[]
  ) {}

  abstract execute(payload: NotificationPayload): Promise<NotificationResult>;

  /**
   * Validate recipient format for channel
   */
  abstract validateRecipient(channel: NotificationChannel, recipient: string): boolean;

  /**
   * Get delivery status
   */
  abstract getDeliveryStatus(messageId: string): Promise<DeliveryStatus>;
}

export interface DeliveryStatus {
  messageId: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  timestamp: Date;
  details?: string;
}

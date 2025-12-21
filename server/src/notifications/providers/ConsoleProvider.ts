import { NotificationProvider, NotificationChannel, NotificationPayload, NotificationResult } from '../types.js';
import pino from 'pino';

const logger = pino({ name: 'ConsoleProvider' });

export class ConsoleProvider implements NotificationProvider {
  channel: NotificationChannel;

  constructor(channel: NotificationChannel) {
    this.channel = channel;
  }

  async send(payload: NotificationPayload): Promise<NotificationResult> {
    const { userId, subject, message, data, templateId } = payload;

    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));

    const content = message || `Template: ${templateId} with data: ${JSON.stringify(data)}`;

    logger.info({
      channel: this.channel,
      userId,
      subject,
      content,
    }, 'Notification sent via Console');

    return {
      channel: this.channel,
      success: true,
      messageId: `console-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }
}

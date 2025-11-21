import { NotificationProvider, NotificationChannel, NotificationPayload, NotificationResult } from '../types.js';
import axios from 'axios';
import pino from 'pino';

const logger = pino({ name: 'WebhookProvider' });

export class WebhookProvider implements NotificationProvider {
  channel = NotificationChannel.WEBHOOK;

  async send(payload: NotificationPayload): Promise<NotificationResult> {
    const { data } = payload;
    const webhookUrl = data?.webhookUrl;

    if (!webhookUrl) {
      return {
        channel: this.channel,
        success: false,
        error: 'No webhookUrl provided in data',
      };
    }

    try {
      await axios.post(webhookUrl, payload);
      logger.info({ webhookUrl }, 'Webhook notification sent');
      return {
        channel: this.channel,
        success: true,
        messageId: `webhook-${Date.now()}`,
      };
    } catch (error: any) {
      logger.error({ webhookUrl, error: error.message }, 'Failed to send webhook');
      return {
        channel: this.channel,
        success: false,
        error: error.message,
      };
    }
  }
}

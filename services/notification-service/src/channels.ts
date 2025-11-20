import nodemailer from 'nodemailer';
import { WebClient } from '@slack/web-api';
import Handlebars from 'handlebars';
import {
  NotificationChannel,
  NotificationJob,
  NotificationTemplate,
  NotificationDeliveryResult,
  EmailConfig,
  SlackConfig,
  WebhookConfig
} from './types';

export interface ChannelConfig {
  email?: EmailConfig;
  slack?: SlackConfig;
  webhook?: WebhookConfig;
}

export class NotificationChannelManager {
  private emailTransporter?: nodemailer.Transporter;
  private slackClient?: WebClient;
  private webhookConfig?: WebhookConfig;

  constructor(private config: ChannelConfig) {
    this.initializeChannels();
  }

  private initializeChannels() {
    // Email
    if (this.config.email) {
      this.emailTransporter = nodemailer.createTransport({
        host: this.config.email.host,
        port: this.config.email.port,
        secure: this.config.email.secure,
        auth: this.config.email.auth
      });
    }

    // Slack
    if (this.config.slack) {
      this.slackClient = new WebClient(this.config.slack.token);
    }

    // Webhook
    if (this.config.webhook) {
      this.webhookConfig = this.config.webhook;
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    template: string,
    data: Record<string, any>
  ): Promise<NotificationDeliveryResult> {
    if (!this.emailTransporter || !this.config.email) {
      return {
        channel: NotificationChannel.EMAIL,
        success: false,
        error: 'Email not configured',
        timestamp: new Date()
      };
    }

    try {
      const compiledTemplate = Handlebars.compile(template);
      const html = compiledTemplate(data);

      const info = await this.emailTransporter.sendMail({
        from: this.config.email.from,
        to,
        subject,
        html
      });

      return {
        channel: NotificationChannel.EMAIL,
        success: true,
        messageId: info.messageId,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        channel: NotificationChannel.EMAIL,
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  async sendSlack(
    userId: string,
    template: string,
    data: Record<string, any>,
    options?: {
      channel?: string;
      threadTs?: string;
    }
  ): Promise<NotificationDeliveryResult> {
    if (!this.slackClient) {
      return {
        channel: NotificationChannel.SLACK,
        success: false,
        error: 'Slack not configured',
        timestamp: new Date()
      };
    }

    try {
      const compiledTemplate = Handlebars.compile(template);
      const text = compiledTemplate(data);

      // Send as DM or to channel
      const result = options?.channel
        ? await this.slackClient.chat.postMessage({
            channel: options.channel,
            text,
            thread_ts: options.threadTs
          })
        : await this.slackClient.chat.postMessage({
            channel: userId, // Assuming userId is Slack user ID
            text
          });

      return {
        channel: NotificationChannel.SLACK,
        success: true,
        messageId: result.ts,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        channel: NotificationChannel.SLACK,
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  async sendWebhook(
    url: string,
    data: Record<string, any>
  ): Promise<NotificationDeliveryResult> {
    try {
      const response = await fetch(url, {
        method: this.webhookConfig?.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.webhookConfig?.headers || {})
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}`);
      }

      return {
        channel: NotificationChannel.WEBHOOK,
        success: true,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        channel: NotificationChannel.WEBHOOK,
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  async sendPushNotification(
    deviceToken: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<NotificationDeliveryResult> {
    // Placeholder for push notification implementation
    // Would integrate with FCM, APNs, etc.
    return {
      channel: NotificationChannel.PUSH,
      success: false,
      error: 'Push notifications not yet implemented',
      timestamp: new Date()
    };
  }

  async sendSMS(
    phoneNumber: string,
    message: string
  ): Promise<NotificationDeliveryResult> {
    // Placeholder for SMS implementation
    // Would integrate with Twilio, AWS SNS, etc.
    return {
      channel: NotificationChannel.SMS,
      success: false,
      error: 'SMS not yet implemented',
      timestamp: new Date()
    };
  }

  async send(
    job: NotificationJob,
    template: NotificationTemplate,
    userEmail: string,
    slackUserId?: string
  ): Promise<NotificationDeliveryResult[]> {
    const results: NotificationDeliveryResult[] = [];

    for (const channel of job.channels) {
      let result: NotificationDeliveryResult;

      switch (channel) {
        case NotificationChannel.EMAIL:
          if (template.emailTemplate) {
            result = await this.sendEmail(
              userEmail,
              template.subject || 'Notification',
              template.emailTemplate,
              job.data
            );
            results.push(result);
          }
          break;

        case NotificationChannel.SLACK:
          if (template.slackTemplate && slackUserId) {
            result = await this.sendSlack(
              slackUserId,
              template.slackTemplate,
              job.data
            );
            results.push(result);
          }
          break;

        case NotificationChannel.WEBHOOK:
          if (this.webhookConfig) {
            result = await this.sendWebhook(
              this.webhookConfig.url,
              {
                template: template.name,
                data: job.data,
                userId: job.userId,
                workspaceId: job.workspaceId
              }
            );
            results.push(result);
          }
          break;

        case NotificationChannel.IN_APP:
          // In-app notifications are handled by collaboration service
          results.push({
            channel: NotificationChannel.IN_APP,
            success: true,
            timestamp: new Date()
          });
          break;

        default:
          results.push({
            channel,
            success: false,
            error: 'Channel not implemented',
            timestamp: new Date()
          });
      }
    }

    return results;
  }
}

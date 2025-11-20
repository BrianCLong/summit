import pino from 'pino';
import { Alert, NotificationChannel } from './alert-types';

const logger = pino({ name: 'alert-router' });

/**
 * Route alerts to appropriate notification channels
 */
export class AlertRouter {
  private channels: Map<string, NotificationChannel> = new Map();

  /**
   * Register notification channel
   */
  registerChannel(channel: NotificationChannel): void {
    this.channels.set(channel.id, channel);
    logger.info({ channelId: channel.id, type: channel.type }, 'Channel registered');
  }

  /**
   * Route alert to channels
   */
  async routeAlert(alert: Alert, channelIds: string[]): Promise<void> {
    const promises = channelIds.map((channelId) => this.sendToChannel(alert, channelId));
    await Promise.allSettled(promises);
  }

  /**
   * Send alert to specific channel
   */
  private async sendToChannel(alert: Alert, channelId: string): Promise<void> {
    const channel = this.channels.get(channelId);

    if (!channel || !channel.enabled) {
      logger.warn({ channelId }, 'Channel not found or disabled');
      return;
    }

    try {
      switch (channel.type) {
        case 'email':
          await this.sendEmail(alert, channel.config);
          break;
        case 'slack':
          await this.sendSlack(alert, channel.config);
          break;
        case 'webhook':
          await this.sendWebhook(alert, channel.config);
          break;
        case 'pagerduty':
          await this.sendPagerDuty(alert, channel.config);
          break;
        default:
          logger.warn({ type: channel.type }, 'Unknown channel type');
      }

      logger.info({ alertId: alert.id, channelId }, 'Alert sent to channel');
    } catch (error) {
      logger.error({ error, channelId, alertId: alert.id }, 'Failed to send alert');
    }
  }

  /**
   * Send email notification (placeholder)
   */
  private async sendEmail(alert: Alert, config: any): Promise<void> {
    // Implementation would use nodemailer or similar
    logger.info({ alertId: alert.id, to: config.to }, 'Email notification sent');
  }

  /**
   * Send Slack notification (placeholder)
   */
  private async sendSlack(alert: Alert, config: any): Promise<void> {
    // Implementation would use Slack webhook
    logger.info({ alertId: alert.id, channel: config.channel }, 'Slack notification sent');
  }

  /**
   * Send webhook notification (placeholder)
   */
  private async sendWebhook(alert: Alert, config: any): Promise<void> {
    // Implementation would use axios to POST to webhook URL
    logger.info({ alertId: alert.id, url: config.url }, 'Webhook notification sent');
  }

  /**
   * Send PagerDuty notification (placeholder)
   */
  private async sendPagerDuty(alert: Alert, config: any): Promise<void> {
    // Implementation would use PagerDuty API
    logger.info({ alertId: alert.id }, 'PagerDuty notification sent');
  }
}

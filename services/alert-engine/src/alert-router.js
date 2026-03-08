"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertRouter = void 0;
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'alert-router' });
/**
 * Route alerts to appropriate notification channels
 */
class AlertRouter {
    channels = new Map();
    /**
     * Register notification channel
     */
    registerChannel(channel) {
        this.channels.set(channel.id, channel);
        logger.info({ channelId: channel.id, type: channel.type }, 'Channel registered');
    }
    /**
     * Route alert to channels
     */
    async routeAlert(alert, channelIds) {
        const promises = channelIds.map((channelId) => this.sendToChannel(alert, channelId));
        await Promise.allSettled(promises);
    }
    /**
     * Send alert to specific channel
     */
    async sendToChannel(alert, channelId) {
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
        }
        catch (error) {
            logger.error({ error, channelId, alertId: alert.id }, 'Failed to send alert');
        }
    }
    /**
     * Send email notification (placeholder)
     */
    async sendEmail(alert, config) {
        // Implementation would use nodemailer or similar
        logger.info({ alertId: alert.id, to: config.to }, 'Email notification sent');
    }
    /**
     * Send Slack notification (placeholder)
     */
    async sendSlack(alert, config) {
        // Implementation would use Slack webhook
        logger.info({ alertId: alert.id, channel: config.channel }, 'Slack notification sent');
    }
    /**
     * Send webhook notification (placeholder)
     */
    async sendWebhook(alert, config) {
        // Implementation would use axios to POST to webhook URL
        logger.info({ alertId: alert.id, url: config.url }, 'Webhook notification sent');
    }
    /**
     * Send PagerDuty notification (placeholder)
     */
    async sendPagerDuty(alert, config) {
        // Implementation would use PagerDuty API
        logger.info({ alertId: alert.id }, 'PagerDuty notification sent');
    }
}
exports.AlertRouter = AlertRouter;

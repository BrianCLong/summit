"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookProvider = void 0;
const types_js_1 = require("../types.js");
const axios_1 = __importDefault(require("axios"));
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'WebhookProvider' });
class WebhookProvider {
    channel = types_js_1.NotificationChannel.WEBHOOK;
    async send(payload) {
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
            await axios_1.default.post(webhookUrl, payload);
            logger.info({ webhookUrl }, 'Webhook notification sent');
            return {
                channel: this.channel,
                success: true,
                messageId: `webhook-${Date.now()}`,
            };
        }
        catch (error) {
            logger.error({ webhookUrl, error: error.message }, 'Failed to send webhook');
            return {
                channel: this.channel,
                success: false,
                error: error.message,
            };
        }
    }
}
exports.WebhookProvider = WebhookProvider;

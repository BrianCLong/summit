"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleProvider = void 0;
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'ConsoleProvider' });
class ConsoleProvider {
    channel;
    constructor(channel) {
        this.channel = channel;
    }
    async send(payload) {
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
exports.ConsoleProvider = ConsoleProvider;

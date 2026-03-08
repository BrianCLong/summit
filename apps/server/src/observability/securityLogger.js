"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityLogger = void 0;
const axios_1 = __importDefault(require("axios"));
const webhookUrl = process.env.SECURITY_ALERT_WEBHOOK;
const sendToWebhook = async (payload) => {
    if (!webhookUrl)
        return;
    try {
        await axios_1.default.post(webhookUrl, payload, { timeout: 2000 });
    }
    catch (error) {
        // Avoid throwing inside logging pipeline
        console.error('Failed to send security alert', error);
    }
};
exports.securityLogger = {
    logEvent(event, data = {}) {
        const entry = {
            event,
            level: data.level || 'info',
            timestamp: new Date().toISOString(),
            ...data,
        };
        if (entry.level === 'error') {
            console.error('[security]', entry);
        }
        else if (entry.level === 'warn') {
            console.warn('[security]', entry);
        }
        else {
            console.info('[security]', entry);
        }
        void sendToWebhook(entry);
    },
};

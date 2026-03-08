"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryService = void 0;
// @ts-nocheck
const axios_1 = __importDefault(require("axios"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const validation_js_1 = require("./validation.js");
function buildTransporter() {
    if (process.env.SMTP_URL) {
        return nodemailer_1.default.createTransport(process.env.SMTP_URL);
    }
    return nodemailer_1.default.createTransport({ jsonTransport: true });
}
class DeliveryService {
    transporter;
    constructor(transporter = buildTransporter()) {
        this.transporter = transporter;
    }
    async deliver(artifact, instruction) {
        const validated = (0, validation_js_1.validateDeliveryInstruction)(instruction);
        if (!validated)
            return undefined;
        const attempts = [];
        const tasks = validated.channels.map((channel) => {
            if (channel === 'email' && validated.email) {
                return { channel, task: this.sendEmail(artifact, validated.email) };
            }
            if (channel === 'slack' && validated.slack) {
                return { channel, task: this.sendSlack(artifact, validated.slack) };
            }
            if (channel === 'webhook' && validated.webhook) {
                return { channel, task: this.sendWebhook(artifact, validated.webhook) };
            }
            return { channel, task: Promise.reject(new Error(`Unsupported channel: ${channel}`)) };
        });
        const settled = await Promise.allSettled(tasks.map((entry) => entry.task));
        settled.forEach((result, index) => {
            const channel = tasks[index]?.channel;
            if (!channel)
                return;
            if (result.status === 'fulfilled') {
                attempts.push({ channel, status: 'sent' });
            }
            else {
                attempts.push({ channel, status: 'failed', error: result.reason?.message || 'unknown error' });
            }
        });
        return { attempts };
    }
    async sendEmail(artifact, config) {
        await this.transporter.sendMail({
            to: config.to,
            cc: config.cc,
            bcc: config.bcc,
            subject: config.subject || `Report: ${artifact.fileName}`,
            text: config.body || 'Automated report delivery',
            attachments: [
                {
                    filename: artifact.fileName,
                    content: artifact.buffer,
                    contentType: artifact.mimeType,
                },
            ],
        });
    }
    async sendSlack(artifact, config) {
        const payload = {
            text: config.text || 'New report available',
            attachments: [
                {
                    title: artifact.fileName,
                    text: `Format: ${artifact.format}`,
                },
            ],
        };
        await axios_1.default.post(config.webhookUrl, payload);
    }
    async sendWebhook(artifact, config) {
        const payload = {
            ...config.payload,
            artifact: {
                fileName: artifact.fileName,
                mimeType: artifact.mimeType,
                format: artifact.format,
                size: artifact.buffer.length,
            },
        };
        await axios_1.default.post(config.url, payload, { headers: config.headers });
    }
}
exports.DeliveryService = DeliveryService;

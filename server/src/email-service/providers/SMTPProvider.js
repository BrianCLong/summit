"use strict";
// @ts-nocheck
/**
 * SMTP Email Provider
 *
 * Sends emails using SMTP with nodemailer
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SMTPProvider = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const html_to_text_1 = require("html-to-text");
const EmailProvider_js_1 = require("./EmailProvider.js");
class SMTPProvider extends EmailProvider_js_1.EmailProvider {
    transporter = null;
    config;
    constructor(config) {
        super();
        this.config = config;
    }
    async initialize() {
        if (!this.config.smtp) {
            throw new Error('SMTP configuration is required for SMTP provider');
        }
        this.transporter = nodemailer_1.default.createTransport({
            host: this.config.smtp.host,
            port: this.config.smtp.port,
            secure: this.config.smtp.secure,
            auth: this.config.smtp.auth,
            pool: this.config.smtp.pool ?? true,
            maxConnections: this.config.smtp.maxConnections ?? 5,
            maxMessages: this.config.smtp.maxMessages ?? 100,
            rateDelta: this.config.smtp.rateDelta,
            rateLimit: this.config.smtp.rateLimit,
        });
        // Verify connection
        await this.transporter.verify();
    }
    async send(message) {
        if (!this.transporter) {
            throw new Error('SMTP Provider not initialized');
        }
        const recipientEmail = this.extractPrimaryRecipient(message);
        try {
            // Ensure text version exists
            const text = message.text || (0, html_to_text_1.htmlToText)(message.html, {
                wordwrap: 130,
                preserveNewlines: true,
            });
            const mailOptions = {
                from: message.from || this.config.from,
                replyTo: message.replyTo || this.config.replyTo,
                to: message.to,
                cc: message.cc,
                bcc: message.bcc,
                subject: message.subject,
                text,
                html: message.html,
                attachments: message.attachments?.map((att) => ({
                    filename: att.filename,
                    content: att.content,
                    contentType: att.contentType,
                    encoding: att.encoding,
                    cid: att.cid,
                })),
                headers: {
                    ...message.headers,
                    'X-Priority': this.getPriority(message.priority),
                },
                priority: message.priority,
                list: message.listUnsubscribe ? {
                    unsubscribe: message.listUnsubscribe,
                } : undefined,
            };
            const info = await this.transporter.sendMail(mailOptions);
            return {
                success: true,
                messageId: info.messageId,
                recipientEmail,
                templateId: message.templateId,
                templateVersion: message.templateVersion,
                abTestVariant: message.abTestVariant,
                sentAt: new Date(),
                metadata: {
                    response: info.response,
                    accepted: info.accepted,
                    rejected: info.rejected,
                },
            };
        }
        catch (error) {
            return {
                success: false,
                recipientEmail,
                templateId: message.templateId,
                templateVersion: message.templateVersion,
                error: error,
            };
        }
    }
    async healthCheck() {
        if (!this.transporter) {
            return false;
        }
        try {
            await this.transporter.verify();
            return true;
        }
        catch {
            return false;
        }
    }
    async shutdown() {
        if (this.transporter) {
            this.transporter.close();
            this.transporter = null;
        }
    }
    extractPrimaryRecipient(message) {
        if (typeof message.to === 'string') {
            return message.to;
        }
        if (Array.isArray(message.to)) {
            const first = message.to[0];
            return typeof first === 'string' ? first : first.email;
        }
        return message.to.email;
    }
    getPriority(priority) {
        switch (priority) {
            case 'high':
                return '1';
            case 'low':
                return '5';
            default:
                return '3';
        }
    }
}
exports.SMTPProvider = SMTPProvider;

/**
 * SMTP Email Provider
 *
 * Sends emails using SMTP with nodemailer
 */

import nodemailer from 'nodemailer';
import { htmlToText } from 'html-to-text';
import { EmailProvider } from './EmailProvider.js';
import { EmailMessage, EmailSendResult, EmailProviderConfig } from '../types.js';

export class SMTPProvider extends EmailProvider {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailProviderConfig;

  constructor(config: EmailProviderConfig) {
    super();
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (!this.config.smtp) {
      throw new Error('SMTP configuration is required for SMTP provider');
    }

    this.transporter = nodemailer.createTransport({
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

  async send(message: EmailMessage): Promise<EmailSendResult> {
    if (!this.transporter) {
      throw new Error('SMTP Provider not initialized');
    }

    const recipientEmail = this.extractPrimaryRecipient(message);

    try {
      // Ensure text version exists
      const text = message.text || htmlToText(message.html, {
        wordwrap: 130,
        preserveNewlines: true,
      });

      const mailOptions: nodemailer.SendMailOptions = {
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
          encoding: att.encoding as any,
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
    } catch (error) {
      return {
        success: false,
        recipientEmail,
        templateId: message.templateId,
        templateVersion: message.templateVersion,
        error: error as Error,
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }

  async shutdown(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
    }
  }

  private extractPrimaryRecipient(message: EmailMessage): string {
    if (typeof message.to === 'string') {
      return message.to;
    }
    if (Array.isArray(message.to)) {
      const first = message.to[0];
      return typeof first === 'string' ? first : first.email;
    }
    return (message.to as any).email;
  }

  private getPriority(priority?: 'high' | 'normal' | 'low'): string {
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

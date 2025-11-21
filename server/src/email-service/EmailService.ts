/**
 * Email Service
 *
 * Main service for sending emails with support for:
 * - Multiple providers (SMTP, SendGrid, AWS SES, etc.)
 * - Queue management with retry logic
 * - Template rendering (MJML + React Email)
 * - A/B testing
 * - Analytics and tracking
 * - Unsubscribe management
 * - Spam score optimization
 */

import {
  EmailMessage,
  EmailSendResult,
  EmailServiceConfig,
  EmailTemplate,
  UnsubscribePreferences,
} from './types.js';
import { EmailProvider } from './providers/EmailProvider.js';
import { SMTPProvider } from './providers/SMTPProvider.js';
import { EmailQueue } from './EmailQueue.js';
import { TemplateRenderer } from './TemplateRenderer.js';
import { ABTestManager } from './ab-testing/ABTestManager.js';
import { EmailAnalyticsService } from './analytics/EmailAnalyticsService.js';
import { UnsubscribeManager } from './unsubscribe/UnsubscribeManager.js';
import { DeliverabilityChecker } from './deliverability/DeliverabilityChecker.js';
import { TemplateVersionManager } from './versioning/TemplateVersionManager.js';

export class EmailService {
  private provider: EmailProvider;
  private queue?: EmailQueue;
  private templateRenderer: TemplateRenderer;
  private abTestManager: ABTestManager;
  private analyticsService: EmailAnalyticsService;
  private unsubscribeManager: UnsubscribeManager;
  private deliverabilityChecker: DeliverabilityChecker;
  private versionManager: TemplateVersionManager;
  private config: EmailServiceConfig;
  private initialized: boolean = false;

  constructor(config: EmailServiceConfig) {
    this.config = config;

    // Initialize provider based on config
    this.provider = this.createProvider(config.provider);

    // Initialize queue if enabled
    if (config.queue?.enabled) {
      this.queue = new EmailQueue(config.queue);
    }

    // Initialize components
    this.templateRenderer = new TemplateRenderer();
    this.abTestManager = new ABTestManager(config.abTesting);
    this.analyticsService = new EmailAnalyticsService(config.tracking);
    this.unsubscribeManager = new UnsubscribeManager();
    this.deliverabilityChecker = new DeliverabilityChecker(config.deliverability);
    this.versionManager = new TemplateVersionManager();
  }

  /**
   * Initialize the email service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.provider.initialize();

    if (this.queue) {
      await this.queue.initialize();
    }

    await this.analyticsService.initialize();
    await this.unsubscribeManager.initialize();
    await this.versionManager.initialize();

    this.initialized = true;
  }

  /**
   * Send an email
   */
  async sendEmail(
    message: EmailMessage,
    options?: {
      skipQueue?: boolean;
      skipUnsubscribeCheck?: boolean;
      skipDeliverabilityCheck?: boolean;
      userId?: string;
    },
  ): Promise<EmailSendResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Extract recipient email
      const recipientEmail = this.extractPrimaryRecipient(message);

      // Check unsubscribe preferences
      if (!options?.skipUnsubscribeCheck) {
        const canSend = await this.checkUnsubscribePreferences(
          recipientEmail,
          message,
        );
        if (!canSend) {
          return {
            success: false,
            recipientEmail,
            error: new Error('Recipient has unsubscribed'),
            metadata: { reason: 'unsubscribed' },
          };
        }
      }

      // Check deliverability
      if (!options?.skipDeliverabilityCheck) {
        const deliverabilityReport = await this.deliverabilityChecker.check(
          message,
        );
        if (!deliverabilityReport.spamScore.passed) {
          return {
            success: false,
            recipientEmail,
            error: new Error('Email failed deliverability check'),
            metadata: {
              reason: 'spam_score_too_high',
              spamScore: deliverabilityReport.spamScore.score,
              issues: deliverabilityReport.spamScore.issues,
            },
          };
        }
      }

      // Add tracking if enabled
      if (this.config.tracking?.enabled && message.trackingEnabled !== false) {
        message = await this.addTracking(message);
      }

      // Add unsubscribe link if not present
      if (!message.unsubscribeUrl) {
        message.unsubscribeUrl = await this.generateUnsubscribeUrl(
          recipientEmail,
          options?.userId,
        );
      }

      // Send via queue or directly
      if (this.queue && !options?.skipQueue) {
        const jobId = await this.queue.enqueue(message);
        return {
          success: true,
          recipientEmail,
          messageId: jobId,
          metadata: { queued: true },
        };
      } else {
        const result = await this.provider.send(message);

        // Track sending
        if (result.success && result.messageId) {
          await this.analyticsService.trackSent({
            messageId: result.messageId,
            recipientEmail,
            templateId: message.templateId,
            sentAt: new Date(),
            metadata: message.metadata,
          });
        }

        return result;
      }
    } catch (error) {
      return {
        success: false,
        recipientEmail: this.extractPrimaryRecipient(message),
        error: error as Error,
      };
    }
  }

  /**
   * Send email from template
   */
  async sendFromTemplate(
    templateId: string,
    recipientEmail: string | EmailMessage['to'],
    variables: Record<string, any>,
    options?: {
      useABTesting?: boolean;
      variant?: string;
      userId?: string;
      skipQueue?: boolean;
    },
  ): Promise<EmailSendResult> {
    try {
      // Get template (with A/B testing if enabled)
      let template: EmailTemplate;
      let variantId: string | undefined;

      if (options?.useABTesting && this.config.abTesting?.enabled) {
        const abResult = await this.abTestManager.selectVariant(templateId);
        if (abResult) {
          template = abResult.template;
          variantId = abResult.variantId;
        } else {
          template = await this.versionManager.getActiveTemplate(templateId);
        }
      } else if (options?.variant) {
        template = await this.versionManager.getTemplateVariant(
          templateId,
          options.variant,
        );
        variantId = options.variant;
      } else {
        template = await this.versionManager.getActiveTemplate(templateId);
      }

      // Render template
      const rendered = await this.templateRenderer.render(template, variables);

      // Prepare email message
      const message: EmailMessage = {
        to: recipientEmail,
        from: this.config.provider.from,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
        templateId: template.id,
        templateVersion: template.version,
        abTestVariant: variantId,
        metadata: {
          ...variables,
          templateCategory: template.category,
        },
      };

      // Send email
      return await this.sendEmail(message, options);
    } catch (error) {
      return {
        success: false,
        recipientEmail: typeof recipientEmail === 'string' ? recipientEmail : (recipientEmail as any)[0]?.email || 'unknown',
        error: error as Error,
      };
    }
  }

  /**
   * Send bulk emails (e.g., for campaigns)
   */
  async sendBulk(
    messages: EmailMessage[],
    options?: {
      batchSize?: number;
      delayBetweenBatches?: number;
    },
  ): Promise<EmailSendResult[]> {
    const results: EmailSendResult[] = [];
    const batchSize = options?.batchSize || 100;
    const delay = options?.delayBetweenBatches || 1000;

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map((message) => this.sendEmail(message)),
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            recipientEmail: 'unknown',
            error: result.reason,
          });
        }
      }

      // Delay between batches
      if (i + batchSize < messages.length && delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return results;
  }

  /**
   * Get email analytics
   */
  async getAnalytics(messageId: string) {
    return await this.analyticsService.getAnalytics(messageId);
  }

  /**
   * Get template analytics
   */
  async getTemplateAnalytics(templateId: string, dateRange?: { start: Date; end: Date }) {
    return await this.analyticsService.getTemplateAnalytics(templateId, dateRange);
  }

  /**
   * Get A/B test results
   */
  async getABTestResults(testId: string) {
    return await this.abTestManager.getResults(testId);
  }

  /**
   * Preview email template
   */
  async previewTemplate(
    templateId: string,
    variables: Record<string, any>,
    variant?: string,
  ) {
    const template = variant
      ? await this.versionManager.getTemplateVariant(templateId, variant)
      : await this.versionManager.getActiveTemplate(templateId);

    return await this.templateRenderer.render(template, variables);
  }

  /**
   * Check deliverability for a message
   */
  async checkDeliverability(message: EmailMessage) {
    return await this.deliverabilityChecker.check(message);
  }

  /**
   * Update unsubscribe preferences
   */
  async updateUnsubscribePreferences(
    email: string,
    preferences: Partial<UnsubscribePreferences>,
  ) {
    return await this.unsubscribeManager.updatePreferences(email, preferences);
  }

  /**
   * Create or update email template
   */
  async saveTemplate(template: EmailTemplate) {
    return await this.versionManager.saveTemplate(template);
  }

  /**
   * Rollback template to previous version
   */
  async rollbackTemplate(templateId: string, version: string) {
    return await this.versionManager.rollback(templateId, version);
  }

  /**
   * Shutdown the email service
   */
  async shutdown(): Promise<void> {
    if (this.queue) {
      await this.queue.shutdown();
    }
    await this.provider.shutdown();
    this.initialized = false;
  }

  // Private helper methods

  private createProvider(config: EmailServiceConfig['provider']): EmailProvider {
    switch (config.provider) {
      case 'smtp':
        return new SMTPProvider(config);
      case 'sendgrid':
        // return new SendGridProvider(config);
        throw new Error('SendGrid provider not yet implemented');
      case 'aws-ses':
        // return new SESProvider(config);
        throw new Error('AWS SES provider not yet implemented');
      case 'mailgun':
        // return new MailgunProvider(config);
        throw new Error('Mailgun provider not yet implemented');
      case 'postmark':
        // return new PostmarkProvider(config);
        throw new Error('Postmark provider not yet implemented');
      default:
        throw new Error(`Unsupported email provider: ${config.provider}`);
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

  private async checkUnsubscribePreferences(
    email: string,
    message: EmailMessage,
  ): Promise<boolean> {
    const preferences = await this.unsubscribeManager.getPreferences(email);

    if (!preferences) {
      return true; // No preferences = can send
    }

    // Check global unsubscribe
    if (preferences.unsubscribedFromAll) {
      return false;
    }

    // Check category-based preferences
    if (message.metadata?.templateCategory) {
      const category = message.metadata.templateCategory;
      const categoryPref = preferences.categories[category];
      if (categoryPref && !categoryPref.subscribed) {
        return false;
      }
    }

    // Check frequency limits
    if (preferences.frequency) {
      const canSend = await this.unsubscribeManager.checkFrequencyLimit(
        email,
        preferences.frequency,
      );
      if (!canSend) {
        return false;
      }
    }

    return true;
  }

  private async addTracking(message: EmailMessage): Promise<EmailMessage> {
    if (this.config.tracking?.openTracking) {
      message = await this.analyticsService.addOpenTracking(message);
    }

    if (this.config.tracking?.clickTracking) {
      message = await this.analyticsService.addClickTracking(message);
    }

    return message;
  }

  private async generateUnsubscribeUrl(
    email: string,
    userId?: string,
  ): Promise<string> {
    return await this.unsubscribeManager.generateUnsubscribeUrl(email, userId);
  }
}

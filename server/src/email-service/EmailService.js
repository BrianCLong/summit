"use strict";
// @ts-nocheck
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const SMTPProvider_js_1 = require("./providers/SMTPProvider.js");
const EmailQueue_js_1 = require("./EmailQueue.js");
const TemplateRenderer_js_1 = require("./TemplateRenderer.js");
const ABTestManager_js_1 = require("./ab-testing/ABTestManager.js");
const EmailAnalyticsService_js_1 = require("./analytics/EmailAnalyticsService.js");
const UnsubscribeManager_js_1 = require("./unsubscribe/UnsubscribeManager.js");
const DeliverabilityChecker_js_1 = require("./deliverability/DeliverabilityChecker.js");
const TemplateVersionManager_js_1 = require("./versioning/TemplateVersionManager.js");
class EmailService {
    provider;
    queue;
    templateRenderer;
    abTestManager;
    analyticsService;
    unsubscribeManager;
    deliverabilityChecker;
    versionManager;
    config;
    initialized = false;
    constructor(config) {
        this.config = config;
        // Initialize provider based on config
        this.provider = this.createProvider(config.provider);
        // Initialize queue if enabled
        if (config.queue?.enabled) {
            this.queue = new EmailQueue_js_1.EmailQueue(config.queue);
        }
        // Initialize components
        this.templateRenderer = new TemplateRenderer_js_1.TemplateRenderer();
        this.abTestManager = new ABTestManager_js_1.ABTestManager(config.abTesting);
        this.analyticsService = new EmailAnalyticsService_js_1.EmailAnalyticsService(config.tracking);
        this.unsubscribeManager = new UnsubscribeManager_js_1.UnsubscribeManager();
        this.deliverabilityChecker = new DeliverabilityChecker_js_1.DeliverabilityChecker(config.deliverability);
        this.versionManager = new TemplateVersionManager_js_1.TemplateVersionManager();
    }
    /**
     * Initialize the email service
     */
    async initialize() {
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
    async sendEmail(message, options) {
        if (!this.initialized) {
            await this.initialize();
        }
        try {
            // Extract recipient email
            const recipientEmail = this.extractPrimaryRecipient(message);
            // Check unsubscribe preferences
            if (!options?.skipUnsubscribeCheck) {
                const canSend = await this.checkUnsubscribePreferences(recipientEmail, message);
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
                const deliverabilityReport = await this.deliverabilityChecker.check(message);
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
                message.unsubscribeUrl = await this.generateUnsubscribeUrl(recipientEmail, options?.userId);
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
            }
            else {
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
        }
        catch (error) {
            return {
                success: false,
                recipientEmail: this.extractPrimaryRecipient(message),
                error: error,
            };
        }
    }
    /**
     * Send email from template
     */
    async sendFromTemplate(templateId, recipientEmail, variables, options) {
        try {
            // Get template (with A/B testing if enabled)
            let template;
            let variantId;
            if (options?.useABTesting && this.config.abTesting?.enabled) {
                const abResult = await this.abTestManager.selectVariant(templateId);
                if (abResult) {
                    template = abResult.template;
                    variantId = abResult.variantId;
                }
                else {
                    template = await this.versionManager.getActiveTemplate(templateId);
                }
            }
            else if (options?.variant) {
                template = await this.versionManager.getTemplateVariant(templateId, options.variant);
                variantId = options.variant;
            }
            else {
                template = await this.versionManager.getActiveTemplate(templateId);
            }
            // Render template
            const rendered = await this.templateRenderer.render(template, variables);
            // Prepare email message
            const message = {
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
        }
        catch (error) {
            return {
                success: false,
                recipientEmail: typeof recipientEmail === 'string' ? recipientEmail : recipientEmail[0]?.email || 'unknown',
                error: error,
            };
        }
    }
    /**
     * Send bulk emails (e.g., for campaigns)
     */
    async sendBulk(messages, options) {
        const results = [];
        const batchSize = options?.batchSize || 100;
        const delay = options?.delayBetweenBatches || 1000;
        for (let i = 0; i < messages.length; i += batchSize) {
            const batch = messages.slice(i, i + batchSize);
            const batchResults = await Promise.allSettled(batch.map((message) => this.sendEmail(message)));
            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                }
                else {
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
    async getAnalytics(messageId) {
        return await this.analyticsService.getAnalytics(messageId);
    }
    /**
     * Get template analytics
     */
    async getTemplateAnalytics(templateId, dateRange) {
        return await this.analyticsService.getTemplateAnalytics(templateId, dateRange);
    }
    /**
     * Get A/B test results
     */
    async getABTestResults(testId) {
        return await this.abTestManager.getResults(testId);
    }
    /**
     * Preview email template
     */
    async previewTemplate(templateId, variables, variant) {
        const template = variant
            ? await this.versionManager.getTemplateVariant(templateId, variant)
            : await this.versionManager.getActiveTemplate(templateId);
        return await this.templateRenderer.render(template, variables);
    }
    /**
     * Check deliverability for a message
     */
    async checkDeliverability(message) {
        return await this.deliverabilityChecker.check(message);
    }
    /**
     * Update unsubscribe preferences
     */
    async updateUnsubscribePreferences(email, preferences) {
        return await this.unsubscribeManager.updatePreferences(email, preferences);
    }
    /**
     * Create or update email template
     */
    async saveTemplate(template) {
        return await this.versionManager.saveTemplate(template);
    }
    /**
     * Rollback template to previous version
     */
    async rollbackTemplate(templateId, version) {
        return await this.versionManager.rollback(templateId, version);
    }
    /**
     * Shutdown the email service
     */
    async shutdown() {
        if (this.queue) {
            await this.queue.shutdown();
        }
        await this.provider.shutdown();
        this.initialized = false;
    }
    // Private helper methods
    createProvider(config) {
        switch (config.provider) {
            case 'smtp':
                return new SMTPProvider_js_1.SMTPProvider(config);
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
    async checkUnsubscribePreferences(email, message) {
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
            const canSend = await this.unsubscribeManager.checkFrequencyLimit(email, preferences.frequency);
            if (!canSend) {
                return false;
            }
        }
        return true;
    }
    async addTracking(message) {
        if (this.config.tracking?.openTracking) {
            message = await this.analyticsService.addOpenTracking(message);
        }
        if (this.config.tracking?.clickTracking) {
            message = await this.analyticsService.addClickTracking(message);
        }
        return message;
    }
    async generateUnsubscribeUrl(email, userId) {
        return await this.unsubscribeManager.generateUnsubscribeUrl(email, userId);
    }
}
exports.EmailService = EmailService;

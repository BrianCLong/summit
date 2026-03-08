"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const types_js_1 = require("./types.js");
const ConsoleProvider_js_1 = require("./providers/ConsoleProvider.js");
const InAppProvider_js_1 = require("./providers/InAppProvider.js");
const WebhookProvider_js_1 = require("./providers/WebhookProvider.js");
const TemplateEngine_js_1 = require("./TemplateEngine.js");
const NotificationPreferenceRepo_js_1 = require("./preferences/NotificationPreferenceRepo.js");
const NotificationRepo_js_1 = require("./repo/NotificationRepo.js");
const NotificationQueue_js_1 = require("./queue/NotificationQueue.js");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'NotificationService' });
class NotificationService {
    providers = new Map();
    templateEngine;
    preferenceRepo;
    repo;
    queue;
    constructor(redisConnection) {
        this.templateEngine = new TemplateEngine_js_1.TemplateEngine();
        this.preferenceRepo = new NotificationPreferenceRepo_js_1.NotificationPreferenceRepo();
        this.repo = new NotificationRepo_js_1.NotificationRepo();
        if (redisConnection) {
            this.queue = new NotificationQueue_js_1.NotificationQueue(this, redisConnection);
        }
        // Initialize providers
        this.registerProvider(new ConsoleProvider_js_1.ConsoleProvider(types_js_1.NotificationChannel.EMAIL));
        this.registerProvider(new ConsoleProvider_js_1.ConsoleProvider(types_js_1.NotificationChannel.SMS));
        this.registerProvider(new ConsoleProvider_js_1.ConsoleProvider(types_js_1.NotificationChannel.PUSH));
        this.registerProvider(new InAppProvider_js_1.InAppProvider());
        this.registerProvider(new WebhookProvider_js_1.WebhookProvider());
    }
    registerProvider(provider) {
        this.providers.set(provider.channel, provider);
    }
    // Used for tests mainly, or manual override
    setPreferenceRepo(repo) {
        this.preferenceRepo = repo;
    }
    setNotificationRepo(repo) {
        this.repo = repo;
    }
    async getPreferences(userId) {
        return this.preferenceRepo.getPreferences(userId);
    }
    async savePreferences(userId, preferences) {
        // Validate or transform preferences if needed
        return this.preferenceRepo.setPreferences(userId, { userId, ...preferences });
    }
    async sendAsync(payload) {
        if (this.queue) {
            return this.queue.add(payload);
        }
        else {
            logger.warn('Queue not configured, sending synchronously');
            return this.send(payload);
        }
    }
    async processDigest(userId) {
        // Placeholder for digest processing logic.
        // 1. Fetch pending notifications for user that are marked for digest.
        // 2. Aggregate them.
        // 3. Send single email via send() method.
        // 4. Mark original notifications as handled/read.
        logger.info({ userId }, 'Processing digest for user');
        // Example implementation (mocked interactions)
        const prefs = await this.preferenceRepo.getPreferences(userId);
        if (!prefs || prefs.digestFrequency === 'NONE') {
            logger.info({ userId }, 'No digest preferences found or disabled');
            return;
        }
        // Logic to fetch and aggregate would go here.
        // For now, we simulate fetching unread notifications and sending a digest email.
        try {
            const unread = await this.repo.getUnread(userId);
            if (unread.length > 0) {
                const digestContent = `You have ${unread.length} unread notifications:\n` +
                    unread.map(n => `- ${n.subject || n.type}`).join('\n');
                await this.send({
                    userId,
                    type: 'digest',
                    subject: 'Your Daily Digest',
                    message: digestContent,
                    channels: [types_js_1.NotificationChannel.EMAIL]
                });
                // Mark processed notifications as read
                await Promise.all(unread.map(n => this.repo.markAsRead(n.id, userId)));
            }
        }
        catch (err) {
            logger.error({ err, userId }, 'Failed to process digest');
            return false;
        }
        return true;
    }
    async send(payload) {
        const { userId, channels, templateId, data } = payload;
        // Determine effective channels
        let effectiveChannels = channels || [];
        // If no channels specified, use user preferences or defaults
        if (effectiveChannels.length === 0) {
            try {
                const prefs = await this.preferenceRepo.getPreferences(userId);
                if (prefs) {
                    Object.entries(prefs.channels).forEach(([channel, enabled]) => {
                        if (enabled) {
                            effectiveChannels.push(channel);
                        }
                    });
                }
            }
            catch (err) {
                logger.error({ userId, err }, 'Error fetching preferences, defaulting to IN_APP');
            }
            if (effectiveChannels.length === 0) {
                // Default to IN_APP if no preferences found or empty
                effectiveChannels = [types_js_1.NotificationChannel.IN_APP];
            }
        }
        // Render message if template is provided
        if (templateId) {
            const rendered = this.templateEngine.render(templateId, data || {});
            payload.message = rendered;
        }
        const results = [];
        for (const channel of effectiveChannels) {
            const provider = this.providers.get(channel);
            if (provider) {
                try {
                    const result = await provider.send(payload);
                    results.push(result);
                }
                catch (error) {
                    logger.error({ userId, channel, error: error.message }, 'Failed to send notification');
                    results.push({
                        channel,
                        success: false,
                        error: error.message,
                    });
                }
            }
            else {
                logger.warn({ channel }, 'No provider registered for channel');
                results.push({
                    channel,
                    success: false,
                    error: 'No provider registered',
                });
            }
        }
        return results;
    }
    async sendBatch(payloads) {
        return Promise.all(payloads.map(p => this.send(p)));
    }
}
exports.NotificationService = NotificationService;

"use strict";
// @ts-nocheck
/**
 * Notification Hub - Core Service
 *
 * Central orchestration service that:
 * 1. Receives canonical events from various sources
 * 2. Determines recipients based on routing rules and preferences
 * 3. Dispatches notifications to appropriate receivers (email, chat, webhooks)
 * 4. Tracks delivery status and metrics
 * 5. Manages user/role preferences for noise control
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationHub = void 0;
const events_1 = __importDefault(require("events"));
const EventSchema_js_1 = require("./events/EventSchema.js");
const EmailReceiver_js_1 = require("./receivers/EmailReceiver.js");
const ChatReceiver_js_1 = require("./receivers/ChatReceiver.js");
const WebhookReceiver_js_1 = require("./receivers/WebhookReceiver.js");
const SMSReceiver_js_1 = require("./receivers/SMSReceiver.js");
const PushReceiver_js_1 = require("./receivers/PushReceiver.js");
class NotificationHub extends events_1.default {
    config;
    receivers;
    preferences;
    jobs;
    metrics;
    routingRules;
    initialized = false;
    constructor(config) {
        super();
        this.config = config;
        this.receivers = new Map();
        this.preferences = new Map();
        this.jobs = new Map();
        this.routingRules = config.routing?.rules || [];
        this.metrics = {
            totalEvents: 0,
            totalNotifications: 0,
            totalDelivered: 0,
            totalFailed: 0,
            byChannel: {},
            bySeverity: {},
            byEventType: {},
            averageLatencyMs: 0,
        };
    }
    /**
     * Initialize the notification hub and all receivers
     */
    async initialize() {
        if (this.initialized) {
            throw new Error('NotificationHub already initialized');
        }
        // Initialize receivers
        if (this.config.receivers.email?.enabled) {
            const emailReceiver = new EmailReceiver_js_1.EmailReceiver();
            await emailReceiver.initialize({
                enabled: true,
                name: 'Email',
                ...this.config.receivers.email.config,
            });
            this.receivers.set('email', emailReceiver);
        }
        if (this.config.receivers.chat?.enabled) {
            const chatReceiver = new ChatReceiver_js_1.ChatReceiver();
            await chatReceiver.initialize({
                enabled: true,
                name: 'Chat',
                ...this.config.receivers.chat.config,
            });
            this.receivers.set('chat', chatReceiver);
        }
        if (this.config.receivers.webhook?.enabled) {
            const webhookReceiver = new WebhookReceiver_js_1.WebhookReceiver();
            await webhookReceiver.initialize({
                enabled: true,
                name: 'Webhook',
                ...this.config.receivers.webhook.config,
            });
            this.receivers.set('webhook', webhookReceiver);
        }
        if (this.config.receivers.sms?.enabled) {
            const smsReceiver = new SMSReceiver_js_1.SMSReceiver();
            await smsReceiver.initialize({
                enabled: true,
                name: 'SMS',
                ...this.config.receivers.sms.config,
            });
            this.receivers.set('sms', smsReceiver);
        }
        if (this.config.receivers.push?.enabled) {
            const pushReceiver = new PushReceiver_js_1.PushReceiver();
            await pushReceiver.initialize({
                enabled: true,
                name: 'Push',
                ...this.config.receivers.push.config,
            });
            this.receivers.set('push', pushReceiver);
        }
        // Sort routing rules by priority
        this.routingRules.sort((a, b) => b.priority - a.priority);
        this.initialized = true;
        this.emit('initialized');
    }
    /**
     * Process an event and send notifications
     */
    async notify(event) {
        if (!this.initialized) {
            throw new Error('NotificationHub not initialized');
        }
        this.metrics.totalEvents++;
        this.incrementMetric('byEventType', event.type);
        this.incrementMetric('bySeverity', event.severity);
        // Create notification job
        const job = {
            id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            event,
            recipients: [],
            status: 'pending',
            createdAt: new Date(),
        };
        this.jobs.set(job.id, job);
        try {
            // Update event status
            event.status = EventSchema_js_1.EventStatus.PROCESSING;
            // Deduplication check
            if (await this.shouldDeduplicate(event)) {
                job.status = 'completed';
                job.processedAt = new Date();
                job.results = [{
                        recipientId: 'system',
                        channel: 'system',
                        success: true,
                        messageId: 'deduplicated',
                        error: 'Deduplicated event'
                    }];
                this.emit('notification:deduplicated', job);
                return job;
            }
            // Determine recipients based on routing rules
            const recipients = await this.resolveRecipients(event);
            job.recipients = recipients;
            // Filter recipients based on preferences
            const filteredRecipients = await this.filterByPreferences(event, recipients);
            if (filteredRecipients.length === 0) {
                job.status = 'completed';
                job.processedAt = new Date();
                event.status = EventSchema_js_1.EventStatus.DELIVERED;
                this.emit('notification:completed', job);
                return job;
            }
            // Dispatch to receivers
            job.status = 'processing';
            const startTime = Date.now();
            const results = await this.dispatchToReceivers(event, filteredRecipients);
            job.results = results;
            // Update metrics
            const latency = Date.now() - startTime;
            this.updateAverageLatency(latency);
            const successCount = results.filter((r) => r.success).length;
            const failureCount = results.filter((r) => !r.success).length;
            this.metrics.totalNotifications += results.length;
            this.metrics.totalDelivered += successCount;
            this.metrics.totalFailed += failureCount;
            // Update job status
            job.status = successCount > 0 ? 'completed' : 'failed';
            job.processedAt = new Date();
            // Update event status
            event.status = successCount > 0 ? EventSchema_js_1.EventStatus.DELIVERED : EventSchema_js_1.EventStatus.FAILED;
            this.emit('notification:completed', job);
            return job;
        }
        catch (error) {
            job.status = 'failed';
            job.error = error.message;
            job.processedAt = new Date();
            event.status = EventSchema_js_1.EventStatus.FAILED;
            this.emit('notification:failed', job, error);
            throw error;
        }
    }
    /**
     * Check if event should be deduplicated
     * Logic: Check if identical event (fingerprint) received recently
     */
    async shouldDeduplicate(event) {
        // TODO: Implement Redis-based deduplication
        // Key: `notification:dedup:${event.context.tenantId}:${fingerprint(event)}`
        // if exists -> return true
        return false;
    }
    /**
     * Resolve recipients based on routing rules
     */
    async resolveRecipients(event) {
        const recipients = [];
        // Apply routing rules
        for (const rule of this.routingRules) {
            if (!rule.enabled)
                continue;
            const matches = this.evaluateRuleConditions(rule, event);
            if (matches) {
                for (const action of rule.actions) {
                    if (action.type === 'notify' && action.recipients) {
                        const resolved = await this.resolveRecipientSpecs(action.recipients, action.channels || []);
                        recipients.push(...resolved);
                    }
                    else if (action.type === 'suppress') {
                        // Mark event as suppressed
                        return [];
                    }
                }
            }
        }
        // If no routing rules matched, use default channels
        if (recipients.length === 0 && this.config.routing?.defaultChannels) {
            // Add default recipients (would be configured per tenant/project)
            recipients.push({
                id: 'default',
                type: 'channel',
                channels: this.config.routing.defaultChannels,
                address: 'default',
            });
        }
        return recipients;
    }
    /**
     * Evaluate routing rule conditions
     */
    evaluateRuleConditions(rule, event) {
        for (const condition of rule.conditions) {
            if (!this.evaluateCondition(condition, event)) {
                return false;
            }
        }
        return true;
    }
    /**
     * Evaluate a single condition
     */
    evaluateCondition(condition, event) {
        const value = this.getFieldValue(event, condition.field);
        switch (condition.operator) {
            case 'equals':
                return value === condition.value;
            case 'not_equals':
                return value !== condition.value;
            case 'in':
                return Array.isArray(condition.value) && condition.value.includes(value);
            case 'not_in':
                return Array.isArray(condition.value) && !condition.value.includes(value);
            case 'greater_than':
                return typeof value === 'number' && value > condition.value;
            case 'less_than':
                return typeof value === 'number' && value < condition.value;
            case 'contains':
                return typeof value === 'string' && value.includes(condition.value);
            default:
                return false;
        }
    }
    /**
     * Get field value from event using dot notation
     */
    getFieldValue(event, field) {
        const parts = field.split('.');
        let value = event;
        for (const part of parts) {
            value = value?.[part];
        }
        return value;
    }
    /**
     * Resolve recipient specs to actual recipients
     */
    async resolveRecipientSpecs(specs, channels) {
        const recipients = [];
        for (const spec of specs) {
            switch (spec.type) {
                case 'user':
                    // Look up user and get their contact info
                    const userRecipient = await this.resolveUser(spec.id, channels);
                    if (userRecipient)
                        recipients.push(userRecipient);
                    break;
                case 'role':
                    // Look up all users with this role
                    const roleRecipients = await this.resolveRole(spec.id, channels);
                    recipients.push(...roleRecipients);
                    break;
                case 'team':
                    // Look up all users in this team
                    const teamRecipients = await this.resolveTeam(spec.id, channels);
                    recipients.push(...teamRecipients);
                    break;
                case 'email':
                    recipients.push({
                        id: spec.id,
                        type: 'email',
                        channels: ['email'],
                        address: spec.id,
                    });
                    break;
                // Note: 'sms' and 'push' support in routing rules would be added here
                // as new spec types if explicit routing is needed, otherwise they are
                // resolved via 'user' preferences/lookups.
                case 'channel':
                    recipients.push({
                        id: spec.id,
                        type: 'channel',
                        channels: ['chat'],
                        address: spec.id,
                    });
                    break;
                case 'webhook':
                    recipients.push({
                        id: spec.id,
                        type: 'webhook',
                        channels: ['webhook'],
                        address: spec.id,
                    });
                    break;
            }
        }
        return recipients;
    }
    /**
     * Filter recipients based on their preferences
     */
    async filterByPreferences(event, recipients) {
        const filtered = [];
        for (const recipient of recipients) {
            const prefs = await this.getUserPreferences(recipient.id);
            if (!prefs) {
                filtered.push(recipient);
                continue;
            }
            // Check quiet hours
            if (prefs.quietHours?.enabled && this.isQuietHours(prefs.quietHours)) {
                // Skip unless it's critical
                if (event.severity !== EventSchema_js_1.EventSeverity.CRITICAL) {
                    continue;
                }
            }
            // Check severity threshold
            if (prefs.severityThresholds) {
                const threshold = prefs.severityThresholds[event.type] || EventSchema_js_1.EventSeverity.MEDIUM;
                if (!this.meetsSeverityThreshold(event.severity, threshold)) {
                    continue;
                }
            }
            // Check event type filters
            if (prefs.eventTypeFilters) {
                if (prefs.eventTypeFilters.exclude?.includes(event.type)) {
                    continue;
                }
                if (prefs.eventTypeFilters.include && !prefs.eventTypeFilters.include.includes(event.type)) {
                    continue;
                }
            }
            // Filter channels based on preferences
            const enabledChannels = recipient.channels.filter((channel) => {
                const channelPref = prefs.channels[channel];
                if (!channelPref?.enabled)
                    return false;
                if (channelPref.minSeverity) {
                    if (!this.meetsSeverityThreshold(event.severity, channelPref.minSeverity)) {
                        return false;
                    }
                }
                if (channelPref.eventTypes && !channelPref.eventTypes.includes(event.type)) {
                    return false;
                }
                return true;
            });
            if (enabledChannels.length > 0) {
                filtered.push({
                    ...recipient,
                    channels: enabledChannels,
                    preferences: prefs,
                });
            }
        }
        return filtered;
    }
    /**
     * Dispatch notifications to receivers
     */
    async dispatchToReceivers(event, recipients) {
        const results = [];
        // Group recipients by channel
        const byChannel = new Map();
        for (const recipient of recipients) {
            for (const channel of recipient.channels) {
                if (!byChannel.has(channel)) {
                    byChannel.set(channel, []);
                }
                byChannel.get(channel).push(recipient);
            }
        }
        // Send to each channel
        for (const [channelName, channelRecipients] of byChannel) {
            const receiver = this.receivers.get(channelName);
            if (!receiver) {
                console.warn(`No receiver configured for channel: ${channelName}`);
                continue;
            }
            const addresses = channelRecipients.map((r) => r.address);
            try {
                const deliveryResults = await receiver.send(event, addresses);
                for (const result of deliveryResults) {
                    results.push({
                        recipientId: result.recipientId,
                        channel: channelName,
                        success: result.success,
                        messageId: result.messageId,
                        error: result.error?.message,
                        deliveredAt: result.deliveredAt,
                    });
                    this.incrementChannelMetric(channelName, 'sent');
                    if (result.success) {
                        this.incrementChannelMetric(channelName, 'delivered');
                    }
                    else {
                        this.incrementChannelMetric(channelName, 'failed');
                    }
                }
            }
            catch (error) {
                console.error(`Error sending to channel ${channelName}:`, error);
                for (const recipient of channelRecipients) {
                    results.push({
                        recipientId: recipient.id,
                        channel: channelName,
                        success: false,
                        error: error.message,
                    });
                    this.incrementChannelMetric(channelName, 'failed');
                }
            }
        }
        return results;
    }
    /**
     * User/Role/Team resolution (mock implementations - integrate with actual user service)
     */
    async resolveUser(userId, channels) {
        // Mock implementation - would query user service
        // In production: await userService.getUser(userId)
        return {
            id: userId,
            type: 'user',
            channels,
            address: `user_${userId}@example.com`,
        };
    }
    async resolveRole(roleId, channels) {
        // Mock implementation - would query user service for users with this role
        // In production: await rbacService.getUsersByRole(roleId)
        // For now, return a dummy user if role is 'admin' to simulate behavior
        if (roleId === 'admin') {
            return [{
                    id: 'admin_user_1',
                    type: 'user',
                    channels,
                    address: 'admin@example.com'
                }];
        }
        return [];
    }
    async resolveTeam(teamId, channels) {
        // Mock implementation - would query user service for team members
        // In production: await teamService.getTeamMembers(teamId)
        if (teamId === 'devops') {
            return [{
                    id: 'devops_lead',
                    type: 'user',
                    channels,
                    address: 'devops@example.com'
                }];
        }
        return [];
    }
    /**
     * Preference management
     */
    async getUserPreferences(userId) {
        return this.preferences.get(userId) || null;
    }
    async setUserPreferences(userId, preferences) {
        this.preferences.set(userId, preferences);
        this.emit('preferences:updated', userId, preferences);
    }
    /**
     * Helper methods
     */
    isQuietHours(quietHours) {
        // Implementation would check current time against quiet hours window
        return false;
    }
    meetsSeverityThreshold(actual, threshold) {
        const severityOrder = [
            EventSchema_js_1.EventSeverity.INFO,
            EventSchema_js_1.EventSeverity.LOW,
            EventSchema_js_1.EventSeverity.MEDIUM,
            EventSchema_js_1.EventSeverity.HIGH,
            EventSchema_js_1.EventSeverity.CRITICAL,
        ];
        const actualIndex = severityOrder.indexOf(actual);
        const thresholdIndex = severityOrder.indexOf(threshold);
        return actualIndex >= thresholdIndex;
    }
    incrementMetric(category, key) {
        const metrics = this.metrics[category];
        if (metrics) {
            metrics[key] = (metrics[key] || 0) + 1;
        }
    }
    incrementChannelMetric(channel, metric) {
        if (!this.metrics.byChannel[channel]) {
            this.metrics.byChannel[channel] = { sent: 0, delivered: 0, failed: 0 };
        }
        this.metrics.byChannel[channel][metric]++;
    }
    updateAverageLatency(latency) {
        const total = this.metrics.averageLatencyMs * this.metrics.totalNotifications;
        this.metrics.averageLatencyMs =
            (total + latency) / (this.metrics.totalNotifications + 1);
    }
    /**
     * Public API
     */
    getMetrics() {
        return { ...this.metrics };
    }
    getJob(jobId) {
        return this.jobs.get(jobId);
    }
    async healthCheck() {
        const health = {};
        for (const [name, receiver] of this.receivers) {
            health[name] = await receiver.healthCheck();
        }
        return health;
    }
    async shutdown() {
        for (const receiver of this.receivers.values()) {
            await receiver.shutdown();
        }
        this.receivers.clear();
        this.initialized = false;
        this.emit('shutdown');
    }
}
exports.NotificationHub = NotificationHub;

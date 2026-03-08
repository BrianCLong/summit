"use strict";
/**
 * Chat Receiver for sending notifications to chat platforms
 *
 * Abstracted implementation that supports multiple chat platforms:
 * - Slack
 * - Microsoft Teams
 * - Discord
 * - Mattermost
 * - etc.
 *
 * Each platform adapter implements the ChatAdapter interface.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomChatAdapter = exports.MattermostAdapter = exports.DiscordAdapter = exports.TeamsAdapter = exports.SlackAdapter = exports.ChatReceiver = void 0;
const ReceiverInterface_js_1 = require("./ReceiverInterface.js");
const EventSchema_js_1 = require("../events/EventSchema.js");
async function simulateDelay(simulation, defaultMin = 50, defaultMax = 150) {
    if (!simulation?.enabled)
        return;
    const min = simulation.minLatencyMs ?? defaultMin;
    const max = simulation.maxLatencyMs ?? defaultMax;
    await new Promise((resolve) => setTimeout(resolve, min + Math.random() * Math.max(0, max - min)));
}
/**
 * Chat Receiver that uses platform-specific adapters
 */
class ChatReceiver extends ReceiverInterface_js_1.BaseReceiver {
    chatConfig;
    adapter;
    constructor() {
        super('chat', 'Chat Notifications');
    }
    async onInitialize() {
        this.chatConfig = this.config;
        // Select and initialize the appropriate adapter
        this.adapter = this.createAdapter(this.chatConfig.platform);
        await this.adapter.initialize(this.chatConfig.credentials);
    }
    createAdapter(platform) {
        switch (platform) {
            case 'slack':
                return new SlackAdapter(this.chatConfig.simulation);
            case 'teams':
                return new TeamsAdapter(this.chatConfig.simulation);
            case 'discord':
                return new DiscordAdapter(this.chatConfig.simulation);
            case 'mattermost':
                return new MattermostAdapter(this.chatConfig.simulation);
            case 'custom':
                return new CustomChatAdapter(this.chatConfig.simulation);
            default:
                throw new Error(`Unsupported chat platform: ${platform}`);
        }
    }
    async deliverToRecipient(event, recipient, options) {
        try {
            const template = options?.template;
            const message = this.buildChatMessage(event, recipient, template, options);
            const messageId = await this.adapter.sendMessage(message);
            return {
                success: true,
                recipientId: recipient,
                channel: this.id,
                messageId,
                deliveredAt: new Date(),
                metadata: {
                    platform: this.chatConfig.platform,
                    channel: message.channel,
                },
            };
        }
        catch (error) {
            return {
                success: false,
                recipientId: recipient,
                channel: this.id,
                error: error,
            };
        }
    }
    buildChatMessage(event, recipient, template, options) {
        const channel = options?.channel || recipient;
        const severityEmoji = this.getSeverityEmoji(event.severity);
        const text = this.buildMessageText(event, severityEmoji, template);
        const blocks = this.buildMessageBlocks(event, severityEmoji, template);
        return {
            channel,
            text, // Fallback text
            blocks,
            threadId: options?.threadId,
            metadata: {
                eventId: event.id,
                eventType: event.type,
            },
        };
    }
    buildMessageText(event, emoji, template) {
        const body = template?.message || event.message;
        let text = `${emoji} *${template?.subject || event.title}*\n\n`;
        text += `${body}\n\n`;
        text += `Actor: ${event.actor.name} (${event.actor.type})\n`;
        text += `Subject: ${event.subject.name || event.subject.id}\n`;
        text += `Time: ${event.timestamp.toISOString()}\n`;
        const cta = template?.callToAction || event.subject.url;
        if (cta) {
            text += `\n<${cta}|View Details>`;
        }
        return text;
    }
    buildMessageBlocks(event, emoji, template) {
        const body = template?.message || event.message;
        // Generic block structure that can be adapted per platform
        const blocks = [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: `${emoji} ${template?.subject || event.title}`,
                    emoji: true,
                },
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: body,
                },
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `*Actor:* ${event.actor.name} (${event.actor.type})`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Subject:* ${event.subject.name || event.subject.id} (${event.subject.type})`,
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Severity:* ${event.severity.toUpperCase()}`,
                    },
                ],
            },
        ];
        // Add action buttons if there are links
        if (event.subject.url || (event.metadata?.links && Array.isArray(event.metadata.links))) {
            const actions = {
                type: 'actions',
                elements: [],
            };
            if (event.subject.url) {
                actions.elements.push({
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: 'View Details',
                    },
                    url: event.subject.url,
                    style: this.getButtonStyle(event.severity),
                });
            }
            if (event.metadata?.links && Array.isArray(event.metadata.links)) {
                event.metadata.links.slice(0, 4).forEach((link) => {
                    actions.elements.push({
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: link.title || link.rel,
                        },
                        url: link.href,
                    });
                });
            }
            blocks.push(actions);
        }
        // Add metadata footer
        blocks.push({
            type: 'context',
            elements: [
                {
                    type: 'mrkdwn',
                    text: `Event ID: ${event.id} | Tenant: ${event.context.tenantId}${event.context.environment ? ` | Env: ${event.context.environment}` : ''} | ${event.timestamp.toISOString()}`,
                },
            ],
        });
        return blocks;
    }
    getSeverityEmoji(severity) {
        const emojis = {
            [EventSchema_js_1.EventSeverity.CRITICAL]: '🚨',
            [EventSchema_js_1.EventSeverity.HIGH]: '⚠️',
            [EventSchema_js_1.EventSeverity.MEDIUM]: '📢',
            [EventSchema_js_1.EventSeverity.LOW]: 'ℹ️',
            [EventSchema_js_1.EventSeverity.INFO]: '💡',
        };
        return emojis[severity] || '📬';
    }
    getButtonStyle(severity) {
        if (severity === EventSchema_js_1.EventSeverity.CRITICAL || severity === EventSchema_js_1.EventSeverity.HIGH) {
            return 'danger';
        }
        return 'primary';
    }
    async validateRecipient(recipient) {
        return this.adapter.validateChannel(recipient);
    }
    async performHealthCheck() {
        return this.adapter.healthCheck();
    }
    async onShutdown() {
        await this.adapter.shutdown();
    }
}
exports.ChatReceiver = ChatReceiver;
/**
 * Slack Adapter Implementation
 */
class SlackAdapter {
    simulation;
    platform = 'slack';
    webhookUrl;
    apiToken;
    constructor(simulation) {
        this.simulation = simulation;
    }
    async initialize(credentials) {
        this.webhookUrl = credentials.webhookUrl;
        this.apiToken = credentials.apiToken;
        if (!this.webhookUrl && !this.apiToken) {
            throw new Error('Slack adapter requires either webhookUrl or apiToken');
        }
    }
    async sendMessage(message) {
        if (this.webhookUrl) {
            return this.sendViaWebhook(message);
        }
        else if (this.apiToken) {
            return this.sendViaApi(message);
        }
        throw new Error('No Slack credentials configured');
    }
    async sendViaWebhook(message) {
        const payload = {
            channel: message.channel,
            text: message.text,
            blocks: message.blocks,
        };
        // Mock implementation - replace with actual HTTP request
        await simulateDelay(this.simulation);
        return `slack_msg_${Date.now()}`;
    }
    async sendViaApi(message) {
        // Mock implementation - replace with Slack Web API client
        await simulateDelay(this.simulation);
        return `slack_msg_${Date.now()}`;
    }
    async validateChannel(channel) {
        // Slack channels start with # or are user IDs
        return channel.startsWith('#') || channel.startsWith('C') || channel.startsWith('U');
    }
    async healthCheck() {
        try {
            // In production, ping Slack API
            return true;
        }
        catch {
            return false;
        }
    }
    async shutdown() {
        // Cleanup
    }
}
exports.SlackAdapter = SlackAdapter;
/**
 * Microsoft Teams Adapter Implementation
 */
class TeamsAdapter {
    simulation;
    platform = 'teams';
    webhookUrl;
    constructor(simulation) {
        this.simulation = simulation;
    }
    async initialize(credentials) {
        this.webhookUrl = credentials.webhookUrl;
        if (!this.webhookUrl) {
            throw new Error('Teams adapter requires webhookUrl');
        }
    }
    async sendMessage(message) {
        // Convert generic blocks to Teams Adaptive Card format
        const adaptiveCard = this.convertToAdaptiveCard(message);
        // Mock implementation - replace with actual HTTP request
        await simulateDelay(this.simulation);
        return `teams_msg_${Date.now()}`;
    }
    convertToAdaptiveCard(message) {
        // Convert generic blocks to Teams Adaptive Card format
        return {
            '@type': 'MessageCard',
            '@context': 'https://schema.org/extensions',
            summary: message.text,
            text: message.text,
        };
    }
    async validateChannel(channel) {
        // Teams uses webhook URLs or channel IDs
        return channel.startsWith('http') || channel.length > 10;
    }
    async healthCheck() {
        return true;
    }
    async shutdown() {
        // Cleanup
    }
}
exports.TeamsAdapter = TeamsAdapter;
/**
 * Discord Adapter Implementation
 */
class DiscordAdapter {
    simulation;
    platform = 'discord';
    webhookUrl;
    constructor(simulation) {
        this.simulation = simulation;
    }
    async initialize(credentials) {
        this.webhookUrl = credentials.webhookUrl;
        if (!this.webhookUrl) {
            throw new Error('Discord adapter requires webhookUrl');
        }
    }
    async sendMessage(message) {
        const payload = {
            content: message.text,
            embeds: this.convertToDiscordEmbeds(message),
        };
        // Mock implementation
        await simulateDelay(this.simulation);
        return `discord_msg_${Date.now()}`;
    }
    convertToDiscordEmbeds(message) {
        // Convert generic blocks to Discord embeds
        return [];
    }
    async validateChannel(channel) {
        return channel.startsWith('http') || /^\d+$/.test(channel);
    }
    async healthCheck() {
        return true;
    }
    async shutdown() {
        // Cleanup
    }
}
exports.DiscordAdapter = DiscordAdapter;
/**
 * Mattermost Adapter Implementation
 */
class MattermostAdapter {
    simulation;
    platform = 'mattermost';
    webhookUrl;
    constructor(simulation) {
        this.simulation = simulation;
    }
    async initialize(credentials) {
        this.webhookUrl = credentials.webhookUrl;
        if (!this.webhookUrl) {
            throw new Error('Mattermost adapter requires webhookUrl');
        }
    }
    async sendMessage(message) {
        // Mattermost uses Slack-compatible format
        const payload = {
            channel: message.channel,
            text: message.text,
        };
        // Mock implementation
        await simulateDelay(this.simulation);
        return `mattermost_msg_${Date.now()}`;
    }
    async validateChannel(channel) {
        return channel.length > 0;
    }
    async healthCheck() {
        return true;
    }
    async shutdown() {
        // Cleanup
    }
}
exports.MattermostAdapter = MattermostAdapter;
/**
 * Custom Chat Adapter for generic webhook-based chat systems
 */
class CustomChatAdapter {
    simulation;
    platform = 'custom';
    webhookUrl;
    constructor(simulation) {
        this.simulation = simulation;
    }
    async initialize(credentials) {
        this.webhookUrl = credentials.webhookUrl;
        if (!this.webhookUrl) {
            throw new Error('Custom chat adapter requires webhookUrl');
        }
    }
    async sendMessage(message) {
        const payload = {
            channel: message.channel,
            text: message.text,
            blocks: message.blocks,
            metadata: message.metadata,
        };
        // Mock implementation - posts to generic webhook
        await simulateDelay(this.simulation);
        return `custom_msg_${Date.now()}`;
    }
    async validateChannel(channel) {
        return channel.length > 0;
    }
    async healthCheck() {
        return true;
    }
    async shutdown() {
        // Cleanup
    }
}
exports.CustomChatAdapter = CustomChatAdapter;

"use strict";
/**
 * Real-Time Collaboration Chat Integration via Switchboard
 * Secure chat and messaging capabilities integrated into Summit's UI,
 * routed through Switchboard for message delivery, presence, and moderation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatService = exports.SwitchboardChatService = exports.ModerationActionSchema = exports.PresenceInfoSchema = exports.ChannelSchema = exports.ChatMessageSchema = exports.ChannelTypeSchema = exports.PresenceStatusSchema = exports.ChatMessageTypeSchema = void 0;
const zod_1 = require("zod");
const events_1 = require("events");
// Message types
exports.ChatMessageTypeSchema = zod_1.z.enum([
    'text',
    'system',
    'file',
    'link',
    'code',
    'mention',
    'reaction',
    'thread_reply',
    'edited',
    'deleted',
]);
// Presence status
exports.PresenceStatusSchema = zod_1.z.enum(['online', 'away', 'busy', 'offline', 'invisible']);
// Channel types
exports.ChannelTypeSchema = zod_1.z.enum(['direct', 'group', 'public', 'private', 'investigation', 'incident']);
// Chat message schema
exports.ChatMessageSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    channelId: zod_1.z.string(),
    threadId: zod_1.z.string().optional(),
    senderId: zod_1.z.string(),
    senderName: zod_1.z.string(),
    senderAvatar: zod_1.z.string().url().optional(),
    type: exports.ChatMessageTypeSchema,
    content: zod_1.z.string(),
    formattedContent: zod_1.z.string().optional(), // HTML/Markdown rendered
    mentions: zod_1.z.array(zod_1.z.object({
        userId: zod_1.z.string(),
        displayName: zod_1.z.string(),
        startIndex: zod_1.z.number(),
        endIndex: zod_1.z.number(),
    })).optional(),
    attachments: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        type: zod_1.z.enum(['image', 'video', 'audio', 'document', 'link']),
        url: zod_1.z.string().url(),
        name: zod_1.z.string(),
        size: zod_1.z.number().optional(),
        mimeType: zod_1.z.string().optional(),
        thumbnailUrl: zod_1.z.string().url().optional(),
    })).optional(),
    reactions: zod_1.z.array(zod_1.z.object({
        emoji: zod_1.z.string(),
        count: zod_1.z.number(),
        users: zod_1.z.array(zod_1.z.string()),
    })).optional(),
    replyCount: zod_1.z.number().default(0),
    isEdited: zod_1.z.boolean().default(false),
    isDeleted: zod_1.z.boolean().default(false),
    isPinned: zod_1.z.boolean().default(false),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date().optional(),
    deletedAt: zod_1.z.date().optional(),
});
// Channel schema
exports.ChannelSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: exports.ChannelTypeSchema,
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    tenantId: zod_1.z.string(),
    creatorId: zod_1.z.string(),
    members: zod_1.z.array(zod_1.z.object({
        userId: zod_1.z.string(),
        displayName: zod_1.z.string(),
        role: zod_1.z.enum(['owner', 'admin', 'member', 'guest']),
        joinedAt: zod_1.z.date(),
        lastReadAt: zod_1.z.date().optional(),
        notificationPreference: zod_1.z.enum(['all', 'mentions', 'none']).default('all'),
    })),
    linkedResource: zod_1.z.object({
        type: zod_1.z.enum(['investigation', 'incident', 'entity', 'task']),
        id: zod_1.z.string(),
        name: zod_1.z.string(),
    }).optional(),
    settings: zod_1.z.object({
        isReadOnly: zod_1.z.boolean().default(false),
        allowThreads: zod_1.z.boolean().default(true),
        allowReactions: zod_1.z.boolean().default(true),
        allowFileUpload: zod_1.z.boolean().default(true),
        retentionDays: zod_1.z.number().int().optional(),
        moderationEnabled: zod_1.z.boolean().default(false),
    }).optional(),
    messageCount: zod_1.z.number().default(0),
    lastMessageAt: zod_1.z.date().optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    archivedAt: zod_1.z.date().optional(),
});
// Presence info
exports.PresenceInfoSchema = zod_1.z.object({
    userId: zod_1.z.string(),
    status: exports.PresenceStatusSchema,
    statusMessage: zod_1.z.string().optional(),
    lastActiveAt: zod_1.z.date(),
    currentChannel: zod_1.z.string().optional(),
    deviceType: zod_1.z.enum(['web', 'desktop', 'mobile']).optional(),
});
// Moderation action
exports.ModerationActionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: zod_1.z.enum(['warn', 'mute', 'kick', 'ban', 'delete_message', 'flag']),
    targetUserId: zod_1.z.string(),
    moderatorId: zod_1.z.string(),
    channelId: zod_1.z.string().optional(),
    messageId: zod_1.z.string().optional(),
    reason: zod_1.z.string(),
    duration: zod_1.z.number().int().optional(), // For timed actions (mute, ban)
    expiresAt: zod_1.z.date().optional(),
    createdAt: zod_1.z.date(),
});
/**
 * Real-Time Chat Service via Switchboard
 */
class SwitchboardChatService extends events_1.EventEmitter {
    channels = new Map();
    messages = new Map(); // channelId -> messages
    presence = new Map();
    typing = new Map(); // channelId -> userId -> timestamp
    config;
    // Delivery handlers for external integration
    deliveryHandler;
    presenceHandler;
    constructor(config = {}) {
        super();
        this.config = {
            maxMessageLength: 10000,
            maxAttachments: 10,
            maxChannelMembers: 500,
            typingTimeoutMs: 5000,
            presenceHeartbeatMs: 30000,
            enableModeration: true,
            moderationKeywords: [],
            logger: config.logger || console,
            metrics: config.metrics || { increment: () => { }, histogram: () => { } },
            ...config,
        };
        this.startTypingCleanup();
    }
    /**
     * Register delivery handler for message distribution
     */
    setDeliveryHandler(handler) {
        this.deliveryHandler = handler;
    }
    /**
     * Register presence broadcast handler
     */
    setPresenceHandler(handler) {
        this.presenceHandler = handler;
    }
    /**
     * Create a new channel
     */
    async createChannel(data, context) {
        const channel = {
            ...data,
            id: crypto.randomUUID(),
            messageCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.channels.set(channel.id, channel);
        this.messages.set(channel.id, []);
        this.emit('channel:created', channel);
        this.config.metrics.increment('chat.channel.created', { type: channel.type });
        this.config.logger.info('Channel created', { channelId: channel.id, type: channel.type });
        return channel;
    }
    /**
     * Get channel by ID
     */
    getChannel(channelId) {
        return this.channels.get(channelId);
    }
    /**
     * List channels for a user
     */
    listChannels(userId, tenantId) {
        return Array.from(this.channels.values()).filter((c) => c.tenantId === tenantId && c.members.some((m) => m.userId === userId) && !c.archivedAt);
    }
    /**
     * Send a message
     */
    async sendMessage(data, context) {
        const startTime = performance.now();
        // Validate channel exists
        const channel = this.channels.get(data.channelId);
        if (!channel) {
            throw new Error(`Channel not found: ${data.channelId}`);
        }
        // Check if user is member
        const member = channel.members.find((m) => m.userId === data.senderId);
        if (!member) {
            throw new Error('User is not a member of this channel');
        }
        // Check read-only
        if (channel.settings?.isReadOnly && member.role !== 'owner' && member.role !== 'admin') {
            throw new Error('Channel is read-only');
        }
        // Validate message length
        if (data.content.length > this.config.maxMessageLength) {
            throw new Error(`Message exceeds maximum length of ${this.config.maxMessageLength}`);
        }
        // Validate attachments
        if (data.attachments && data.attachments.length > this.config.maxAttachments) {
            throw new Error(`Maximum ${this.config.maxAttachments} attachments allowed`);
        }
        // Moderation check
        if (this.config.enableModeration) {
            const moderationResult = this.checkModeration(data.content, data.senderId, data.channelId);
            if (moderationResult.blocked) {
                throw new Error(`Message blocked by moderation: ${moderationResult.reason}`);
            }
        }
        const message = {
            ...data,
            id: crypto.randomUUID(),
            replyCount: 0,
            isEdited: false,
            isDeleted: false,
            isPinned: false,
            createdAt: new Date(),
        };
        // Store message
        const channelMessages = this.messages.get(data.channelId) || [];
        channelMessages.push(message);
        this.messages.set(data.channelId, channelMessages);
        // Update channel
        channel.messageCount++;
        channel.lastMessageAt = message.createdAt;
        channel.updatedAt = new Date();
        // Update thread if reply
        if (data.threadId) {
            const parentMessage = channelMessages.find((m) => m.id === data.threadId);
            if (parentMessage) {
                parentMessage.replyCount++;
            }
        }
        // Clear typing indicator
        this.clearTyping(data.channelId, data.senderId);
        // Emit events
        this.emit('message:sent', message);
        // Deliver to channel members
        if (this.deliveryHandler) {
            const targetUserIds = channel.members
                .filter((m) => m.userId !== data.senderId)
                .map((m) => m.userId);
            await this.deliveryHandler(message, targetUserIds).catch((error) => {
                this.config.logger.error('Message delivery failed', { messageId: message.id, error: error.message });
            });
        }
        // Handle mentions
        if (message.mentions?.length) {
            for (const mention of message.mentions) {
                this.emit('message:received', message); // Trigger notification
            }
        }
        const duration = performance.now() - startTime;
        this.config.metrics.increment('chat.message.sent', { channelType: channel.type });
        this.config.metrics.histogram('chat.message.send_duration', duration);
        return message;
    }
    /**
     * Edit a message
     */
    async editMessage(channelId, messageId, newContent, userId) {
        const channelMessages = this.messages.get(channelId);
        if (!channelMessages) {
            throw new Error('Channel not found');
        }
        const message = channelMessages.find((m) => m.id === messageId);
        if (!message) {
            throw new Error('Message not found');
        }
        if (message.senderId !== userId) {
            throw new Error('Cannot edit another user\'s message');
        }
        if (message.isDeleted) {
            throw new Error('Cannot edit a deleted message');
        }
        message.content = newContent;
        message.isEdited = true;
        message.updatedAt = new Date();
        this.emit('message:edited', message);
        this.config.metrics.increment('chat.message.edited');
        return message;
    }
    /**
     * Delete a message
     */
    async deleteMessage(channelId, messageId, userId, isAdmin = false) {
        const channelMessages = this.messages.get(channelId);
        if (!channelMessages) {
            throw new Error('Channel not found');
        }
        const message = channelMessages.find((m) => m.id === messageId);
        if (!message) {
            throw new Error('Message not found');
        }
        if (message.senderId !== userId && !isAdmin) {
            throw new Error('Cannot delete another user\'s message');
        }
        message.isDeleted = true;
        message.content = '[Message deleted]';
        message.deletedAt = new Date();
        this.emit('message:deleted', messageId, channelId);
        this.config.metrics.increment('chat.message.deleted');
    }
    /**
     * Add reaction to message
     */
    async addReaction(channelId, messageId, emoji, userId) {
        const channelMessages = this.messages.get(channelId);
        const message = channelMessages?.find((m) => m.id === messageId);
        if (!message) {
            throw new Error('Message not found');
        }
        if (!message.reactions) {
            message.reactions = [];
        }
        const existing = message.reactions.find((r) => r.emoji === emoji);
        if (existing) {
            if (!existing.users.includes(userId)) {
                existing.users.push(userId);
                existing.count++;
            }
        }
        else {
            message.reactions.push({ emoji, count: 1, users: [userId] });
        }
        this.emit('message:reaction', messageId, emoji, userId, true);
        this.config.metrics.increment('chat.reaction.added');
    }
    /**
     * Remove reaction from message
     */
    async removeReaction(channelId, messageId, emoji, userId) {
        const channelMessages = this.messages.get(channelId);
        const message = channelMessages?.find((m) => m.id === messageId);
        if (!message || !message.reactions)
            return;
        const existing = message.reactions.find((r) => r.emoji === emoji);
        if (existing && existing.users.includes(userId)) {
            existing.users = existing.users.filter((u) => u !== userId);
            existing.count--;
            if (existing.count === 0) {
                message.reactions = message.reactions.filter((r) => r.emoji !== emoji);
            }
        }
        this.emit('message:reaction', messageId, emoji, userId, false);
        this.config.metrics.increment('chat.reaction.removed');
    }
    /**
     * Get messages for a channel
     */
    getMessages(channelId, options) {
        let messages = this.messages.get(channelId) || [];
        if (options?.threadId) {
            messages = messages.filter((m) => m.threadId === options.threadId || m.id === options.threadId);
        }
        if (options?.before) {
            const beforeIndex = messages.findIndex((m) => m.id === options.before);
            if (beforeIndex > 0) {
                messages = messages.slice(0, beforeIndex);
            }
        }
        if (options?.after) {
            const afterIndex = messages.findIndex((m) => m.id === options.after);
            if (afterIndex >= 0) {
                messages = messages.slice(afterIndex + 1);
            }
        }
        const limit = options?.limit || 50;
        return messages.slice(-limit);
    }
    /**
     * Update presence
     */
    async updatePresence(info) {
        this.presence.set(info.userId, info);
        this.emit('presence:updated', info);
        if (this.presenceHandler) {
            await this.presenceHandler([info]).catch((error) => {
                this.config.logger.error('Presence broadcast failed', { userId: info.userId, error: error.message });
            });
        }
        this.config.metrics.increment('chat.presence.updated', { status: info.status });
    }
    /**
     * Get presence for users
     */
    getPresence(userIds) {
        return userIds
            .map((id) => this.presence.get(id))
            .filter((p) => p !== undefined);
    }
    /**
     * Start typing indicator
     */
    startTyping(channelId, userId, displayName) {
        if (!this.typing.has(channelId)) {
            this.typing.set(channelId, new Map());
        }
        const channelTyping = this.typing.get(channelId);
        channelTyping.set(userId, Date.now());
        this.emit('typing:started', { channelId, userId, displayName, timestamp: Date.now() });
    }
    /**
     * Stop typing indicator
     */
    stopTyping(channelId, userId) {
        this.clearTyping(channelId, userId);
        this.emit('typing:stopped', channelId, userId);
    }
    /**
     * Get typing users for a channel
     */
    getTypingUsers(channelId) {
        const channelTyping = this.typing.get(channelId);
        if (!channelTyping)
            return [];
        const now = Date.now();
        return Array.from(channelTyping.entries())
            .filter(([_, timestamp]) => now - timestamp < this.config.typingTimeoutMs)
            .map(([userId]) => userId);
    }
    /**
     * Join channel
     */
    async joinChannel(channelId, userId, displayName) {
        const channel = this.channels.get(channelId);
        if (!channel) {
            throw new Error('Channel not found');
        }
        if (channel.members.length >= this.config.maxChannelMembers) {
            throw new Error('Channel member limit reached');
        }
        if (!channel.members.some((m) => m.userId === userId)) {
            channel.members.push({
                userId,
                displayName,
                role: 'member',
                joinedAt: new Date(),
                notificationPreference: 'all',
            });
            channel.updatedAt = new Date();
            this.emit('member:joined', channelId, userId);
            this.config.metrics.increment('chat.member.joined');
        }
    }
    /**
     * Leave channel
     */
    async leaveChannel(channelId, userId) {
        const channel = this.channels.get(channelId);
        if (!channel)
            return;
        channel.members = channel.members.filter((m) => m.userId !== userId);
        channel.updatedAt = new Date();
        this.emit('member:left', channelId, userId);
        this.config.metrics.increment('chat.member.left');
    }
    /**
     * Apply moderation action
     */
    async moderate(action) {
        // Store moderation action (would persist in real implementation)
        this.emit('moderation:action', action);
        this.config.logger.info('Moderation action applied', {
            type: action.type,
            targetUserId: action.targetUserId,
            moderatorId: action.moderatorId,
        });
        this.config.metrics.increment('chat.moderation.action', { type: action.type });
    }
    /**
     * Check message for moderation
     */
    checkModeration(content, senderId, channelId) {
        const lowerContent = content.toLowerCase();
        // Check for blocked keywords
        for (const keyword of this.config.moderationKeywords) {
            if (lowerContent.includes(keyword.toLowerCase())) {
                return { blocked: true, reason: `Contains blocked keyword: ${keyword}` };
            }
        }
        // Add more moderation rules as needed
        return { blocked: false };
    }
    /**
     * Clear typing indicator
     */
    clearTyping(channelId, userId) {
        const channelTyping = this.typing.get(channelId);
        if (channelTyping) {
            channelTyping.delete(userId);
        }
    }
    /**
     * Start cleanup timer for expired typing indicators
     */
    startTypingCleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [channelId, channelTyping] of this.typing) {
                for (const [userId, timestamp] of channelTyping) {
                    if (now - timestamp > this.config.typingTimeoutMs) {
                        channelTyping.delete(userId);
                        this.emit('typing:stopped', channelId, userId);
                    }
                }
            }
        }, this.config.typingTimeoutMs / 2);
    }
    /**
     * Archive a channel
     */
    async archiveChannel(channelId, userId) {
        const channel = this.channels.get(channelId);
        if (!channel) {
            throw new Error('Channel not found');
        }
        const member = channel.members.find((m) => m.userId === userId);
        if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
            throw new Error('Insufficient permissions to archive channel');
        }
        channel.archivedAt = new Date();
        channel.updatedAt = new Date();
        this.emit('channel:archived', channelId);
        this.config.metrics.increment('chat.channel.archived');
    }
    /**
     * Search messages
     */
    searchMessages(tenantId, query, options) {
        const results = [];
        const lowerQuery = query.toLowerCase();
        const limit = options?.limit || 50;
        for (const [channelId, messages] of this.messages) {
            const channel = this.channels.get(channelId);
            if (!channel || channel.tenantId !== tenantId)
                continue;
            if (options?.channelIds && !options.channelIds.includes(channelId))
                continue;
            for (const message of messages) {
                if (message.isDeleted)
                    continue;
                if (message.content.toLowerCase().includes(lowerQuery)) {
                    results.push(message);
                    if (results.length >= limit)
                        break;
                }
            }
            if (results.length >= limit)
                break;
        }
        return results;
    }
}
exports.SwitchboardChatService = SwitchboardChatService;
// Export singleton
exports.chatService = new SwitchboardChatService();

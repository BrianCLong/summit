/**
 * Real-Time Collaboration Chat Integration via Switchboard
 * Secure chat and messaging capabilities integrated into Summit's UI,
 * routed through Switchboard for message delivery, presence, and moderation.
 */

import { z } from 'zod';
import { EventEmitter } from 'events';
import { SwitchboardContext, SwitchboardTarget } from './types';

// Message types
export const ChatMessageTypeSchema = z.enum([
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

export type ChatMessageType = z.infer<typeof ChatMessageTypeSchema>;

// Presence status
export const PresenceStatusSchema = z.enum(['online', 'away', 'busy', 'offline', 'invisible']);
export type PresenceStatus = z.infer<typeof PresenceStatusSchema>;

// Channel types
export const ChannelTypeSchema = z.enum(['direct', 'group', 'public', 'private', 'investigation', 'incident']);
export type ChannelType = z.infer<typeof ChannelTypeSchema>;

// Chat message schema
export const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  channelId: z.string(),
  threadId: z.string().optional(),
  senderId: z.string(),
  senderName: z.string(),
  senderAvatar: z.string().url().optional(),
  type: ChatMessageTypeSchema,
  content: z.string(),
  formattedContent: z.string().optional(), // HTML/Markdown rendered
  mentions: z.array(z.object({
    userId: z.string(),
    displayName: z.string(),
    startIndex: z.number(),
    endIndex: z.number(),
  })).optional(),
  attachments: z.array(z.object({
    id: z.string(),
    type: z.enum(['image', 'video', 'audio', 'document', 'link']),
    url: z.string().url(),
    name: z.string(),
    size: z.number().optional(),
    mimeType: z.string().optional(),
    thumbnailUrl: z.string().url().optional(),
  })).optional(),
  reactions: z.array(z.object({
    emoji: z.string(),
    count: z.number(),
    users: z.array(z.string()),
  })).optional(),
  replyCount: z.number().default(0),
  isEdited: z.boolean().default(false),
  isDeleted: z.boolean().default(false),
  isPinned: z.boolean().default(false),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
  updatedAt: z.date().optional(),
  deletedAt: z.date().optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// Channel schema
export const ChannelSchema = z.object({
  id: z.string(),
  type: ChannelTypeSchema,
  name: z.string(),
  description: z.string().optional(),
  tenantId: z.string(),
  creatorId: z.string(),
  members: z.array(z.object({
    userId: z.string(),
    displayName: z.string(),
    role: z.enum(['owner', 'admin', 'member', 'guest']),
    joinedAt: z.date(),
    lastReadAt: z.date().optional(),
    notificationPreference: z.enum(['all', 'mentions', 'none']).default('all'),
  })),
  linkedResource: z.object({
    type: z.enum(['investigation', 'incident', 'entity', 'task']),
    id: z.string(),
    name: z.string(),
  }).optional(),
  settings: z.object({
    isReadOnly: z.boolean().default(false),
    allowThreads: z.boolean().default(true),
    allowReactions: z.boolean().default(true),
    allowFileUpload: z.boolean().default(true),
    retentionDays: z.number().int().optional(),
    moderationEnabled: z.boolean().default(false),
  }).optional(),
  messageCount: z.number().default(0),
  lastMessageAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  archivedAt: z.date().optional(),
});

export type Channel = z.infer<typeof ChannelSchema>;

// Presence info
export const PresenceInfoSchema = z.object({
  userId: z.string(),
  status: PresenceStatusSchema,
  statusMessage: z.string().optional(),
  lastActiveAt: z.date(),
  currentChannel: z.string().optional(),
  deviceType: z.enum(['web', 'desktop', 'mobile']).optional(),
});

export type PresenceInfo = z.infer<typeof PresenceInfoSchema>;

// Moderation action
export const ModerationActionSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['warn', 'mute', 'kick', 'ban', 'delete_message', 'flag']),
  targetUserId: z.string(),
  moderatorId: z.string(),
  channelId: z.string().optional(),
  messageId: z.string().optional(),
  reason: z.string(),
  duration: z.number().int().optional(), // For timed actions (mute, ban)
  expiresAt: z.date().optional(),
  createdAt: z.date(),
});

export type ModerationAction = z.infer<typeof ModerationActionSchema>;

// Typing indicator
interface TypingIndicator {
  channelId: string;
  userId: string;
  displayName: string;
  timestamp: number;
}

// Chat service events
type ChatServiceEvents = {
  'message:sent': [ChatMessage];
  'message:received': [ChatMessage];
  'message:edited': [ChatMessage];
  'message:deleted': [string, string]; // messageId, channelId
  'message:reaction': [string, string, string, boolean]; // messageId, emoji, userId, added
  'channel:created': [Channel];
  'channel:updated': [Channel];
  'channel:archived': [string];
  'member:joined': [string, string]; // channelId, userId
  'member:left': [string, string];
  'presence:updated': [PresenceInfo];
  'typing:started': [TypingIndicator];
  'typing:stopped': [string, string]; // channelId, userId
  'moderation:action': [ModerationAction];
};

interface ChatServiceConfig {
  maxMessageLength?: number;
  maxAttachments?: number;
  maxChannelMembers?: number;
  typingTimeoutMs?: number;
  presenceHeartbeatMs?: number;
  enableModeration?: boolean;
  moderationKeywords?: string[];
  logger?: Logger;
  metrics?: MetricsClient;
}

interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

interface MetricsClient {
  increment(metric: string, tags?: Record<string, string>): void;
  histogram(metric: string, value: number, tags?: Record<string, string>): void;
}

/**
 * Real-Time Chat Service via Switchboard
 */
export class SwitchboardChatService extends EventEmitter {
  private channels: Map<string, Channel> = new Map();
  private messages: Map<string, ChatMessage[]> = new Map(); // channelId -> messages
  private presence: Map<string, PresenceInfo> = new Map();
  private typing: Map<string, Map<string, number>> = new Map(); // channelId -> userId -> timestamp
  private config: Required<ChatServiceConfig>;

  // Delivery handlers for external integration
  private deliveryHandler?: (message: ChatMessage, targetUserIds: string[]) => Promise<void>;
  private presenceHandler?: (presence: PresenceInfo[]) => Promise<void>;

  constructor(config: ChatServiceConfig = {}) {
    super();
    this.config = {
      maxMessageLength: 10000,
      maxAttachments: 10,
      maxChannelMembers: 500,
      typingTimeoutMs: 5000,
      presenceHeartbeatMs: 30000,
      enableModeration: true,
      moderationKeywords: [],
      logger: config.logger || console as any,
      metrics: config.metrics || { increment: () => {}, histogram: () => {} },
      ...config,
    };

    this.startTypingCleanup();
  }

  /**
   * Register delivery handler for message distribution
   */
  setDeliveryHandler(handler: (message: ChatMessage, targetUserIds: string[]) => Promise<void>): void {
    this.deliveryHandler = handler;
  }

  /**
   * Register presence broadcast handler
   */
  setPresenceHandler(handler: (presence: PresenceInfo[]) => Promise<void>): void {
    this.presenceHandler = handler;
  }

  /**
   * Create a new channel
   */
  async createChannel(
    data: Omit<Channel, 'id' | 'messageCount' | 'createdAt' | 'updatedAt'>,
    context: SwitchboardContext
  ): Promise<Channel> {
    const channel: Channel = {
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
  getChannel(channelId: string): Channel | undefined {
    return this.channels.get(channelId);
  }

  /**
   * List channels for a user
   */
  listChannels(userId: string, tenantId: string): Channel[] {
    return Array.from(this.channels.values()).filter(
      (c) => c.tenantId === tenantId && c.members.some((m) => m.userId === userId) && !c.archivedAt
    );
  }

  /**
   * Send a message
   */
  async sendMessage(
    data: Omit<ChatMessage, 'id' | 'createdAt' | 'updatedAt' | 'replyCount' | 'isEdited' | 'isDeleted' | 'isPinned'>,
    context: SwitchboardContext
  ): Promise<ChatMessage> {
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

    const message: ChatMessage = {
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
  async editMessage(
    channelId: string,
    messageId: string,
    newContent: string,
    userId: string
  ): Promise<ChatMessage> {
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
  async deleteMessage(
    channelId: string,
    messageId: string,
    userId: string,
    isAdmin = false
  ): Promise<void> {
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
  async addReaction(
    channelId: string,
    messageId: string,
    emoji: string,
    userId: string
  ): Promise<void> {
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
    } else {
      message.reactions.push({ emoji, count: 1, users: [userId] });
    }

    this.emit('message:reaction', messageId, emoji, userId, true);
    this.config.metrics.increment('chat.reaction.added');
  }

  /**
   * Remove reaction from message
   */
  async removeReaction(
    channelId: string,
    messageId: string,
    emoji: string,
    userId: string
  ): Promise<void> {
    const channelMessages = this.messages.get(channelId);
    const message = channelMessages?.find((m) => m.id === messageId);
    if (!message || !message.reactions) return;

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
  getMessages(
    channelId: string,
    options?: { limit?: number; before?: string; after?: string; threadId?: string }
  ): ChatMessage[] {
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
  async updatePresence(info: PresenceInfo): Promise<void> {
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
  getPresence(userIds: string[]): PresenceInfo[] {
    return userIds
      .map((id) => this.presence.get(id))
      .filter((p): p is PresenceInfo => p !== undefined);
  }

  /**
   * Start typing indicator
   */
  startTyping(channelId: string, userId: string, displayName: string): void {
    if (!this.typing.has(channelId)) {
      this.typing.set(channelId, new Map());
    }

    const channelTyping = this.typing.get(channelId)!;
    channelTyping.set(userId, Date.now());

    this.emit('typing:started', { channelId, userId, displayName, timestamp: Date.now() });
  }

  /**
   * Stop typing indicator
   */
  stopTyping(channelId: string, userId: string): void {
    this.clearTyping(channelId, userId);
    this.emit('typing:stopped', channelId, userId);
  }

  /**
   * Get typing users for a channel
   */
  getTypingUsers(channelId: string): string[] {
    const channelTyping = this.typing.get(channelId);
    if (!channelTyping) return [];

    const now = Date.now();
    return Array.from(channelTyping.entries())
      .filter(([_, timestamp]) => now - timestamp < this.config.typingTimeoutMs)
      .map(([userId]) => userId);
  }

  /**
   * Join channel
   */
  async joinChannel(channelId: string, userId: string, displayName: string): Promise<void> {
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
  async leaveChannel(channelId: string, userId: string): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) return;

    channel.members = channel.members.filter((m) => m.userId !== userId);
    channel.updatedAt = new Date();

    this.emit('member:left', channelId, userId);
    this.config.metrics.increment('chat.member.left');
  }

  /**
   * Apply moderation action
   */
  async moderate(action: ModerationAction): Promise<void> {
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
  private checkModeration(
    content: string,
    senderId: string,
    channelId: string
  ): { blocked: boolean; reason?: string } {
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
  private clearTyping(channelId: string, userId: string): void {
    const channelTyping = this.typing.get(channelId);
    if (channelTyping) {
      channelTyping.delete(userId);
    }
  }

  /**
   * Start cleanup timer for expired typing indicators
   */
  private startTypingCleanup(): void {
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
  async archiveChannel(channelId: string, userId: string): Promise<void> {
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
  searchMessages(
    tenantId: string,
    query: string,
    options?: { channelIds?: string[]; userId?: string; limit?: number }
  ): ChatMessage[] {
    const results: ChatMessage[] = [];
    const lowerQuery = query.toLowerCase();
    const limit = options?.limit || 50;

    for (const [channelId, messages] of this.messages) {
      const channel = this.channels.get(channelId);
      if (!channel || channel.tenantId !== tenantId) continue;
      if (options?.channelIds && !options.channelIds.includes(channelId)) continue;

      for (const message of messages) {
        if (message.isDeleted) continue;
        if (message.content.toLowerCase().includes(lowerQuery)) {
          results.push(message);
          if (results.length >= limit) break;
        }
      }

      if (results.length >= limit) break;
    }

    return results;
  }
}

// Export singleton
export const chatService = new SwitchboardChatService();

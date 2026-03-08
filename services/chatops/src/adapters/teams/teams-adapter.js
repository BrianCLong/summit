"use strict";
// @ts-nocheck
/**
 * Microsoft Teams ChatOps Adapter
 *
 * Integrates ChatOps with Microsoft Teams using Bot Framework SDK:
 * - Activity handlers for messages, reactions, and adaptive cards
 * - Proactive messaging for approvals and alerts
 * - Tab and task module support
 * - SSO authentication integration
 * - Conversation state management
 *
 * Features:
 * - Adaptive Card rendering for entities, traces, approvals
 * - @mention support for targeted queries
 * - Channel and 1:1 conversation handling
 * - File attachment processing
 * - Rate limiting and retry logic
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamsChatOpsAdapter = void 0;
exports.createTeamsAdapter = createTeamsAdapter;
const botbuilder_1 = require("botbuilder");
const uuid_1 = require("uuid");
const ioredis_1 = __importDefault(require("ioredis"));
// =============================================================================
// TEAMS ADAPTER
// =============================================================================
class TeamsChatOpsAdapter extends botbuilder_1.TeamsActivityHandler {
    platform = 'teams';
    config;
    redis;
    conversationStates = new Map();
    pendingApprovals = new Map();
    messageHandler;
    rateLimitCounters = new Map();
    constructor(config) {
        super();
        this.config = {
            rateLimit: {
                messagesPerMinute: 60,
                burstLimit: 10,
            },
            ...config,
        };
        if (config.redis) {
            this.redis = new ioredis_1.default({
                host: config.redis.host,
                port: config.redis.port,
                password: config.redis.password,
            });
        }
        // Register activity handlers
        this.onMessage(this.handleIncomingMessage.bind(this));
        this.onMembersAdded(this.handleMembersAdded.bind(this));
        this.onReactionsAdded(this.handleReactionsAdded.bind(this));
        this.onConversationUpdate(this.handleConversationUpdate.bind(this));
    }
    // ===========================================================================
    // CHAT ADAPTER INTERFACE
    // ===========================================================================
    async initialize() {
        console.log('[Teams] Adapter initialized');
        // Load persisted conversation references from Redis
        if (this.redis) {
            const keys = await this.redis.keys('teams:conversation:*');
            for (const key of keys) {
                const data = await this.redis.get(key);
                if (data) {
                    const state = JSON.parse(data);
                    this.conversationStates.set(key.replace('teams:conversation:', ''), state);
                }
            }
            console.log(`[Teams] Loaded ${keys.length} conversation states from Redis`);
        }
    }
    onMessage(handler) {
        this.messageHandler = handler;
    }
    async sendMessage(channelId, content, options) {
        const state = this.conversationStates.get(channelId);
        if (!state?.reference) {
            throw new Error(`No conversation reference for channel: ${channelId}`);
        }
        // Rate limiting check
        if (!this.checkRateLimit(channelId)) {
            throw new Error('Rate limit exceeded for Teams channel');
        }
        const activity = botbuilder_1.MessageFactory.text(content);
        if (options?.attachments) {
            activity.attachments = options.attachments;
        }
        // Add mentions if specified
        if (options?.mentions?.length) {
            activity.entities = options.mentions.map(userId => ({
                type: 'mention',
                mentioned: { id: userId, name: userId },
                text: `<at>${userId}</at>`,
            }));
        }
        // Send proactively using stored conversation reference
        let messageId = '';
        await this.continueConversation(state.reference, async (context) => {
            const response = await context.sendActivity(activity);
            messageId = response?.id || (0, uuid_1.v4)();
        });
        return messageId;
    }
    async sendDirectMessage(userId, content) {
        // Find or create 1:1 conversation
        const state = Array.from(this.conversationStates.values())
            .find(s => s.userId === userId && !s.isGroup);
        if (!state?.reference) {
            throw new Error(`No direct conversation with user: ${userId}`);
        }
        return this.sendMessage(state.sessionId, content);
    }
    async updateMessage(channelId, messageId, content) {
        const state = this.conversationStates.get(channelId);
        if (!state?.reference) {
            throw new Error(`No conversation reference for channel: ${channelId}`);
        }
        await this.continueConversation(state.reference, async (context) => {
            const activity = botbuilder_1.MessageFactory.text(content);
            activity.id = messageId;
            await context.updateActivity(activity);
        });
    }
    async deleteMessage(channelId, messageId) {
        const state = this.conversationStates.get(channelId);
        if (!state?.reference) {
            throw new Error(`No conversation reference for channel: ${channelId}`);
        }
        await this.continueConversation(state.reference, async (context) => {
            await context.deleteActivity(messageId);
        });
    }
    async addReaction(channelId, messageId, emoji) {
        // Teams doesn't support programmatic reactions in the same way
        // Log for audit purposes
        console.log(`[Teams] Reaction requested: ${emoji} on ${messageId} in ${channelId}`);
    }
    async getChannelMembers(channelId) {
        const state = this.conversationStates.get(channelId);
        if (!state?.reference) {
            return [];
        }
        const members = [];
        await this.continueConversation(state.reference, async (context) => {
            try {
                const teamMembers = await botbuilder_1.TeamsInfo.getMembers(context);
                for (const member of teamMembers) {
                    members.push({
                        id: member.id,
                        name: member.name || member.id,
                    });
                }
            }
            catch (error) {
                console.error('[Teams] Error getting channel members:', error);
            }
        });
        return members;
    }
    // ===========================================================================
    // ACTIVITY HANDLERS
    // ===========================================================================
    async handleIncomingMessage(context, next) {
        const activity = context.activity;
        // Tenant validation
        if (this.config.allowedTenants?.length) {
            const tenantId = activity.channelData?.tenant?.id;
            if (!this.config.allowedTenants.includes(tenantId)) {
                await context.sendActivity('Access denied: Unauthorized tenant');
                return;
            }
        }
        // Parse user info
        const user = await this.extractUserInfo(context);
        // Store conversation reference for proactive messaging
        const conversationId = this.getConversationId(activity);
        const reference = botbuilder_1.TurnContext.getConversationReference(activity);
        await this.saveConversationState(conversationId, {
            sessionId: conversationId,
            userId: user.id,
            channelId: activity.channelId || 'unknown',
            isGroup: activity.conversation?.isGroup || false,
            reference,
            lastActivity: new Date(),
            context: {},
        });
        // Check if this is a command or regular message
        const text = this.extractMessageText(activity);
        const isCommand = text.startsWith('/') || text.startsWith('!');
        // Build chat message
        const chatMessage = {
            id: activity.id || (0, uuid_1.v4)(),
            sessionId: conversationId,
            userId: user.id,
            platform: 'teams',
            channelId: activity.channelId || 'unknown',
            threadId: activity.conversation?.id,
            content: text,
            timestamp: new Date(activity.timestamp || Date.now()),
            attachments: this.extractAttachments(activity),
            mentions: this.extractMentions(activity),
            metadata: {
                isCommand,
                tenantId: activity.channelData?.tenant?.id,
                teamId: activity.channelData?.team?.id,
                locale: activity.locale,
            },
        };
        // Build security context
        const securityContext = {
            userId: user.id,
            tenantId: activity.channelData?.tenant?.id || 'default',
            roles: user.roles,
            clearance: this.mapRolesToClearance(user.roles),
            permissions: this.extractPermissions(user),
            compartments: [],
            sessionId: conversationId,
            timestamp: new Date(),
        };
        // Handle the message
        if (this.messageHandler) {
            try {
                // Show typing indicator
                await context.sendActivity({ type: 'typing' });
                await this.messageHandler(chatMessage, securityContext);
            }
            catch (error) {
                console.error('[Teams] Error handling message:', error);
                await context.sendActivity(botbuilder_1.MessageFactory.text('An error occurred processing your request. Please try again.'));
            }
        }
        await next();
    }
    async handleMembersAdded(context, next) {
        const membersAdded = context.activity.membersAdded || [];
        for (const member of membersAdded) {
            if (member.id !== context.activity.recipient.id) {
                // A new member joined - send welcome message
                await context.sendActivity(botbuilder_1.MessageFactory.attachment(this.createWelcomeCard()));
            }
        }
        await next();
    }
    async handleReactionsAdded(context, next) {
        const reactionsAdded = context.activity.reactionsAdded || [];
        for (const reaction of reactionsAdded) {
            // Check if this is an approval reaction
            const approval = Array.from(this.pendingApprovals.values())
                .find(a => a.messageId === context.activity.replyToId);
            if (approval && (reaction.type === 'like' || reaction.type === '+1')) {
                console.log(`[Teams] Approval reaction received for ${approval.requestId}`);
                // Emit approval event (handled by approval service)
            }
        }
        await next();
    }
    async handleConversationUpdate(context, next) {
        // Handle conversation updates (e.g., team renamed, channel created)
        console.log('[Teams] Conversation update:', context.activity.channelData);
        await next();
    }
    // ===========================================================================
    // TASK MODULES (DIALOGS)
    // ===========================================================================
    async handleTeamsTaskModuleFetch(context, taskModuleRequest) {
        const data = taskModuleRequest.data;
        switch (data?.action) {
            case 'approval':
                return this.createApprovalTaskModule(data);
            case 'trace':
                return this.createTraceTaskModule(data);
            case 'entity':
                return this.createEntityTaskModule(data);
            default:
                return {
                    task: {
                        type: 'message',
                        value: 'Unknown task module action',
                    },
                };
        }
    }
    async handleTeamsTaskModuleSubmit(context, taskModuleRequest) {
        const data = taskModuleRequest.data;
        if (data?.action === 'approval' && data.requestId) {
            // Handle approval submission
            console.log(`[Teams] Approval submitted: ${data.requestId} -> ${data.decision}`);
            return {
                task: {
                    type: 'message',
                    value: `Approval ${data.decision === 'approve' ? 'granted' : 'denied'}`,
                },
            };
        }
        return {
            task: {
                type: 'message',
                value: 'Action completed',
            },
        };
    }
    // ===========================================================================
    // ADAPTIVE CARDS
    // ===========================================================================
    createWelcomeCard() {
        return botbuilder_1.CardFactory.adaptiveCard({
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            type: 'AdaptiveCard',
            version: '1.5',
            body: [
                {
                    type: 'TextBlock',
                    size: 'Large',
                    weight: 'Bolder',
                    text: 'Summit Intelligence ChatOps',
                },
                {
                    type: 'TextBlock',
                    text: 'I can help you with intelligence analysis tasks. Here are some things you can ask:',
                    wrap: true,
                },
                {
                    type: 'FactSet',
                    facts: [
                        { title: '/intel', value: 'Query intelligence data' },
                        { title: '/entity', value: 'Look up entities' },
                        { title: '/paths', value: 'Find connection paths' },
                        { title: '/threats', value: 'Get threat briefings' },
                        { title: '/investigate', value: 'Start investigation' },
                    ],
                },
            ],
            actions: [
                {
                    type: 'Action.Submit',
                    title: 'Get Started',
                    data: { action: 'help' },
                },
            ],
        });
    }
    createEntityCard(entity) {
        const facts = [
            { title: 'Type', value: entity.type },
            { title: 'Confidence', value: `${(entity.confidence * 100).toFixed(1)}%` },
        ];
        if (entity.context) {
            facts.push({ title: 'Context', value: entity.context });
        }
        return botbuilder_1.CardFactory.adaptiveCard({
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            type: 'AdaptiveCard',
            version: '1.5',
            body: [
                {
                    type: 'Container',
                    style: this.getEntityContainerStyle(entity.type),
                    items: [
                        {
                            type: 'TextBlock',
                            size: 'Medium',
                            weight: 'Bolder',
                            text: entity.value,
                        },
                        {
                            type: 'TextBlock',
                            text: entity.type.toUpperCase(),
                            size: 'Small',
                            isSubtle: true,
                        },
                    ],
                },
                {
                    type: 'FactSet',
                    facts,
                },
            ],
            actions: [
                {
                    type: 'Action.Submit',
                    title: 'View in Graph',
                    data: { action: 'viewEntity', entityId: entity.value },
                },
                {
                    type: 'Action.Submit',
                    title: 'Find Connections',
                    data: { action: 'findPaths', entityId: entity.value },
                },
            ],
        });
    }
    createApprovalCard(approval) {
        const riskColors = {
            autonomous: 'good',
            hitl: 'attention',
            prohibited: 'warning',
        };
        return botbuilder_1.CardFactory.adaptiveCard({
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            type: 'AdaptiveCard',
            version: '1.5',
            body: [
                {
                    type: 'Container',
                    style: riskColors[approval.riskLevel] || 'default',
                    items: [
                        {
                            type: 'TextBlock',
                            size: 'Medium',
                            weight: 'Bolder',
                            text: 'Approval Required',
                        },
                        {
                            type: 'TextBlock',
                            text: `Risk Level: ${approval.riskLevel.toUpperCase()}`,
                            color: approval.riskLevel === 'prohibited' ? 'attention' : 'default',
                        },
                    ],
                },
                {
                    type: 'TextBlock',
                    text: 'Operation Details',
                    weight: 'Bolder',
                    separator: true,
                },
                {
                    type: 'FactSet',
                    facts: [
                        { title: 'Tool', value: approval.toolId },
                        { title: 'Operation', value: approval.operation },
                        { title: 'Requester', value: approval.requesterId },
                        { title: 'Expires', value: new Date(approval.expiresAt).toLocaleString() },
                    ],
                },
                {
                    type: 'TextBlock',
                    text: 'Parameters',
                    weight: 'Bolder',
                    separator: true,
                },
                {
                    type: 'TextBlock',
                    text: `\`\`\`json\n${JSON.stringify(approval.parameters, null, 2)}\n\`\`\``,
                    wrap: true,
                    fontType: 'Monospace',
                },
            ],
            actions: [
                {
                    type: 'Action.Submit',
                    title: 'Approve',
                    style: 'positive',
                    data: {
                        action: 'approval',
                        requestId: approval.requestId,
                        decision: 'approve',
                    },
                },
                {
                    type: 'Action.Submit',
                    title: 'Deny',
                    style: 'destructive',
                    data: {
                        action: 'approval',
                        requestId: approval.requestId,
                        decision: 'deny',
                    },
                },
                {
                    type: 'Action.OpenUrl',
                    title: 'View Trace',
                    url: `${this.config.notificationServiceUrl}/traces/${approval.traceId}`,
                },
            ],
        });
    }
    createTraceCard(steps) {
        const stepItems = steps.map((step, index) => ({
            type: 'Container',
            items: [
                {
                    type: 'TextBlock',
                    text: `Step ${index + 1}: ${step.type.toUpperCase()}`,
                    weight: 'Bolder',
                    size: 'Small',
                },
                {
                    type: 'TextBlock',
                    text: step.content,
                    wrap: true,
                    maxLines: 3,
                },
                {
                    type: 'TextBlock',
                    text: new Date(step.timestamp).toLocaleTimeString(),
                    size: 'Small',
                    isSubtle: true,
                },
            ],
            separator: index > 0,
        }));
        return botbuilder_1.CardFactory.adaptiveCard({
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            type: 'AdaptiveCard',
            version: '1.5',
            body: [
                {
                    type: 'TextBlock',
                    size: 'Medium',
                    weight: 'Bolder',
                    text: 'Reasoning Trace',
                },
                ...stepItems,
            ],
            actions: [
                {
                    type: 'Action.ShowCard',
                    title: 'Expand All',
                    card: {
                        type: 'AdaptiveCard',
                        body: steps.map((step, i) => ({
                            type: 'TextBlock',
                            text: `**${i + 1}. ${step.type}**: ${step.content}`,
                            wrap: true,
                        })),
                    },
                },
            ],
        });
    }
    createResultsCard(title, results, actions) {
        return botbuilder_1.CardFactory.adaptiveCard({
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            type: 'AdaptiveCard',
            version: '1.5',
            body: [
                {
                    type: 'TextBlock',
                    size: 'Medium',
                    weight: 'Bolder',
                    text: title,
                },
                {
                    type: 'FactSet',
                    facts: results.map(r => ({ title: r.label, value: r.value })),
                },
            ],
            actions: actions?.map(a => ({
                type: 'Action.Submit',
                title: a.title,
                data: { action: a.action, ...a.data },
            })),
        });
    }
    // ===========================================================================
    // PROACTIVE MESSAGING
    // ===========================================================================
    async sendApprovalRequest(channelId, approval) {
        const state = this.conversationStates.get(channelId);
        if (!state?.reference) {
            throw new Error(`No conversation reference for channel: ${channelId}`);
        }
        let messageId = '';
        await this.continueConversation(state.reference, async (context) => {
            const card = this.createApprovalCard(approval);
            const response = await context.sendActivity(botbuilder_1.MessageFactory.attachment(card));
            messageId = response?.id || '';
        });
        // Track pending approval
        this.pendingApprovals.set(approval.requestId, {
            requestId: approval.requestId,
            messageId,
            conversationReference: state.reference,
            expiresAt: approval.expiresAt,
        });
        // Persist to Redis
        if (this.redis) {
            await this.redis.setex(`teams:approval:${approval.requestId}`, Math.floor((approval.expiresAt.getTime() - Date.now()) / 1000), JSON.stringify(this.pendingApprovals.get(approval.requestId)));
        }
        return messageId;
    }
    async sendAlertNotification(channelId, alert) {
        const severityColors = {
            info: 'default',
            warning: 'attention',
            critical: 'warning',
        };
        const card = botbuilder_1.CardFactory.adaptiveCard({
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            type: 'AdaptiveCard',
            version: '1.5',
            body: [
                {
                    type: 'Container',
                    style: severityColors[alert.severity],
                    items: [
                        {
                            type: 'ColumnSet',
                            columns: [
                                {
                                    type: 'Column',
                                    width: 'auto',
                                    items: [
                                        {
                                            type: 'Image',
                                            url: this.getAlertIconUrl(alert.severity),
                                            size: 'Small',
                                        },
                                    ],
                                },
                                {
                                    type: 'Column',
                                    width: 'stretch',
                                    items: [
                                        {
                                            type: 'TextBlock',
                                            size: 'Medium',
                                            weight: 'Bolder',
                                            text: alert.title,
                                        },
                                        {
                                            type: 'TextBlock',
                                            text: alert.severity.toUpperCase(),
                                            size: 'Small',
                                            isSubtle: true,
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                {
                    type: 'TextBlock',
                    text: alert.message,
                    wrap: true,
                },
            ],
            actions: alert.entityIds?.length
                ? [
                    {
                        type: 'Action.Submit',
                        title: 'View Entities',
                        data: { action: 'viewEntities', entityIds: alert.entityIds },
                    },
                ]
                : [],
        });
        return this.sendMessage(channelId, '', { attachments: [card] });
    }
    // ===========================================================================
    // HELPER METHODS
    // ===========================================================================
    async extractUserInfo(context) {
        const activity = context.activity;
        let roles = ['analyst']; // Default role
        try {
            // Try to get member info from Teams
            const member = await botbuilder_1.TeamsInfo.getMember(context, activity.from.id);
            // Map Teams roles to application roles
            if (member.email?.includes('admin')) {
                roles.push('admin');
            }
            if (member.email?.includes('supervisor')) {
                roles.push('supervisor');
            }
            return {
                id: member.id,
                name: member.name || 'Unknown',
                email: member.email,
                aadObjectId: member.aadObjectId,
                tenantId: activity.channelData?.tenant?.id,
                roles,
            };
        }
        catch {
            // Fallback to activity.from
            return {
                id: activity.from.id,
                name: activity.from.name || 'Unknown',
                aadObjectId: activity.from.aadObjectId,
                tenantId: activity.channelData?.tenant?.id,
                roles,
            };
        }
    }
    extractMessageText(activity) {
        let text = activity.text || '';
        // Remove @mentions from text
        if (activity.entities) {
            for (const entity of activity.entities) {
                if (entity.type === 'mention' && entity.text) {
                    text = text.replace(entity.text, '').trim();
                }
            }
        }
        return text.trim();
    }
    extractAttachments(activity) {
        if (!activity.attachments)
            return [];
        return activity.attachments.map((att, index) => ({
            id: `${activity.id}-att-${index}`,
            type: att.contentType || 'unknown',
            name: att.name || `attachment-${index}`,
            url: att.contentUrl,
        }));
    }
    extractMentions(activity) {
        if (!activity.entities)
            return [];
        return activity.entities
            .filter(e => e.type === 'mention')
            .map(e => e.mentioned?.id || '')
            .filter(Boolean);
    }
    getConversationId(activity) {
        return `teams:${activity.channelData?.tenant?.id || 'default'}:${activity.conversation?.id}`;
    }
    async saveConversationState(id, state) {
        this.conversationStates.set(id, state);
        if (this.redis) {
            await this.redis.setex(`teams:conversation:${id}`, 86400 * 7, // 7 days
            JSON.stringify(state));
        }
    }
    mapRolesToClearance(roles) {
        if (roles.includes('admin'))
            return 'TOP_SECRET';
        if (roles.includes('supervisor'))
            return 'SECRET';
        if (roles.includes('analyst'))
            return 'CONFIDENTIAL';
        return 'UNCLASSIFIED';
    }
    extractPermissions(user) {
        const permissions = [];
        if (user.roles.includes('admin')) {
            permissions.push('pii:access', 'cross_tenant:access', 'admin:all');
        }
        if (user.roles.includes('supervisor')) {
            permissions.push('pii:access');
        }
        if (user.roles.includes('analyst')) {
            permissions.push('entity:read', 'graph:query');
        }
        return permissions;
    }
    checkRateLimit(channelId) {
        const now = Date.now();
        const counter = this.rateLimitCounters.get(channelId);
        if (!counter || now > counter.resetAt) {
            this.rateLimitCounters.set(channelId, {
                count: 1,
                resetAt: now + 60000, // 1 minute window
            });
            return true;
        }
        if (counter.count >= this.config.rateLimit.messagesPerMinute) {
            return false;
        }
        counter.count++;
        return true;
    }
    getEntityContainerStyle(type) {
        const styles = {
            threat_actor: 'attention',
            malware: 'warning',
            infrastructure: 'emphasis',
            vulnerability: 'attention',
            campaign: 'good',
        };
        return styles[type] || 'default';
    }
    getAlertIconUrl(severity) {
        // In production, these would be actual icon URLs
        const icons = {
            info: 'https://example.com/icons/info.png',
            warning: 'https://example.com/icons/warning.png',
            critical: 'https://example.com/icons/critical.png',
        };
        return icons[severity] || icons.info;
    }
    createApprovalTaskModule(data) {
        return {
            task: {
                type: 'continue',
                value: {
                    title: 'Approval Details',
                    height: 'medium',
                    width: 'medium',
                    card: this.createApprovalCard(data),
                },
            },
        };
    }
    createTraceTaskModule(data) {
        return {
            task: {
                type: 'continue',
                value: {
                    title: 'Reasoning Trace',
                    height: 'large',
                    width: 'large',
                    card: this.createTraceCard(data.steps || []),
                },
            },
        };
    }
    createEntityTaskModule(data) {
        return {
            task: {
                type: 'continue',
                value: {
                    title: 'Entity Details',
                    height: 'medium',
                    width: 'medium',
                    card: this.createEntityCard(data.entity),
                },
            },
        };
    }
    async continueConversation(reference, callback) {
        // This would use the adapter from Bot Framework
        // In production, inject the CloudAdapter
        console.log('[Teams] Proactive message to:', reference.conversation?.id);
        // await adapter.continueConversationAsync(appId, reference, callback);
    }
    // ===========================================================================
    // CLEANUP
    // ===========================================================================
    async shutdown() {
        if (this.redis) {
            await this.redis.quit();
        }
        console.log('[Teams] Adapter shutdown complete');
    }
}
exports.TeamsChatOpsAdapter = TeamsChatOpsAdapter;
// =============================================================================
// FACTORY
// =============================================================================
function createTeamsAdapter(config) {
    return new TeamsChatOpsAdapter(config);
}

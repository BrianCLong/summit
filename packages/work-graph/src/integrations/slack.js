"use strict";
/**
 * Summit Work Graph - Slack Integration
 *
 * Real-time notifications and interactive features:
 * - Commitment alerts
 * - Work updates
 * - Agent notifications
 * - Interactive ticket creation
 * - Approval workflows
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlackIntegration = void 0;
// ============================================
// Slack Integration
// ============================================
class SlackIntegration {
    config;
    eventBus;
    preferences = new Map();
    threadMap = new Map(); // nodeId -> thread_ts
    constructor(config, eventBus) {
        this.config = config;
        this.eventBus = eventBus;
        this.setupEventListeners();
    }
    // ============================================
    // Event-Driven Notifications
    // ============================================
    setupEventListeners() {
        // Commitment alerts
        this.eventBus.subscribe({ types: ['commitment.at_risk', 'commitment.broken'] }, async (event) => this.handleCommitmentAlert(event));
        // Ticket updates
        this.eventBus.subscribe({ types: ['ticket.completed', 'ticket.blocked'] }, async (event) => this.handleTicketUpdate(event));
        // Agent activity
        this.eventBus.subscribe({ types: ['contract.assigned', 'work.completed'] }, async (event) => this.handleAgentActivity(event));
        // PR events
        this.eventBus.subscribe({ types: ['pr.opened', 'pr.merged'] }, async (event) => this.handlePREvent(event));
    }
    async handleCommitmentAlert(event) {
        const { commitmentId, customer, confidence, daysRemaining } = event.payload;
        const color = event.type === 'commitment.broken' ? '#dc3545' : '#ffc107';
        const emoji = event.type === 'commitment.broken' ? '🚨' : '⚠️';
        await this.sendMessage({
            channel: this.config.channels.commitments,
            text: `${emoji} Commitment Alert: ${event.type}`,
            blocks: [
                {
                    type: 'header',
                    text: { type: 'plain_text', text: `${emoji} Commitment Alert`, emoji: true },
                },
                {
                    type: 'section',
                    fields: [
                        { type: 'mrkdwn', text: `*Customer:*\n${customer}` },
                        { type: 'mrkdwn', text: `*Status:*\n${event.type.replace('commitment.', '')}` },
                        { type: 'mrkdwn', text: `*Confidence:*\n${confidence ? `${(confidence * 100).toFixed(0)}%` : 'N/A'}` },
                        { type: 'mrkdwn', text: `*Days Remaining:*\n${daysRemaining ?? 'N/A'}` },
                    ],
                },
                {
                    type: 'actions',
                    elements: [
                        {
                            type: 'button',
                            text: { type: 'plain_text', text: 'View Details', emoji: true },
                            action_id: 'view_commitment',
                            value: commitmentId,
                        },
                        {
                            type: 'button',
                            text: { type: 'plain_text', text: 'Escalate', emoji: true },
                            action_id: 'escalate_commitment',
                            value: commitmentId,
                            style: 'danger',
                        },
                    ],
                },
            ],
        });
    }
    async handleTicketUpdate(event) {
        const { ticketId, title, assignee } = event.payload;
        const emoji = event.type === 'ticket.completed' ? '✅' : '🚫';
        const color = event.type === 'ticket.completed' ? '#28a745' : '#dc3545';
        const message = {
            channel: this.config.channels.engineering,
            text: `${emoji} ${event.type}: ${title}`,
            attachments: [
                {
                    color,
                    title: title ?? ticketId,
                    text: event.type === 'ticket.completed'
                        ? `Completed by ${assignee ?? 'unknown'}`
                        : 'Ticket is blocked',
                    footer: `Ticket ID: ${ticketId}`,
                    ts: Math.floor(Date.now() / 1000),
                },
            ],
        };
        // Thread to existing conversation if exists
        const threadTs = this.threadMap.get(ticketId);
        if (threadTs) {
            message.thread_ts = threadTs;
        }
        await this.sendMessage(message);
    }
    async handleAgentActivity(event) {
        const { contractId, agentId, agentName, quality } = event.payload;
        const emoji = event.type === 'work.completed' ? '🤖✅' : '🤖📝';
        await this.sendMessage({
            channel: this.config.channels.agents,
            text: `${emoji} Agent Activity: ${event.type}`,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: event.type === 'work.completed'
                            ? `*${agentName ?? agentId}* completed work on contract \`${contractId}\``
                            : `*${agentName ?? agentId}* was assigned contract \`${contractId}\``,
                    },
                    accessory: quality
                        ? {
                            type: 'button',
                            text: { type: 'plain_text', text: `Quality: ${(quality * 100).toFixed(0)}%` },
                            action_id: 'view_agent',
                            value: agentId,
                        }
                        : undefined,
                },
            ],
        });
    }
    async handlePREvent(event) {
        const { prNumber, prId, title, author } = event.payload;
        const emoji = event.type === 'pr.merged' ? '🎉' : '📝';
        await this.sendMessage({
            channel: this.config.channels.engineering,
            text: `${emoji} PR #${prNumber}: ${title}`,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `${emoji} *PR #${prNumber}* ${event.type === 'pr.merged' ? 'merged' : 'opened'}\n>${title}\n_by ${author}_`,
                    },
                },
            ],
        });
    }
    // ============================================
    // Notification Methods
    // ============================================
    /**
     * Send a formatted message to Slack
     */
    async sendMessage(message) {
        const response = await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.config.botToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });
        const result = await response.json();
        return result;
    }
    /**
     * Send daily digest
     */
    async sendDailyDigest(metrics) {
        const blocks = [
            {
                type: 'header',
                text: { type: 'plain_text', text: '📊 Daily Engineering Digest', emoji: true },
            },
            { type: 'divider' },
            {
                type: 'section',
                fields: [
                    { type: 'mrkdwn', text: `*Tickets Completed:*\n${metrics.ticketsCompleted}` },
                    { type: 'mrkdwn', text: `*Velocity:*\n${metrics.velocity} pts` },
                    { type: 'mrkdwn', text: `*Commitments On Track:*\n${metrics.commitments.onTrack}` },
                    { type: 'mrkdwn', text: `*Commitments At Risk:*\n${metrics.commitments.atRisk}` },
                    { type: 'mrkdwn', text: `*Agent Completions:*\n${metrics.agentCompletions}` },
                ],
            },
        ];
        if (metrics.blockers.length > 0) {
            blocks.push({ type: 'divider' });
            blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*🚫 Current Blockers:*\n${metrics.blockers.map((b) => `• ${b}`).join('\n')}`,
                },
            });
        }
        await this.sendMessage({
            channel: this.config.channels.engineering,
            text: '📊 Daily Engineering Digest',
            blocks,
        });
    }
    /**
     * Notify about critical commitment
     */
    async notifyCriticalCommitment(commitment) {
        await this.sendMessage({
            channel: this.config.channels.alerts,
            text: `🚨 CRITICAL: Commitment to ${commitment.promisedTo} at risk!`,
            blocks: [
                {
                    type: 'header',
                    text: { type: 'plain_text', text: '🚨 Critical Commitment Alert', emoji: true },
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*${commitment.title}*\nPromised to: *${commitment.promisedTo}*\nDue: ${commitment.dueDate.toLocaleDateString()}\nConfidence: ${(commitment.confidence * 100).toFixed(0)}%`,
                    },
                },
                {
                    type: 'context',
                    elements: [
                        { type: 'mrkdwn', text: `Promised by: ${commitment.createdBy}` },
                    ],
                },
                {
                    type: 'actions',
                    elements: [
                        {
                            type: 'button',
                            text: { type: 'plain_text', text: '🔍 Investigate' },
                            action_id: 'investigate_commitment',
                            value: commitment.id,
                            style: 'danger',
                        },
                        {
                            type: 'button',
                            text: { type: 'plain_text', text: '📞 Contact Customer' },
                            action_id: 'contact_customer',
                            value: commitment.id,
                        },
                    ],
                },
            ],
        });
    }
    // ============================================
    // Interactive Handlers
    // ============================================
    /**
     * Handle Slack interactions
     */
    async handleInteraction(interaction) {
        if (!interaction.actions || interaction.actions.length === 0) {
            return {};
        }
        const action = interaction.actions[0];
        switch (action.action_id) {
            case 'view_commitment':
                return this.handleViewCommitment(action.value);
            case 'escalate_commitment':
                return this.handleEscalateCommitment(action.value, interaction.user);
            case 'view_agent':
                return this.handleViewAgent(action.value);
            case 'create_ticket':
                return this.openTicketModal(interaction.trigger_id);
            default:
                return {};
        }
    }
    async handleViewCommitment(commitmentId) {
        // Would fetch commitment details and return modal or ephemeral message
        return {
            response: {
                response_type: 'ephemeral',
                text: `Viewing commitment ${commitmentId}`,
            },
        };
    }
    async handleEscalateCommitment(commitmentId, user) {
        await this.eventBus.publish({
            type: 'commitment.at_risk',
            source: { system: 'slack', component: 'interaction' },
            actor: { id: user.id, type: 'human', name: user.username },
            payload: { commitmentId, escalatedBy: user.username },
        });
        return {
            response: {
                response_type: 'in_channel',
                text: `🚨 @here Commitment escalated by <@${user.id}>`,
            },
        };
    }
    async handleViewAgent(agentId) {
        return {
            response: {
                response_type: 'ephemeral',
                text: `Viewing agent ${agentId}`,
            },
        };
    }
    async openTicketModal(triggerId) {
        await fetch('https://slack.com/api/views.open', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.config.botToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                trigger_id: triggerId,
                view: {
                    type: 'modal',
                    title: { type: 'plain_text', text: 'Create Ticket' },
                    submit: { type: 'plain_text', text: 'Create' },
                    blocks: [
                        {
                            type: 'input',
                            block_id: 'title',
                            label: { type: 'plain_text', text: 'Title' },
                            element: { type: 'plain_text_input', action_id: 'title_input' },
                        },
                        {
                            type: 'input',
                            block_id: 'description',
                            label: { type: 'plain_text', text: 'Description' },
                            element: {
                                type: 'plain_text_input',
                                action_id: 'description_input',
                                multiline: true,
                            },
                        },
                        {
                            type: 'input',
                            block_id: 'priority',
                            label: { type: 'plain_text', text: 'Priority' },
                            element: {
                                type: 'static_select',
                                action_id: 'priority_select',
                                options: ['P0', 'P1', 'P2', 'P3'].map((p) => ({
                                    text: { type: 'plain_text', text: p },
                                    value: p,
                                })),
                            },
                        },
                    ],
                },
            }),
        });
        return {};
    }
    // ============================================
    // Preference Management
    // ============================================
    setUserPreferences(prefs) {
        this.preferences.set(prefs.userId, prefs);
    }
    getUserPreferences(userId) {
        return this.preferences.get(userId);
    }
    shouldNotifyUser(userId, eventType, priority) {
        const prefs = this.preferences.get(userId);
        if (!prefs)
            return true;
        // Check quiet hours
        if (prefs.quietHours) {
            const hour = new Date().getHours();
            if (hour >= prefs.quietHours.start || hour < prefs.quietHours.end) {
                return false;
            }
        }
        // Check priority threshold
        if (priority) {
            const priorities = ['P0', 'P1', 'P2', 'P3'];
            const userThreshold = priorities.indexOf(prefs.priorityThreshold);
            const eventPriority = priorities.indexOf(priority);
            if (eventPriority > userThreshold) {
                return false;
            }
        }
        return true;
    }
}
exports.SlackIntegration = SlackIntegration;

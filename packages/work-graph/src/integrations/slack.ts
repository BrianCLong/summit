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

import type { Ticket, Commitment, Agent } from '../schema/nodes.js';
import { EventBus, EventType, WorkGraphEvent } from '../events/bus.js';

// ============================================
// Types
// ============================================

export interface SlackConfig {
  botToken: string;
  signingSecret: string;
  defaultChannel: string;
  channels: {
    alerts: string;
    engineering: string;
    agents: string;
    commitments: string;
  };
  webhookUrl?: string;
}

export interface SlackMessage {
  channel: string;
  text: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  thread_ts?: string;
  mrkdwn?: boolean;
}

export interface SlackBlock {
  type: 'section' | 'divider' | 'context' | 'actions' | 'header';
  text?: { type: 'mrkdwn' | 'plain_text'; text: string; emoji?: boolean };
  fields?: Array<{ type: 'mrkdwn' | 'plain_text'; text: string }>;
  accessory?: SlackAccessory;
  elements?: SlackElement[];
}

export interface SlackAccessory {
  type: 'button' | 'overflow' | 'datepicker' | 'static_select';
  text?: { type: 'plain_text'; text: string; emoji?: boolean };
  action_id: string;
  value?: string;
  url?: string;
  style?: 'primary' | 'danger';
  options?: Array<{ text: { type: 'plain_text'; text: string }; value: string }>;
}

export interface SlackElement {
  type: 'button' | 'static_select' | 'users_select' | 'mrkdwn' | 'plain_text';
  text?: string | { type: 'plain_text'; text: string; emoji?: boolean };
  action_id?: string;
  value?: string;
  style?: 'primary' | 'danger';
}

export interface SlackAttachment {
  color: string;
  title: string;
  text: string;
  fields?: Array<{ title: string; value: string; short?: boolean }>;
  footer?: string;
  ts?: number;
}

export interface SlackInteraction {
  type: 'block_actions' | 'view_submission' | 'shortcut';
  user: { id: string; username: string };
  channel?: { id: string };
  actions?: Array<{ action_id: string; value: string; type: string }>;
  trigger_id?: string;
  response_url?: string;
}

export interface NotificationPreferences {
  userId: string;
  channels: {
    commitmentAlerts: boolean;
    ticketUpdates: boolean;
    agentActivity: boolean;
    dailyDigest: boolean;
  };
  priorityThreshold: 'P0' | 'P1' | 'P2' | 'P3';
  quietHours?: { start: number; end: number };
}

// ============================================
// Slack Integration
// ============================================

export class SlackIntegration {
  private config: SlackConfig;
  private eventBus: EventBus;
  private preferences: Map<string, NotificationPreferences> = new Map();
  private threadMap: Map<string, string> = new Map(); // nodeId -> thread_ts

  constructor(config: SlackConfig, eventBus: EventBus) {
    this.config = config;
    this.eventBus = eventBus;
    this.setupEventListeners();
  }

  // ============================================
  // Event-Driven Notifications
  // ============================================

  private setupEventListeners(): void {
    // Commitment alerts
    this.eventBus.subscribe(
      { types: ['commitment.at_risk', 'commitment.broken'] },
      async (event) => this.handleCommitmentAlert(event)
    );

    // Ticket updates
    this.eventBus.subscribe(
      { types: ['ticket.completed', 'ticket.blocked'] },
      async (event) => this.handleTicketUpdate(event)
    );

    // Agent activity
    this.eventBus.subscribe(
      { types: ['contract.assigned', 'work.completed'] },
      async (event) => this.handleAgentActivity(event)
    );

    // PR events
    this.eventBus.subscribe(
      { types: ['pr.opened', 'pr.merged'] },
      async (event) => this.handlePREvent(event)
    );
  }

  private async handleCommitmentAlert(event: WorkGraphEvent): Promise<void> {
    const { commitmentId, customer, confidence, daysRemaining } = event.payload as {
      commitmentId: string;
      customer: string;
      confidence?: number;
      daysRemaining?: number;
    };

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

  private async handleTicketUpdate(event: WorkGraphEvent): Promise<void> {
    const { ticketId, title, assignee } = event.payload as {
      ticketId: string;
      title?: string;
      assignee?: string;
    };

    const emoji = event.type === 'ticket.completed' ? '✅' : '🚫';
    const color = event.type === 'ticket.completed' ? '#28a745' : '#dc3545';

    const message: SlackMessage = {
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

  private async handleAgentActivity(event: WorkGraphEvent): Promise<void> {
    const { contractId, agentId, agentName, quality } = event.payload as {
      contractId: string;
      agentId?: string;
      agentName?: string;
      quality?: number;
    };

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

  private async handlePREvent(event: WorkGraphEvent): Promise<void> {
    const { prNumber, prId, title, author } = event.payload as {
      prNumber: number;
      prId: string;
      title?: string;
      author?: string;
    };

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
  async sendMessage(message: SlackMessage): Promise<{ ok: boolean; ts?: string }> {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    return result as { ok: boolean; ts?: string };
  }

  /**
   * Send daily digest
   */
  async sendDailyDigest(
    metrics: {
      ticketsCompleted: number;
      velocity: number;
      commitments: { onTrack: number; atRisk: number };
      agentCompletions: number;
      blockers: string[];
    }
  ): Promise<void> {
    const blocks: SlackBlock[] = [
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
  async notifyCriticalCommitment(commitment: Commitment): Promise<void> {
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
  async handleInteraction(interaction: SlackInteraction): Promise<{ response?: unknown }> {
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
        return this.openTicketModal(interaction.trigger_id!);
      default:
        return {};
    }
  }

  private async handleViewCommitment(commitmentId: string): Promise<{ response?: unknown }> {
    // Would fetch commitment details and return modal or ephemeral message
    return {
      response: {
        response_type: 'ephemeral',
        text: `Viewing commitment ${commitmentId}`,
      },
    };
  }

  private async handleEscalateCommitment(
    commitmentId: string,
    user: { id: string; username: string }
  ): Promise<{ response?: unknown }> {
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

  private async handleViewAgent(agentId: string): Promise<{ response?: unknown }> {
    return {
      response: {
        response_type: 'ephemeral',
        text: `Viewing agent ${agentId}`,
      },
    };
  }

  private async openTicketModal(triggerId: string): Promise<{ response?: unknown }> {
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

  setUserPreferences(prefs: NotificationPreferences): void {
    this.preferences.set(prefs.userId, prefs);
  }

  getUserPreferences(userId: string): NotificationPreferences | undefined {
    return this.preferences.get(userId);
  }

  shouldNotifyUser(userId: string, eventType: EventType, priority?: string): boolean {
    const prefs = this.preferences.get(userId);
    if (!prefs) return true;

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

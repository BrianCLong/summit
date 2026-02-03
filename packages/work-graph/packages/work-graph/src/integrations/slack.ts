/**
 * Summit Work Graph - Slack Integration
 */

import type { Ticket, Commitment, Agent, PR } from '../schema/nodes.js';
import { EventBus, WorkGraphEvent } from '../events/bus.js';

export interface SlackConfig {
  botToken: string;
  signingSecret: string;
  defaultChannel: string;
  alertChannel?: string;
}

export interface SlackMessage {
  channel: string;
  text: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  thread_ts?: string;
}

export interface SlackBlock {
  type: 'section' | 'divider' | 'actions' | 'context' | 'header';
  text?: { type: 'mrkdwn' | 'plain_text'; text: string };
  fields?: Array<{ type: 'mrkdwn'; text: string }>;
  accessory?: { type: 'button'; text: { type: 'plain_text'; text: string }; action_id: string; value?: string };
  elements?: SlackElement[];
}

export interface SlackElement {
  type: 'button' | 'static_select' | 'overflow';
  text?: { type: 'plain_text'; text: string };
  action_id: string;
  value?: string;
  options?: Array<{ text: { type: 'plain_text'; text: string }; value: string }>;
}

export interface SlackAttachment {
  color: string;
  title?: string;
  text?: string;
  fields?: Array<{ title: string; value: string; short: boolean }>;
}

export interface NotificationPreferences {
  userId: string;
  slackUserId: string;
  commitmentAlerts: boolean;
  ticketAssignments: boolean;
  prUpdates: boolean;
  agentActivity: boolean;
  dailyDigest: boolean;
}

export class SlackIntegration {
  private config: SlackConfig;
  private eventBus: EventBus;
  private userPreferences: Map<string, NotificationPreferences> = new Map();

  constructor(config: SlackConfig, eventBus: EventBus) {
    this.config = config;
    this.eventBus = eventBus;
    this.subscribeToEvents();
  }

  private subscribeToEvents(): void {
    this.eventBus.subscribe({ types: ['commitment.at_risk', 'commitment.broken'] }, (e) => this.handleCommitmentEvent(e));
    this.eventBus.subscribe({ types: ['ticket.assigned', 'ticket.blocked'] }, (e) => this.handleTicketEvent(e));
    this.eventBus.subscribe({ types: ['pr.opened', 'pr.merged'] }, (e) => this.handlePREvent(e));
    this.eventBus.subscribe({ types: ['work.completed'] }, (e) => this.handleAgentEvent(e));
  }

  async sendMessage(message: SlackMessage): Promise<{ ok: boolean; ts?: string }> {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + this.config.botToken, 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    return response.json();
  }

  async notifyCommitmentAtRisk(commitment: Commitment): Promise<void> {
    const color = commitment.status === 'broken' ? '#FF0000' : '#FFA500';
    const emoji = commitment.status === 'broken' ? ':x:' : ':warning:';

    await this.sendMessage({
      channel: this.config.alertChannel || this.config.defaultChannel,
      text: emoji + ' Commitment "' + commitment.title + '" is ' + commitment.status,
      attachments: [{ color, text: commitment.description }],
    });
  }

  async notifyTicketAssignment(ticket: Ticket, assignee: string): Promise<void> {
    const prefs = this.findPreferencesByUserId(assignee);
    if (!prefs?.ticketAssignments) return;

    await this.sendMessage({
      channel: prefs.slackUserId,
      text: 'You have been assigned ticket: ' + ticket.title,
    });
  }

  async notifyAgentCompletion(agent: Agent, ticket: Ticket): Promise<void> {
    await this.sendMessage({
      channel: this.config.defaultChannel,
      text: ':robot_face: Agent ' + agent.name + ' completed: ' + ticket.title,
    });
  }

  async sendDailyDigest(channel: string, metrics: { velocity: number; wip: number; atRisk: number; completed: number }): Promise<void> {
    await this.sendMessage({
      channel,
      text: ':chart_with_upwards_trend: Daily Digest - Velocity: ' + metrics.velocity + ', WIP: ' + metrics.wip + ', At Risk: ' + metrics.atRisk + ', Completed: ' + metrics.completed,
    });
  }

  setUserPreferences(prefs: NotificationPreferences): void {
    this.userPreferences.set(prefs.userId, prefs);
  }

  private findPreferencesByUserId(userId: string): NotificationPreferences | undefined {
    return this.userPreferences.get(userId);
  }

  private async handleCommitmentEvent(event: WorkGraphEvent): Promise<void> {
    const commitment = event.payload as unknown as Commitment;
    if (commitment) await this.notifyCommitmentAtRisk(commitment);
  }

  private async handleTicketEvent(event: WorkGraphEvent): Promise<void> {
    if (event.type === 'ticket.assigned') {
      const { ticket, assignee } = event.payload as { ticket: Ticket; assignee: string };
      if (ticket && assignee) await this.notifyTicketAssignment(ticket, assignee);
    }
  }

  private async handlePREvent(event: WorkGraphEvent): Promise<void> {
    const pr = event.payload as unknown as PR;
    if (pr && event.type === 'pr.merged') {
      await this.sendMessage({
        channel: this.config.defaultChannel,
        text: ':merged: PR merged: ' + pr.title,
      });
    }
  }

  private async handleAgentEvent(event: WorkGraphEvent): Promise<void> {
    const { agent, ticket } = event.payload as { agent: Agent; ticket: Ticket };
    if (agent && ticket) await this.notifyAgentCompletion(agent, ticket);
  }
}

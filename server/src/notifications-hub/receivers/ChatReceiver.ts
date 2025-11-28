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

import {
  BaseReceiver,
  DeliveryResult,
  ReceiverConfig,
} from './ReceiverInterface.js';
import { CanonicalEvent, EventSeverity } from '../events/EventSchema.js';
import { RenderedTemplate } from '../templates/TemplateRenderer.js';

export type ChatPlatform = 'slack' | 'teams' | 'discord' | 'mattermost' | 'custom';

export interface ChatReceiverConfig extends ReceiverConfig {
  platform: ChatPlatform;
  credentials: Record<string, unknown>;
  defaultChannel?: string;
  mentionUsers?: boolean;
  threadMessages?: boolean;
  simulation?: {
    enabled?: boolean;
    minLatencyMs?: number;
    maxLatencyMs?: number;
  };
}

type SimulationConfig = ChatReceiverConfig['simulation'];

async function simulateDelay(
  simulation?: SimulationConfig,
  defaultMin = 50,
  defaultMax = 150,
): Promise<void> {
  if (!simulation?.enabled) return;

  const min = simulation.minLatencyMs ?? defaultMin;
  const max = simulation.maxLatencyMs ?? defaultMax;
  await new Promise((resolve) =>
    setTimeout(resolve, min + Math.random() * Math.max(0, max - min)),
  );
}

export interface ChatMessage {
  channel: string;
  text: string;
  blocks?: unknown[];  // Platform-specific rich content blocks
  attachments?: unknown[];
  threadId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Chat Adapter Interface
 * Each chat platform implements this interface
 */
export interface IChatAdapter {
  readonly platform: ChatPlatform;

  initialize(credentials: Record<string, unknown>): Promise<void>;

  sendMessage(message: ChatMessage): Promise<string>;

  validateChannel(channel: string): Promise<boolean>;

  healthCheck(): Promise<boolean>;

  shutdown(): Promise<void>;
}

/**
 * Chat Receiver that uses platform-specific adapters
 */
export class ChatReceiver extends BaseReceiver {
  private chatConfig: ChatReceiverConfig;
  private adapter: IChatAdapter;

  constructor() {
    super('chat', 'Chat Notifications');
  }

  protected async onInitialize(): Promise<void> {
    this.chatConfig = this.config as ChatReceiverConfig;

    // Select and initialize the appropriate adapter
    this.adapter = this.createAdapter(this.chatConfig.platform);
    await this.adapter.initialize(this.chatConfig.credentials);
  }

  private createAdapter(platform: ChatPlatform): IChatAdapter {
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

  protected async deliverToRecipient(
    event: CanonicalEvent,
    recipient: string,
    options?: Record<string, unknown>,
  ): Promise<DeliveryResult> {
    try {
      const template = options?.template as RenderedTemplate | undefined;
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
    } catch (error) {
      return {
        success: false,
        recipientId: recipient,
        channel: this.id,
        error: error as Error,
      };
    }
  }

  private buildChatMessage(
    event: CanonicalEvent,
    recipient: string,
    template?: RenderedTemplate,
    options?: Record<string, unknown>,
  ): ChatMessage {
    const channel = (options?.channel as string) || recipient;
    const severityEmoji = this.getSeverityEmoji(event.severity);
    const text = this.buildMessageText(event, severityEmoji, template);
    const blocks = this.buildMessageBlocks(event, severityEmoji, template);

    return {
      channel,
      text, // Fallback text
      blocks,
      threadId: options?.threadId as string,
      metadata: {
        eventId: event.id,
        eventType: event.type,
      },
    };
  }

  private buildMessageText(
    event: CanonicalEvent,
    emoji: string,
    template?: RenderedTemplate,
  ): string {
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

  private buildMessageBlocks(
    event: CanonicalEvent,
    emoji: string,
    template?: RenderedTemplate,
  ): unknown[] {
    const body = template?.message || event.message;
    // Generic block structure that can be adapted per platform
    const blocks: unknown[] = [
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
        elements: [] as any[],
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
        event.metadata.links.slice(0, 4).forEach((link: any) => {
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

  private getSeverityEmoji(severity: EventSeverity): string {
    const emojis = {
      [EventSeverity.CRITICAL]: '🚨',
      [EventSeverity.HIGH]: '⚠️',
      [EventSeverity.MEDIUM]: '📢',
      [EventSeverity.LOW]: 'ℹ️',
      [EventSeverity.INFO]: '💡',
    };
    return emojis[severity] || '📬';
  }

  private getButtonStyle(severity: EventSeverity): string {
    if (severity === EventSeverity.CRITICAL || severity === EventSeverity.HIGH) {
      return 'danger';
    }
    return 'primary';
  }

  async validateRecipient(recipient: string): Promise<boolean> {
    return this.adapter.validateChannel(recipient);
  }

  protected async performHealthCheck(): Promise<boolean> {
    return this.adapter.healthCheck();
  }

  protected async onShutdown(): Promise<void> {
    await this.adapter.shutdown();
  }
}

/**
 * Slack Adapter Implementation
 */
export class SlackAdapter implements IChatAdapter {
  readonly platform: ChatPlatform = 'slack';
  private webhookUrl?: string;
  private apiToken?: string;

  constructor(private readonly simulation?: SimulationConfig) {}

  async initialize(credentials: Record<string, unknown>): Promise<void> {
    this.webhookUrl = credentials.webhookUrl as string;
    this.apiToken = credentials.apiToken as string;

    if (!this.webhookUrl && !this.apiToken) {
      throw new Error('Slack adapter requires either webhookUrl or apiToken');
    }
  }

  async sendMessage(message: ChatMessage): Promise<string> {
    if (this.webhookUrl) {
      return this.sendViaWebhook(message);
    } else if (this.apiToken) {
      return this.sendViaApi(message);
    }
    throw new Error('No Slack credentials configured');
  }

  private async sendViaWebhook(message: ChatMessage): Promise<string> {
    const payload = {
      channel: message.channel,
      text: message.text,
      blocks: message.blocks,
    };

    // Mock implementation - replace with actual HTTP request
    await simulateDelay(this.simulation);
    return `slack_msg_${Date.now()}`;
  }

  private async sendViaApi(message: ChatMessage): Promise<string> {
    // Mock implementation - replace with Slack Web API client
    await simulateDelay(this.simulation);
    return `slack_msg_${Date.now()}`;
  }

  async validateChannel(channel: string): Promise<boolean> {
    // Slack channels start with # or are user IDs
    return channel.startsWith('#') || channel.startsWith('C') || channel.startsWith('U');
  }

  async healthCheck(): Promise<boolean> {
    try {
      // In production, ping Slack API
      return true;
    } catch {
      return false;
    }
  }

  async shutdown(): Promise<void> {
    // Cleanup
  }

}

/**
 * Microsoft Teams Adapter Implementation
 */
export class TeamsAdapter implements IChatAdapter {
  readonly platform: ChatPlatform = 'teams';
  private webhookUrl?: string;

  constructor(private readonly simulation?: SimulationConfig) {}

  async initialize(credentials: Record<string, unknown>): Promise<void> {
    this.webhookUrl = credentials.webhookUrl as string;

    if (!this.webhookUrl) {
      throw new Error('Teams adapter requires webhookUrl');
    }
  }

  async sendMessage(message: ChatMessage): Promise<string> {
    // Convert generic blocks to Teams Adaptive Card format
    const adaptiveCard = this.convertToAdaptiveCard(message);

    // Mock implementation - replace with actual HTTP request
    await simulateDelay(this.simulation);
    return `teams_msg_${Date.now()}`;
  }

  private convertToAdaptiveCard(message: ChatMessage): unknown {
    // Convert generic blocks to Teams Adaptive Card format
    return {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: message.text,
      text: message.text,
    };
  }

  async validateChannel(channel: string): Promise<boolean> {
    // Teams uses webhook URLs or channel IDs
    return channel.startsWith('http') || channel.length > 10;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async shutdown(): Promise<void> {
    // Cleanup
  }

}

/**
 * Discord Adapter Implementation
 */
export class DiscordAdapter implements IChatAdapter {
  readonly platform: ChatPlatform = 'discord';
  private webhookUrl?: string;

  constructor(private readonly simulation?: SimulationConfig) {}

  async initialize(credentials: Record<string, unknown>): Promise<void> {
    this.webhookUrl = credentials.webhookUrl as string;

    if (!this.webhookUrl) {
      throw new Error('Discord adapter requires webhookUrl');
    }
  }

  async sendMessage(message: ChatMessage): Promise<string> {
    const payload = {
      content: message.text,
      embeds: this.convertToDiscordEmbeds(message),
    };

    // Mock implementation
    await simulateDelay(this.simulation);
    return `discord_msg_${Date.now()}`;
  }

  private convertToDiscordEmbeds(message: ChatMessage): unknown[] {
    // Convert generic blocks to Discord embeds
    return [];
  }

  async validateChannel(channel: string): Promise<boolean> {
    return channel.startsWith('http') || /^\d+$/.test(channel);
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async shutdown(): Promise<void> {
    // Cleanup
  }

}

/**
 * Mattermost Adapter Implementation
 */
export class MattermostAdapter implements IChatAdapter {
  readonly platform: ChatPlatform = 'mattermost';
  private webhookUrl?: string;

  constructor(private readonly simulation?: SimulationConfig) {}

  async initialize(credentials: Record<string, unknown>): Promise<void> {
    this.webhookUrl = credentials.webhookUrl as string;

    if (!this.webhookUrl) {
      throw new Error('Mattermost adapter requires webhookUrl');
    }
  }

  async sendMessage(message: ChatMessage): Promise<string> {
    // Mattermost uses Slack-compatible format
    const payload = {
      channel: message.channel,
      text: message.text,
    };

    // Mock implementation
    await simulateDelay(this.simulation);
    return `mattermost_msg_${Date.now()}`;
  }

  async validateChannel(channel: string): Promise<boolean> {
    return channel.length > 0;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async shutdown(): Promise<void> {
    // Cleanup
  }

}

/**
 * Custom Chat Adapter for generic webhook-based chat systems
 */
export class CustomChatAdapter implements IChatAdapter {
  readonly platform: ChatPlatform = 'custom';
  private webhookUrl?: string;

  constructor(private readonly simulation?: SimulationConfig) {}

  async initialize(credentials: Record<string, unknown>): Promise<void> {
    this.webhookUrl = credentials.webhookUrl as string;

    if (!this.webhookUrl) {
      throw new Error('Custom chat adapter requires webhookUrl');
    }
  }

  async sendMessage(message: ChatMessage): Promise<string> {
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

  async validateChannel(channel: string): Promise<boolean> {
    return channel.length > 0;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async shutdown(): Promise<void> {
    // Cleanup
  }

}

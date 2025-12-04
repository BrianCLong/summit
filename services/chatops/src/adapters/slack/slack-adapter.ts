/**
 * Slack Adapter for ChatOps
 *
 * Implements Slack-specific message handling:
 * - Event handlers (messages, app mentions, interactions)
 * - Block Kit formatting for rich responses
 * - Interactive components (approval buttons, entity cards)
 * - Thread-based conversation management
 *
 * Slash Commands:
 * - /intel <query>        Query intelligence graph
 * - /investigate <name>   Start new investigation
 * - /entity <id>          Look up entity details
 * - /paths <from> <to>    Find paths between entities
 * - /threats <entity>     Get threat assessment
 * - /approve <id>         Approve pending operation
 * - /trace <id>           View ReAct trace
 */

import { App, BlockAction, SlashCommand, MessageEvent, AppMentionEvent } from '@slack/bolt';

import {
  AggregatedIntent,
  ApprovalRequest,
  ChatMessage,
  ChatResponse,
  OSINTEntity,
  ReActTrace,
  SecurityContext,
} from '../../types.js';

// =============================================================================
// TYPES
// =============================================================================

export interface SlackAdapterConfig {
  botToken: string;
  signingSecret: string;
  appToken?: string; // For Socket Mode
  socketMode?: boolean;
}

export interface SlackBlockKit {
  type: string;
  [key: string]: unknown;
}

// =============================================================================
// SLACK ADAPTER
// =============================================================================

export class SlackAdapter {
  private app: App;
  private messageHandler?: (message: ChatMessage, context: SecurityContext) => Promise<ChatResponse>;
  private approvalHandler?: (requestId: string, approved: boolean, userId: string) => Promise<void>;

  constructor(config: SlackAdapterConfig) {
    this.app = new App({
      token: config.botToken,
      signingSecret: config.signingSecret,
      socketMode: config.socketMode ?? false,
      appToken: config.appToken,
    });

    this.setupEventHandlers();
    this.setupSlashCommands();
    this.setupInteractionHandlers();
  }

  // ===========================================================================
  // SETUP
  // ===========================================================================

  /**
   * Register message handler
   */
  onMessage(handler: (message: ChatMessage, context: SecurityContext) => Promise<ChatResponse>): void {
    this.messageHandler = handler;
  }

  /**
   * Register approval handler
   */
  onApproval(handler: (requestId: string, approved: boolean, userId: string) => Promise<void>): void {
    this.approvalHandler = handler;
  }

  /**
   * Start the Slack app
   */
  async start(port?: number): Promise<void> {
    await this.app.start(port ?? 3000);
    console.log(`Slack adapter started on port ${port ?? 3000}`);
  }

  // ===========================================================================
  // EVENT HANDLERS
  // ===========================================================================

  private setupEventHandlers(): void {
    // Handle direct messages
    this.app.message(async ({ message, say, client }) => {
      if (!this.messageHandler) return;
      if ((message as MessageEvent).subtype) return; // Ignore message updates

      const msg = message as MessageEvent;
      const chatMessage = this.normalizeMessage(msg);
      const context = await this.getSecurityContext(msg.user!, client);

      const response = await this.messageHandler(chatMessage, context);
      await say({
        blocks: this.formatResponseBlocks(response),
        text: response.content,
        thread_ts: msg.thread_ts ?? msg.ts,
      });
    });

    // Handle @mentions
    this.app.event('app_mention', async ({ event, say, client }) => {
      if (!this.messageHandler) return;

      const chatMessage = this.normalizeMention(event);
      const context = await this.getSecurityContext(event.user, client);

      const response = await this.messageHandler(chatMessage, context);
      await say({
        blocks: this.formatResponseBlocks(response),
        text: response.content,
        thread_ts: event.thread_ts ?? event.ts,
      });
    });
  }

  // ===========================================================================
  // SLASH COMMANDS
  // ===========================================================================

  private setupSlashCommands(): void {
    // /intel <query>
    this.app.command('/intel', async ({ command, ack, respond, client }) => {
      await ack();

      if (!this.messageHandler) {
        await respond('ChatOps handler not configured');
        return;
      }

      const chatMessage = this.normalizeSlashCommand(command);
      const context = await this.getSecurityContext(command.user_id, client);

      const response = await this.messageHandler(chatMessage, context);
      await respond({
        blocks: this.formatResponseBlocks(response),
        text: response.content,
        response_type: 'in_channel',
      });
    });

    // /investigate <name>
    this.app.command('/investigate', async ({ command, ack, respond, client }) => {
      await ack();

      if (!this.messageHandler) {
        await respond('ChatOps handler not configured');
        return;
      }

      const chatMessage: ChatMessage = {
        messageId: command.trigger_id,
        platform: 'slack',
        channelId: command.channel_id,
        userId: command.user_id,
        content: `Create new investigation: ${command.text}`,
        timestamp: new Date(),
        metadata: {
          tenantId: command.team_id,
        },
      };
      const context = await this.getSecurityContext(command.user_id, client);

      const response = await this.messageHandler(chatMessage, context);
      await respond({
        blocks: this.formatResponseBlocks(response),
        text: response.content,
      });
    });

    // /entity <id>
    this.app.command('/entity', async ({ command, ack, respond, client }) => {
      await ack();

      if (!this.messageHandler) {
        await respond('ChatOps handler not configured');
        return;
      }

      const chatMessage: ChatMessage = {
        messageId: command.trigger_id,
        platform: 'slack',
        channelId: command.channel_id,
        userId: command.user_id,
        content: `Look up entity: ${command.text}`,
        timestamp: new Date(),
        metadata: {
          tenantId: command.team_id,
        },
      };
      const context = await this.getSecurityContext(command.user_id, client);

      const response = await this.messageHandler(chatMessage, context);
      await respond({
        blocks: this.formatResponseBlocks(response),
        text: response.content,
      });
    });

    // /paths <from> <to>
    this.app.command('/paths', async ({ command, ack, respond, client }) => {
      await ack();

      const [from, to] = command.text.split(/\s+/);
      if (!from || !to) {
        await respond('Usage: /paths <from_entity> <to_entity>');
        return;
      }

      if (!this.messageHandler) {
        await respond('ChatOps handler not configured');
        return;
      }

      const chatMessage: ChatMessage = {
        messageId: command.trigger_id,
        platform: 'slack',
        channelId: command.channel_id,
        userId: command.user_id,
        content: `Find paths between ${from} and ${to}`,
        timestamp: new Date(),
        metadata: {
          tenantId: command.team_id,
        },
      };
      const context = await this.getSecurityContext(command.user_id, client);

      const response = await this.messageHandler(chatMessage, context);
      await respond({
        blocks: this.formatResponseBlocks(response),
        text: response.content,
      });
    });

    // /threats <entity>
    this.app.command('/threats', async ({ command, ack, respond, client }) => {
      await ack();

      if (!this.messageHandler) {
        await respond('ChatOps handler not configured');
        return;
      }

      const chatMessage: ChatMessage = {
        messageId: command.trigger_id,
        platform: 'slack',
        channelId: command.channel_id,
        userId: command.user_id,
        content: `Assess threats for: ${command.text}`,
        timestamp: new Date(),
        metadata: {
          tenantId: command.team_id,
        },
      };
      const context = await this.getSecurityContext(command.user_id, client);

      const response = await this.messageHandler(chatMessage, context);
      await respond({
        blocks: this.formatResponseBlocks(response),
        text: response.content,
      });
    });

    // /approve <id>
    this.app.command('/approve', async ({ command, ack, respond }) => {
      await ack();

      if (!this.approvalHandler) {
        await respond('Approval handler not configured');
        return;
      }

      const requestId = command.text.trim();
      if (!requestId) {
        await respond('Usage: /approve <request_id>');
        return;
      }

      try {
        await this.approvalHandler(requestId, true, command.user_id);
        await respond(`Approved request ${requestId}`);
      } catch (error) {
        await respond(`Failed to approve: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // /trace <id>
    this.app.command('/trace', async ({ command, ack, respond }) => {
      await ack();

      // TODO: Implement trace lookup
      await respond(`Trace lookup for ${command.text} not yet implemented`);
    });
  }

  // ===========================================================================
  // INTERACTION HANDLERS
  // ===========================================================================

  private setupInteractionHandlers(): void {
    // Handle approval button clicks
    this.app.action('approve_operation', async ({ body, ack, respond }) => {
      await ack();

      const action = body as BlockAction;
      const requestId = (action.actions[0] as { value: string }).value;

      if (!this.approvalHandler) {
        await respond({ text: 'Approval handler not configured' });
        return;
      }

      try {
        await this.approvalHandler(requestId, true, action.user.id);
        await respond({
          text: `Operation approved by <@${action.user.id}>`,
          replace_original: false,
        });
      } catch (error) {
        await respond({
          text: `Failed to approve: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    });

    // Handle deny button clicks
    this.app.action('deny_operation', async ({ body, ack, respond }) => {
      await ack();

      const action = body as BlockAction;
      const requestId = (action.actions[0] as { value: string }).value;

      if (!this.approvalHandler) {
        await respond({ text: 'Approval handler not configured' });
        return;
      }

      try {
        await this.approvalHandler(requestId, false, action.user.id);
        await respond({
          text: `Operation denied by <@${action.user.id}>`,
          replace_original: false,
        });
      } catch (error) {
        await respond({
          text: `Failed to deny: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    });

    // Handle entity card expansion
    this.app.action('expand_entity', async ({ body, ack, respond }) => {
      await ack();
      // TODO: Implement entity expansion
      await respond({ text: 'Entity expansion not yet implemented' });
    });

    // Handle trace expansion
    this.app.action('expand_trace', async ({ body, ack, respond }) => {
      await ack();
      // TODO: Implement trace expansion
      await respond({ text: 'Trace expansion not yet implemented' });
    });
  }

  // ===========================================================================
  // MESSAGE NORMALIZATION
  // ===========================================================================

  private normalizeMessage(message: MessageEvent): ChatMessage {
    return {
      messageId: message.ts!,
      platform: 'slack',
      channelId: message.channel!,
      threadId: message.thread_ts,
      userId: message.user!,
      content: message.text ?? '',
      timestamp: new Date(parseFloat(message.ts!) * 1000),
      metadata: {
        // tenantId will be resolved from user info
      },
    };
  }

  private normalizeMention(event: AppMentionEvent): ChatMessage {
    // Remove the @mention from the text
    const content = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();

    return {
      messageId: event.ts,
      platform: 'slack',
      channelId: event.channel,
      threadId: event.thread_ts,
      userId: event.user,
      content,
      timestamp: new Date(parseFloat(event.ts) * 1000),
      metadata: {},
    };
  }

  private normalizeSlashCommand(command: SlashCommand): ChatMessage {
    return {
      messageId: command.trigger_id,
      platform: 'slack',
      channelId: command.channel_id,
      userId: command.user_id,
      content: command.text,
      timestamp: new Date(),
      metadata: {
        tenantId: command.team_id,
      },
    };
  }

  // ===========================================================================
  // SECURITY CONTEXT
  // ===========================================================================

  private async getSecurityContext(userId: string, client: any): Promise<SecurityContext> {
    // Fetch user info from Slack
    const userInfo = await client.users.info({ user: userId });

    // TODO: Map Slack user to IntelGraph user and fetch clearance/roles
    // For now, return a default context
    return {
      userId,
      tenantId: userInfo.user?.team_id ?? 'default',
      roles: ['analyst'],
      clearanceLevel: 'UNCLASSIFIED',
      sessionId: `slack-${userId}-${Date.now()}`,
      mfaVerified: false,
    };
  }

  // ===========================================================================
  // RESPONSE FORMATTING
  // ===========================================================================

  private formatResponseBlocks(response: ChatResponse): SlackBlockKit[] {
    const blocks: SlackBlockKit[] = [];

    // Main content section
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: response.content,
      },
    });

    // Confidence indicator
    if (response.confidenceScore !== undefined) {
      const emoji = response.confidenceScore >= 0.8 ? ':large_green_circle:' :
                    response.confidenceScore >= 0.5 ? ':large_yellow_circle:' :
                    ':red_circle:';
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `${emoji} Confidence: ${Math.round(response.confidenceScore * 100)}%`,
          },
        ],
      });
    }

    // Citations
    if (response.citations && response.citations.length > 0) {
      blocks.push({
        type: 'divider',
      });
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '*Sources:* ' + response.citations
              .slice(0, 5)
              .map(c => `\`${c.entityName}\``)
              .join(', '),
          },
        ],
      });
    }

    // Interactive components
    if (response.interactive && response.interactive.length > 0) {
      const buttons = response.interactive
        .filter(c => c.type === 'button')
        .map(c => ({
          type: 'button',
          text: {
            type: 'plain_text',
            text: c.label,
          },
          action_id: c.action,
          value: c.value,
        }));

      if (buttons.length > 0) {
        blocks.push({
          type: 'actions',
          elements: buttons,
        });
      }
    }

    return blocks;
  }

  // ===========================================================================
  // SPECIALIZED FORMATTERS
  // ===========================================================================

  /**
   * Format entity card for Slack
   */
  formatEntityCard(entity: {
    id: string;
    name: string;
    type: string;
    confidence?: number;
    properties?: Record<string, unknown>;
  }): SlackBlockKit[] {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${entity.name}*\nType: \`${entity.type}\`${entity.confidence ? ` | Confidence: ${Math.round(entity.confidence * 100)}%` : ''}`,
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Details',
          },
          action_id: 'expand_entity',
          value: entity.id,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `ID: \`${entity.id}\``,
          },
        ],
      },
    ];
  }

  /**
   * Format approval request for Slack
   */
  formatApprovalRequest(request: ApprovalRequest): SlackBlockKit[] {
    const riskEmoji = request.classification.level === 'prohibited' ? ':no_entry:' :
                      request.classification.level === 'hitl' ? ':warning:' :
                      ':white_check_mark:';

    return [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${riskEmoji} Approval Required`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Operation:* \`${request.operation.toolId}:${request.operation.operation}\`\n*Risk Level:* ${request.classification.level}\n*Reason:* ${request.classification.reason}`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Requested by <@${request.userId}> | Expires: <!date^${Math.floor(request.expiresAt.getTime() / 1000)}^{date_short} {time}|soon>`,
          },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Approve',
            },
            style: 'primary',
            action_id: 'approve_operation',
            value: request.requestId,
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Deny',
            },
            style: 'danger',
            action_id: 'deny_operation',
            value: request.requestId,
          },
        ],
      },
    ];
  }

  /**
   * Format ReAct trace for Slack
   */
  formatReActTrace(trace: ReActTrace): SlackBlockKit[] {
    const statusEmoji = trace.finalOutcome === 'success' ? ':white_check_mark:' :
                        trace.finalOutcome === 'partial' ? ':large_yellow_circle:' :
                        trace.finalOutcome === 'blocked' ? ':no_entry:' :
                        ':x:';

    const blocks: SlackBlockKit[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${statusEmoji} Execution Trace`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Trace ID: \`${trace.traceId}\` | Steps: ${trace.steps.length} | Tokens: ${trace.totalTokens} | Latency: ${trace.totalLatencyMs}ms`,
          },
        ],
      },
    ];

    // Add step summaries (last 3 steps)
    const recentSteps = trace.steps.slice(-3);
    for (const step of recentSteps) {
      const stepEmoji = step.observation.success ? ':white_check_mark:' : ':x:';
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${stepEmoji} *Step ${step.stepNumber}:* ${step.thought.slice(0, 100)}${step.thought.length > 100 ? '...' : ''}`,
        },
      });
    }

    // Add expand button if more steps
    if (trace.steps.length > 3) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: `View All ${trace.steps.length} Steps`,
            },
            action_id: 'expand_trace',
            value: trace.traceId,
          },
        ],
      });
    }

    return blocks;
  }

  /**
   * Format OSINT entities for Slack
   */
  formatOSINTEntities(entities: OSINTEntity[]): SlackBlockKit[] {
    if (entities.length === 0) {
      return [];
    }

    const grouped = entities.reduce((acc, entity) => {
      if (!acc[entity.type]) acc[entity.type] = [];
      acc[entity.type].push(entity);
      return acc;
    }, {} as Record<string, OSINTEntity[]>);

    const blocks: SlackBlockKit[] = [
      {
        type: 'divider',
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '*Extracted Entities:*',
          },
        ],
      },
    ];

    for (const [type, typeEntities] of Object.entries(grouped)) {
      const emoji = type === 'THREAT_ACTOR' ? ':ninja:' :
                    type === 'MALWARE' ? ':bug:' :
                    type === 'INFRASTRUCTURE' ? ':globe_with_meridians:' :
                    type === 'VULNERABILITY' ? ':warning:' :
                    ':mag:';

      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `${emoji} *${type}:* ${typeEntities.map(e => `\`${e.value}\``).join(', ')}`,
          },
        ],
      });
    }

    return blocks;
  }

  // ===========================================================================
  // PUBLIC SEND METHODS
  // ===========================================================================

  /**
   * Send approval request to channel
   */
  async sendApprovalRequest(channel: string, request: ApprovalRequest): Promise<void> {
    await this.app.client.chat.postMessage({
      channel,
      blocks: this.formatApprovalRequest(request),
      text: `Approval required for ${request.operation.toolId}:${request.operation.operation}`,
    });
  }

  /**
   * Reply in thread
   */
  async replyInThread(channel: string, threadTs: string, response: ChatResponse): Promise<void> {
    await this.app.client.chat.postMessage({
      channel,
      thread_ts: threadTs,
      blocks: this.formatResponseBlocks(response),
      text: response.content,
    });
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createSlackAdapter(config: SlackAdapterConfig): SlackAdapter {
  return new SlackAdapter(config);
}

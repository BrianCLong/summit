/**
 * Message Bus for Inter-Agent Communication
 * Provides pub/sub and direct messaging capabilities
 */

import { EventEmitter } from 'eventemitter3';
import Redis from 'ioredis';
import { Logger } from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { AgentMessage, AgentMessageSchema } from '../types/agent.types.js';

export interface MessageBusConfig {
  redisUrl?: string;
  namespace?: string;
}

export class MessageBus extends EventEmitter {
  private redis: Redis;
  private subscriber: Redis;
  private namespace: string;
  private logger: Logger;
  private subscriptions: Map<string, Set<string>>; // topic -> Set<agentIds>

  constructor(config: MessageBusConfig, logger: Logger) {
    super();
    this.namespace = config.namespace || 'agents';
    this.logger = logger.child({ component: 'MessageBus' });
    this.subscriptions = new Map();

    // Create Redis connections
    const redisUrl = config.redisUrl || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
    this.subscriber = new Redis(redisUrl);

    this.setupSubscriber();
  }

  private setupSubscriber(): void {
    this.subscriber.on('message', (channel: string, message: string) => {
      try {
        const msg = JSON.parse(message);
        const validated = AgentMessageSchema.parse(msg);
        this.handleIncomingMessage(validated);
      } catch (error) {
        this.logger.error({ error, channel, message }, 'Invalid message received');
      }
    });

    this.subscriber.on('error', (error) => {
      this.logger.error(error, 'Subscriber error');
    });
  }

  /**
   * Send a direct message to a specific agent
   */
  async sendDirect(from: string, to: string, payload: any, type = 'request'): Promise<void> {
    const message: AgentMessage = {
      id: uuidv4(),
      from,
      to,
      type: type as any,
      payload,
      timestamp: new Date().toISOString(),
    };

    const channel = this.getAgentChannel(to);
    await this.redis.publish(channel, JSON.stringify(message));

    this.logger.debug({ from, to, messageId: message.id }, 'Direct message sent');
  }

  /**
   * Broadcast a message to multiple agents or a topic
   */
  async broadcast(from: string, topic: string, payload: any): Promise<void> {
    const message: AgentMessage = {
      id: uuidv4(),
      from,
      to: topic,
      type: 'broadcast',
      payload,
      timestamp: new Date().toISOString(),
    };

    const channel = this.getTopicChannel(topic);
    await this.redis.publish(channel, JSON.stringify(message));

    this.logger.debug({ from, topic, messageId: message.id }, 'Broadcast message sent');
  }

  /**
   * Send a query and wait for response
   */
  async query(from: string, to: string, payload: any, timeoutMs = 30000): Promise<any> {
    const correlationId = uuidv4();
    const message: AgentMessage = {
      id: uuidv4(),
      from,
      to,
      type: 'query',
      payload,
      timestamp: new Date().toISOString(),
      correlationId,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.off(`response:${correlationId}`, responseHandler);
        reject(new Error('Query timeout'));
      }, timeoutMs);

      const responseHandler = (response: AgentMessage) => {
        clearTimeout(timeout);
        resolve(response.payload);
      };

      this.once(`response:${correlationId}`, responseHandler);

      // Send the query
      const channel = this.getAgentChannel(to);
      this.redis.publish(channel, JSON.stringify(message)).catch(reject);
    });
  }

  /**
   * Send a response to a query
   */
  async respond(to: string, correlationId: string, from: string, payload: any): Promise<void> {
    const message: AgentMessage = {
      id: uuidv4(),
      from,
      to,
      type: 'response',
      payload,
      timestamp: new Date().toISOString(),
      correlationId,
    };

    const channel = this.getAgentChannel(to);
    await this.redis.publish(channel, JSON.stringify(message));

    this.logger.debug({ from, to, correlationId }, 'Response sent');
  }

  /**
   * Subscribe an agent to its direct channel
   */
  async subscribeAgent(agentId: string): Promise<void> {
    const channel = this.getAgentChannel(agentId);
    await this.subscriber.subscribe(channel);
    this.logger.info({ agentId, channel }, 'Agent subscribed to direct channel');
  }

  /**
   * Subscribe an agent to a topic
   */
  async subscribeTopic(agentId: string, topic: string): Promise<void> {
    const channel = this.getTopicChannel(topic);

    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
      await this.subscriber.subscribe(channel);
      this.logger.info({ topic, channel }, 'Subscribed to topic');
    }

    this.subscriptions.get(topic)!.add(agentId);
    this.logger.debug({ agentId, topic }, 'Agent subscribed to topic');
  }

  /**
   * Unsubscribe an agent from a topic
   */
  async unsubscribeTopic(agentId: string, topic: string): Promise<void> {
    const subs = this.subscriptions.get(topic);
    if (subs) {
      subs.delete(agentId);
      if (subs.size === 0) {
        const channel = this.getTopicChannel(topic);
        await this.subscriber.unsubscribe(channel);
        this.subscriptions.delete(topic);
        this.logger.info({ topic }, 'Unsubscribed from topic');
      }
    }
  }

  /**
   * Unsubscribe an agent from its direct channel
   */
  async unsubscribeAgent(agentId: string): Promise<void> {
    const channel = this.getAgentChannel(agentId);
    await this.subscriber.unsubscribe(channel);
    this.logger.info({ agentId }, 'Agent unsubscribed from direct channel');
  }

  /**
   * Handle incoming message and route to appropriate handlers
   */
  private handleIncomingMessage(message: AgentMessage): void {
    this.logger.debug({ message }, 'Handling incoming message');

    // Emit to specific agent listeners
    if (typeof message.to === 'string') {
      this.emit(`agent:${message.to}`, message);
    } else {
      // Broadcast to multiple agents
      message.to.forEach((agentId) => {
        this.emit(`agent:${agentId}`, message);
      });
    }

    // Handle responses to queries
    if (message.type === 'response' && message.correlationId) {
      this.emit(`response:${message.correlationId}`, message);
    }

    // Emit general message event
    this.emit('message', message);
  }

  /**
   * Get the Redis channel for a specific agent
   */
  private getAgentChannel(agentId: string): string {
    return `${this.namespace}:agent:${agentId}`;
  }

  /**
   * Get the Redis channel for a topic
   */
  private getTopicChannel(topic: string): string {
    return `${this.namespace}:topic:${topic}`;
  }

  /**
   * Store a message in the message history
   */
  async storeMessage(message: AgentMessage, ttl = 86400): Promise<void> {
    const key = `${this.namespace}:messages:${message.id}`;
    await this.redis.setex(key, ttl, JSON.stringify(message));
  }

  /**
   * Retrieve a message from history
   */
  async getMessage(messageId: string): Promise<AgentMessage | null> {
    const key = `${this.namespace}:messages:${messageId}`;
    const data = await this.redis.get(key);
    if (!data) return null;
    return AgentMessageSchema.parse(JSON.parse(data));
  }

  /**
   * Get message history for an agent
   */
  async getAgentMessageHistory(
    agentId: string,
    limit = 100,
  ): Promise<AgentMessage[]> {
    const pattern = `${this.namespace}:messages:*`;
    const keys = await this.redis.keys(pattern);

    const messages: AgentMessage[] = [];
    for (const key of keys.slice(0, limit)) {
      const data = await this.redis.get(key);
      if (data) {
        try {
          const msg = AgentMessageSchema.parse(JSON.parse(data));
          if (msg.from === agentId || msg.to === agentId ||
              (Array.isArray(msg.to) && msg.to.includes(agentId))) {
            messages.push(msg);
          }
        } catch {
          // Skip invalid messages
        }
      }
    }

    return messages.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.redis.quit();
    await this.subscriber.quit();
    this.removeAllListeners();
    this.logger.info('MessageBus closed');
  }
}

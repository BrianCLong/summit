import Redis from 'ioredis';
import { getRedisClient } from '../../config/database.js';
import { SwarmMessage } from './types.js';
import logger from '../../utils/logger.js';
import { randomUUID } from 'crypto';

export class GossipProtocol {
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private nodeId: string;
  private handlers: Map<string, (msg: SwarmMessage) => void> = new Map();

  constructor(nodeId: string) {
    this.nodeId = nodeId;
  }

  async initialize(): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
      logger.warn('Redis not available for GossipProtocol');
      return;
    }

    this.publisher = redis.duplicate();
    this.subscriber = redis.duplicate();

    await this.subscriber.subscribe('swarm:gossip', 'swarm:consensus');

    this.subscriber.on('message', (channel, message) => {
      try {
        const parsed: SwarmMessage = JSON.parse(message);
        // Don't process own messages
        if (parsed.senderId === this.nodeId) return;

        const handler = this.handlers.get(channel);
        if (handler) {
          handler(parsed);
        }
      } catch (err) {
        logger.error('Failed to parse gossip message', err);
      }
    });
  }

  async broadcast(channel: string, message: Omit<SwarmMessage, 'senderId' | 'timestamp' | 'id'>): Promise<void> {
    if (!this.publisher) return;

    const fullMessage: SwarmMessage = {
      ...message,
      id: randomUUID(),
      senderId: this.nodeId,
      timestamp: Date.now(),
    };

    await this.publisher.publish(channel, JSON.stringify(fullMessage));
  }

  on(channel: string, handler: (msg: SwarmMessage) => void): void {
    this.handlers.set(channel, handler);
  }

  async shutdown(): Promise<void> {
    if (this.publisher) await this.publisher.quit();
    if (this.subscriber) await this.subscriber.quit();
  }
}

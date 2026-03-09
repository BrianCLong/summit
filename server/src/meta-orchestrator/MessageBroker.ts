import { getRedisClient } from '../db/redis.js';
import { randomUUID } from 'crypto';
import { AgentMessage } from '../services/orchestration/types.js';

export class MessageBroker {
  private static instance: MessageBroker;
  private pubClient = getRedisClient();
  private subClient = getRedisClient().duplicate();
  private callbacks = new Map<string, (msg: AgentMessage) => void>();

  private constructor() {
    this.subClient.on('message', (channel, message) => {
      try {
        const parsed = JSON.parse(message) as AgentMessage;
        const cb = this.callbacks.get(channel);
        if (cb) {
          cb(parsed);
        }
      } catch (err) {
        console.error('Failed to parse incoming agent message', err);
      }
    });
  }

  public static getInstance(): MessageBroker {
    if (!MessageBroker.instance) {
      MessageBroker.instance = new MessageBroker();
    }
    return MessageBroker.instance;
  }

  public async publish(topic: string, message: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<string> {
    const fullMessage: AgentMessage = {
      ...message,
      id: randomUUID(),
      timestamp: new Date()
    };
    await this.pubClient.publish(topic, JSON.stringify(fullMessage));
    return fullMessage.id;
  }

  public async subscribe(topic: string, callback: (msg: AgentMessage) => void): Promise<void> {
    this.callbacks.set(topic, callback);
    await this.subClient.subscribe(topic);
  }

  public async unsubscribe(topic: string): Promise<void> {
    this.callbacks.delete(topic);
    await this.subClient.unsubscribe(topic);
  }
}

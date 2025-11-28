import { EventEmitter } from 'events';
import { BaseReceiver, DeliveryResult, ReceiverConfig } from './ReceiverInterface.js';
import { CanonicalEvent } from '../events/EventSchema.js';
import { RenderedTemplate } from '../templates/TemplateRenderer.js';

export type RealtimeChannel = 'websocket' | 'sse';

export interface RealtimeClient {
  id: string;
  userId?: string;
  channels?: string[];
  type: RealtimeChannel;
  send: (payload: string) => void | Promise<void>;
}

export interface RealtimeSessionOptions {
  maxPerUser?: number;
}

export interface RealtimeReceiverConfig extends ReceiverConfig {
  manager?: RealtimeSessionManager;
  poolOptions?: RealtimeSessionOptions;
}

export class RealtimeSessionManager extends EventEmitter {
  private clients: Map<string, RealtimeClient> = new Map();
  private userPools: Map<string, string[]> = new Map();

  constructor(private readonly options: RealtimeSessionOptions = {}) {
    super();
  }

  addClient(client: RealtimeClient): void {
    if (client.userId && this.options.maxPerUser) {
      const pool = this.userPools.get(client.userId) || [];
      if (pool.length >= this.options.maxPerUser) {
        const evictedClientId = pool.shift();
        if (evictedClientId) {
          this.evictClient(evictedClientId);
        }
      }

      pool.push(client.id);
      this.userPools.set(client.userId, pool);
    }

    this.clients.set(client.id, client);
    this.emit('connected', client);
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      if (client.userId) {
        const pool = this.userPools.get(client.userId) || [];
        this.userPools.set(
          client.userId,
          pool.filter((id) => id !== clientId),
        );
      }
      this.emit('disconnected', client);
    }
  }

  private evictClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    this.clients.delete(clientId);
    if (client.userId) {
      const pool = this.userPools.get(client.userId) || [];
      this.userPools.set(
        client.userId,
        pool.filter((id) => id !== clientId),
      );
    }

    this.emit('evicted', client);
  }

  async broadcast(
    recipientId: string,
    payload: Record<string, unknown>,
  ): Promise<string[]> {
    const targets = Array.from(this.clients.values()).filter(
      (client) => client.userId === recipientId || client.channels?.includes(recipientId),
    );

    const serialized = JSON.stringify(payload);
    const ackIds: string[] = [];
    for (const client of targets) {
      await client.send(serialized);
      ackIds.push(client.id);
    }
    return ackIds;
  }

  async broadcastAll(payload: Record<string, unknown>): Promise<string[]> {
    const serialized = JSON.stringify(payload);
    const ackIds: string[] = [];
    for (const client of this.clients.values()) {
      await client.send(serialized);
      ackIds.push(client.id);
    }
    return ackIds;
  }

  hasRecipient(recipientId: string): boolean {
    return Array.from(this.clients.values()).some(
      (client) => client.userId === recipientId || client.channels?.includes(recipientId),
    );
  }

  getPoolState(userId: string): string[] {
    return [...(this.userPools.get(userId) || [])];
  }
}

export class RealtimeReceiver extends BaseReceiver {
  private realtimeConfig: RealtimeReceiverConfig;
  private manager: RealtimeSessionManager;

  constructor() {
    super('realtime', 'Realtime Notifications');
  }

  protected async onInitialize(): Promise<void> {
    this.realtimeConfig = this.config as RealtimeReceiverConfig;
    this.manager =
      this.realtimeConfig.manager ||
      new RealtimeSessionManager(this.realtimeConfig.poolOptions);
  }

  protected async deliverToRecipient(
    event: CanonicalEvent,
    recipient: string,
    options?: Record<string, unknown>,
  ): Promise<DeliveryResult> {
    const template = options?.template as RenderedTemplate | undefined;
    const payload = {
      event,
      rendered: template,
      digest: options?.digest === true,
    };

    const ackIds = await this.manager.broadcast(recipient, payload);

    return {
      success: ackIds.length > 0,
      recipientId: recipient,
      channel: this.id,
      messageId: ackIds.join(','),
      deliveredAt: new Date(),
      metadata: { targets: ackIds },
    };
  }

  async validateRecipient(recipient: string): Promise<boolean> {
    return this.manager.hasRecipient(recipient);
  }

  protected async performHealthCheck(): Promise<boolean> {
    return true;
  }

  protected async onShutdown(): Promise<void> {
    return;
  }

  getSessionManager(): RealtimeSessionManager {
    return this.manager;
  }
}

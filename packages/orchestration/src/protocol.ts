import { EventEmitter } from 'events';

export interface AgentProtocolAdapter {
  name: string;
  send(message: unknown, target: string): Promise<void>;
  receive(): Promise<unknown>;
  listAgents(): Promise<string[]>;
  registerAgent(agentId: string, metadata?: Record<string, unknown>): Promise<void>;
}

export class LocalAdapter extends EventEmitter implements AgentProtocolAdapter {
  name = 'local';
  private registry = new Set<string>();

  async send(message: unknown, target: string): Promise<void> {
    if (!this.registry.has(target)) {
      throw new Error(`agent ${target} is not registered`);
    }
    this.emit('message', { target, message, timestamp: new Date().toISOString() });
  }

  async receive(): Promise<unknown> {
    return new Promise((resolve) => {
      this.once('message', resolve);
    });
  }

  async listAgents(): Promise<string[]> {
    return Array.from(this.registry.values());
  }

  async registerAgent(agentId: string): Promise<void> {
    this.registry.add(agentId);
  }
}

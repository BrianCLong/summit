import { AgentDescriptor } from './AgentDescriptor.js';

export class AgentRegistry {
  private readonly agents = new Map<string, AgentDescriptor>();

  register(agent: AgentDescriptor): void {
    if (!agent.id) {
      throw new Error('AgentDescriptor.id is required.');
    }
    if (!agent.capabilities.length) {
      throw new Error(`AgentDescriptor.capabilities must be non-empty for ${agent.id}.`);
    }
    this.agents.set(agent.id, agent);
  }

  get(id: string): AgentDescriptor | undefined {
    return this.agents.get(id);
  }

  list(): AgentDescriptor[] {
    return [...this.agents.values()].sort((left, right) => left.id.localeCompare(right.id));
  }
}

export type AgentRiskLevel = 'low' | 'medium' | 'high';

export interface AgentDescriptor {
  id: string;
  name: string;
  capabilities: string[];
  tools: string[];
  riskLevel: AgentRiskLevel;
  observabilityScore?: number;
  determinismScore?: number;
}

export class AgentRegistry {
  private readonly agents = new Map<string, AgentDescriptor>();

  register(agent: AgentDescriptor): void {
    this.agents.set(agent.id, agent);
  }

  get(id: string): AgentDescriptor | undefined {
    return this.agents.get(id);
  }

  list(): AgentDescriptor[] {
    return [...this.agents.values()];
  }
}

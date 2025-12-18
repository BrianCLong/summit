import { Agent, AgentHealth, AgentStatus } from './types.js';

export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, Agent> = new Map();

  private constructor() {}

  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  public registerAgent(agent: Omit<Agent, 'status' | 'health'>): Agent {
    const newAgent: Agent = {
      ...agent,
      status: AgentStatus.IDLE,
      health: {
        cpuUsage: 0,
        memoryUsage: 0,
        lastHeartbeat: new Date(),
        activeTasks: 0,
        errorRate: 0
      }
    };
    this.agents.set(agent.id, newAgent);
    return newAgent;
  }

  public getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  public getAllAgents(tenantId?: string): Agent[] {
    const allAgents = Array.from(this.agents.values());
    if (tenantId) {
      return allAgents.filter(a => a.tenantId === tenantId);
    }
    return allAgents;
  }

  public updateStatus(id: string, status: AgentStatus): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.status = status;
      this.agents.set(id, agent);
    }
  }

  public updateHealth(id: string, health: Partial<AgentHealth>): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.health = { ...agent.health, ...health, lastHeartbeat: new Date() };
      this.agents.set(id, agent);
    }
  }

  public removeAgent(id: string): boolean {
    return this.agents.delete(id);
  }
}

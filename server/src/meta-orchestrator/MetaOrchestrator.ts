import { AgentRegistry } from './AgentRegistry.js';
import { HealthMonitor } from './HealthMonitor.js';
import { NegotiationEngine } from './NegotiationEngine.js';
import { GovernanceExtension } from './GovernanceExtension.js';
import { Agent, Negotiation } from './types.js';

export class MetaOrchestrator {
  private static instance: MetaOrchestrator;

  public registry: AgentRegistry;
  public healthMonitor: HealthMonitor;
  public negotiationEngine: NegotiationEngine;
  public governance: GovernanceExtension;

  private constructor() {
    this.registry = AgentRegistry.getInstance();
    this.healthMonitor = new HealthMonitor();
    this.negotiationEngine = new NegotiationEngine();
    this.governance = new GovernanceExtension();

    this.healthMonitor.startMonitoring();
  }

  public static getInstance(): MetaOrchestrator {
    if (!MetaOrchestrator.instance) {
      MetaOrchestrator.instance = new MetaOrchestrator();
    }
    return MetaOrchestrator.instance;
  }

  public registerAgent(agent: Omit<Agent, 'status' | 'health'>): Agent {
    return this.registry.registerAgent(agent);
  }

  public getAgents(tenantId?: string): Agent[] {
    return this.registry.getAllAgents(tenantId);
  }

  public async createNegotiation(initiatorId: string, participantIds: string[], topic: string, context: any, tenantId: string): Promise<Negotiation> {
     return this.negotiationEngine.initiateNegotiation(initiatorId, participantIds, topic, context, tenantId);
  }

  public async submitProposal(negotiationId: string, agentId: string, content: any): Promise<Negotiation> {
      return this.negotiationEngine.submitProposal(negotiationId, agentId, content);
  }
}

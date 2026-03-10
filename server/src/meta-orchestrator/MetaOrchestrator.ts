import { AgentRegistry } from './AgentRegistry.js';
import { HealthMonitor } from './HealthMonitor.js';
import { NegotiationEngine } from './NegotiationEngine.js';
import { GovernanceExtension } from './GovernanceExtension.js';
import { MessageBroker } from './MessageBroker.js';
import { Agent, Negotiation } from './types.js';
import { traceTask } from '../services/orchestration/telemetry.js';

export class MetaOrchestrator {
  private static instance: MetaOrchestrator;

  public registry: AgentRegistry;
  public healthMonitor: HealthMonitor;
  public negotiationEngine: NegotiationEngine;
  public governance: GovernanceExtension;
  public messageBroker: MessageBroker;

  private constructor() {
    this.registry = AgentRegistry.getInstance();
    this.healthMonitor = new HealthMonitor();
    this.negotiationEngine = new NegotiationEngine();
    this.governance = new GovernanceExtension();
    this.messageBroker = MessageBroker.getInstance();

    this.healthMonitor.startMonitoring();
  }

  public static getInstance(): MetaOrchestrator {
    if (!MetaOrchestrator.instance) {
      MetaOrchestrator.instance = new MetaOrchestrator();
    }
    return MetaOrchestrator.instance;
  }

  public async registerAgent(agent: Omit<Agent, 'status' | 'health'>): Promise<Agent> {
    return traceTask('registerAgent', async () => {
      return await this.registry.registerAgent(agent);
    });
  }

  public async getAgents(tenantId?: string): Promise<Agent[]> {
    return traceTask('getAgents', async () => {
      return await this.registry.getAllAgents(tenantId);
    });
  }

  public async createNegotiation(initiatorId: string, participantIds: string[], topic: string, context: any, tenantId: string): Promise<Negotiation> {
     return traceTask('createNegotiation', async () => {
        return this.negotiationEngine.initiateNegotiation(initiatorId, participantIds, topic, context, tenantId);
     });
  }

  public async submitProposal(negotiationId: string, agentId: string, content: any): Promise<Negotiation> {
      return traceTask('submitProposal', async () => {
         return this.negotiationEngine.submitProposal(negotiationId, agentId, content);
      });
  }
}

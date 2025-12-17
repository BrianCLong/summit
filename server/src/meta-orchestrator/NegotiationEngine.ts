import { Negotiation, NegotiationStatus, NegotiationRound, Proposal } from './types.js';
import { GovernanceExtension } from './GovernanceExtension.js';
import { randomUUID } from 'crypto';

export class NegotiationEngine {
  private negotiations: Map<string, Negotiation> = new Map();
  private governance: GovernanceExtension;

  constructor() {
    this.governance = new GovernanceExtension();
  }

  public async initiateNegotiation(
    initiatorId: string,
    participantIds: string[],
    topic: string,
    context: any,
    tenantId: string
  ): Promise<Negotiation> {

    const allowed = await this.governance.validateNegotiation(initiatorId, participantIds, topic);
    if (!allowed) {
      throw new Error('Negotiation blocked by governance policy');
    }

    const negotiation: Negotiation = {
      id: randomUUID(),
      initiatorId,
      participantIds,
      topic,
      status: NegotiationStatus.PENDING,
      rounds: [],
      context,
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.negotiations.set(negotiation.id, negotiation);
    return negotiation;
  }

  public getNegotiation(id: string): Negotiation | undefined {
    return this.negotiations.get(id);
  }

  public getAllNegotiations(tenantId?: string): Negotiation[] {
    const all = Array.from(this.negotiations.values());
    if (tenantId) {
      return all.filter(n => n.tenantId === tenantId);
    }
    return all;
  }

  public async submitProposal(negotiationId: string, agentId: string, content: any): Promise<Negotiation> {
    const negotiation = this.negotiations.get(negotiationId);
    if (!negotiation) throw new Error('Negotiation not found');

    if (negotiation.status === NegotiationStatus.COMPLETED || negotiation.status === NegotiationStatus.FAILED) {
        throw new Error('Negotiation is closed');
    }

    negotiation.status = NegotiationStatus.IN_PROGRESS;

    // Check governance for this specific proposal
    const allowed = await this.governance.validateAction(agentId, 'submit_proposal', { ...negotiation.context, content });
    if (!allowed) {
        throw new Error('Proposal blocked by governance');
    }

    // Find current round or create new one
    let currentRound = negotiation.rounds[negotiation.rounds.length - 1];
    if (!currentRound || currentRound.consensusReached) {
      currentRound = {
        id: randomUUID(),
        roundNumber: negotiation.rounds.length + 1,
        proposals: [],
        consensusReached: false
      };
      negotiation.rounds.push(currentRound);
    }

    const proposal: Proposal = {
      id: randomUUID(),
      agentId,
      content,
      timestamp: new Date()
    };

    currentRound.proposals.push(proposal);
    negotiation.updatedAt = new Date();

    // Simple logic: if all participants have proposed, check for consensus (mock logic)
    // In a real system, an LLM or logic evaluator would check this.

    return negotiation;
  }

  public resolveNegotiation(negotiationId: string, success: boolean, finalAgreement?: any): Negotiation {
      const negotiation = this.negotiations.get(negotiationId);
      if (!negotiation) throw new Error('Negotiation not found');

      negotiation.status = success ? NegotiationStatus.COMPLETED : NegotiationStatus.FAILED;
      negotiation.finalAgreement = finalAgreement;
      negotiation.updatedAt = new Date();

      return negotiation;
  }
}

/**
 * Capsule Policy Engine
 *
 * Manages cross-agent capsule acceptance and trust relationships.
 *
 * @see docs/adr/ADR-010_invariant_carrying_context_capsules.md
 */

import {
  ContextCapsule,
  Agent,
  AcceptanceDecision,
  CapsuleForwarding
} from './types.js';

/**
 * CapsulePolicy
 *
 * Enforces trust relationships and policy compatibility between agents
 * when capsules are forwarded or shared.
 */
export class CapsulePolicy {
  private agents: Map<string, Agent> = new Map();
  private forwardingRecords: Map<string, CapsuleForwarding> = new Map();

  /**
   * Register an agent in the policy system
   */
  registerAgent(agent: Agent): void {
    this.agents.set(agent.id, agent);
  }

  /**
   * Determine if a receiving agent can accept a capsule
   */
  canAcceptCapsule(
    capsule: ContextCapsule,
    receivingAgentId: string,
    sendingAgentId: string
  ): AcceptanceDecision {
    const receivingAgent = this.agents.get(receivingAgentId);
    const sendingAgent = this.agents.get(sendingAgentId);

    if (!receivingAgent) {
      return {
        accepted: false,
        reason: `Receiving agent not registered: ${receivingAgentId}`
      };
    }

    if (!sendingAgent) {
      return {
        accepted: false,
        reason: `Sending agent not registered: ${sendingAgentId}`
      };
    }

    // Rule 1: Trust tier check
    if (sendingAgent.trustTier < receivingAgent.requiredTrustTier) {
      return {
        accepted: false,
        reason: `Trust tier mismatch: sender=${sendingAgent.trustTier}, required=${receivingAgent.requiredTrustTier}`
      };
    }

    // Rule 2: Policy domain compatibility
    if (!this.arePolicyDomainsCompatible(capsule.metadata.policyDomain, receivingAgent.policyDomain)) {
      return {
        accepted: false,
        reason: `Policy domain incompatible: capsule=${capsule.metadata.policyDomain}, agent=${receivingAgent.policyDomain}`
      };
    }

    // Rule 3: Signature requirement check
    if (receivingAgent.requireSignedCapsules && !capsule.signature) {
      return {
        accepted: false,
        reason: 'Agent requires signed capsules, but capsule is unsigned'
      };
    }

    // Rule 4: Expiration check
    if (capsule.metadata.validUntil && new Date() > capsule.metadata.validUntil) {
      return {
        accepted: false,
        reason: `Capsule expired at ${capsule.metadata.validUntil.toISOString()}`
      };
    }

    // Rule 5: Authority scope compatibility
    const requiredTransformations: ('redact' | 'strip_signature' | 'downgrade_tier')[] = [];

    // If receiving agent has more restrictive authority, flag for review
    const capsuleScopes = new Set(capsule.metadata.authorityScope);
    const hasWrite = capsuleScopes.has('write') || capsuleScopes.has('execute');
    const receiverIsReadOnly = !receivingAgent.policyDomain.includes('write');

    if (hasWrite && receiverIsReadOnly) {
      requiredTransformations.push('downgrade_tier');
    }

    return {
      accepted: true,
      reason: 'Capsule accepted',
      requiredTransformations: requiredTransformations.length > 0 ? requiredTransformations : undefined
    };
  }

  /**
   * Record capsule forwarding for lineage tracking
   */
  recordForwarding(
    capsule: ContextCapsule,
    fromAgentId: string,
    toAgentId: string
  ): CapsuleForwarding {
    const existingRecord = this.forwardingRecords.get(capsule.id);

    const forwardingChain = existingRecord
      ? [...existingRecord.forwardingChain, fromAgentId]
      : [capsule.metadata.createdBy, fromAgentId];

    const record: CapsuleForwarding = {
      originalCapsuleId: capsule.id,
      originalCreator: capsule.metadata.createdBy,
      forwardingChain,
      currentHolder: toAgentId,
      lastForwardedAt: new Date()
    };

    this.forwardingRecords.set(capsule.id, record);
    return record;
  }

  /**
   * Get forwarding history for a capsule
   */
  getForwardingHistory(capsuleId: string): CapsuleForwarding | undefined {
    return this.forwardingRecords.get(capsuleId);
  }

  /**
   * Check if two policy domains are compatible
   */
  private arePolicyDomainsCompatible(capsuleDomain: string, agentDomain: string): boolean {
    // Simple prefix matching (production would use hierarchical domain logic)
    if (capsuleDomain === agentDomain) {
      return true;
    }

    // Allow subdomain access (e.g., "finance.reporting" can access "finance")
    if (capsuleDomain.startsWith(agentDomain + '.')) {
      return true;
    }

    // Wildcard domains
    if (agentDomain === '*' || capsuleDomain === '*') {
      return true;
    }

    return false;
  }

  /**
   * Compute effective authority scope after cross-agent transfer
   */
  computeEffectiveAuthority(
    capsule: ContextCapsule,
    receivingAgent: Agent
  ): string[] {
    const capsuleScopes = new Set(capsule.metadata.authorityScope);

    // Intersection of capsule authority and agent capabilities
    // (Production would have more sophisticated permission calculus)

    const effectiveScopes: string[] = [];

    if (capsuleScopes.has('read')) {
      effectiveScopes.push('read');
    }

    if (capsuleScopes.has('write') && !receivingAgent.policyDomain.includes('readonly')) {
      effectiveScopes.push('write');
    }

    if (capsuleScopes.has('execute') && receivingAgent.policyDomain.includes('execution')) {
      effectiveScopes.push('execute');
    }

    return effectiveScopes;
  }

  /**
   * Validate capsule forwarding chain integrity
   */
  validateForwardingChain(capsule: ContextCapsule): boolean {
    const forwardingChain = (capsule.metadata.forwardingChain || []) as string[];

    // Check that all agents in chain are registered
    for (const agentId of forwardingChain) {
      if (!this.agents.has(agentId)) {
        console.error(`Unknown agent in forwarding chain: ${agentId}`);
        return false;
      }
    }

    // Check that chain is monotonically non-increasing in trust
    // (Capsules cannot be escalated to higher trust by forwarding)
    let previousTrust = Infinity;

    for (const agentId of [capsule.metadata.createdBy, ...forwardingChain]) {
      const agent = this.agents.get(agentId);
      if (!agent) continue;

      if (agent.trustTier < previousTrust) {
        console.error('Trust escalation detected in forwarding chain');
        return false;
      }

      previousTrust = agent.trustTier;
    }

    return true;
  }

  /**
   * Create a quarantine policy (deny all capsules from specific agents)
   */
  createQuarantinePolicy(quarantinedAgentIds: string[]): (capsule: ContextCapsule) => AcceptanceDecision {
    const quarantinedSet = new Set(quarantinedAgentIds);

    return (capsule: ContextCapsule) => {
      // Check if capsule originated from quarantined agent
      if (quarantinedSet.has(capsule.metadata.createdBy)) {
        return {
          accepted: false,
          reason: `Capsule originated from quarantined agent: ${capsule.metadata.createdBy}`
        };
      }

      // Check if capsule was forwarded through quarantined agent
      const forwardingChain = (capsule.metadata.forwardingChain || []) as string[];
      for (const agentId of forwardingChain) {
        if (quarantinedSet.has(agentId)) {
          return {
            accepted: false,
            reason: `Capsule forwarded through quarantined agent: ${agentId}`
          };
        }
      }

      return {
        accepted: true,
        reason: 'Capsule passed quarantine check'
      };
    };
  }

  /**
   * Export policy state for persistence
   */
  toJSON(): object {
    return {
      agents: Array.from(this.agents.values()),
      forwardingRecords: Array.from(this.forwardingRecords.values())
    };
  }
}

/**
 * Default trust tier hierarchy
 */
export const DEFAULT_TRUST_TIERS = {
  SYSTEM: 0,
  VERIFIED: 1,
  USER: 2,
  EXTERNAL: 3
};

/**
 * Helper: Create an agent with default settings
 */
export function createAgent(
  id: string,
  trustTier: number,
  policyDomain: string,
  options?: {
    requiredTrustTier?: number;
    requireSignedCapsules?: boolean;
    publicKey?: string;
  }
): Agent {
  return {
    id,
    trustTier,
    requiredTrustTier: options?.requiredTrustTier ?? trustTier,
    policyDomain,
    requireSignedCapsules: options?.requireSignedCapsules ?? false,
    publicKey: options?.publicKey
  };
}

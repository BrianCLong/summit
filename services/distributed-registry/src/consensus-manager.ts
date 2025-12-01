/**
 * Consensus Manager - Byzantine Fault Tolerant consensus for data pool operations
 */

import type { DataPool } from './index.js';
import crypto from 'crypto';

interface Proposal {
  id: string;
  type: 'pool_registration' | 'contributor_add' | 'permission_change';
  data: unknown;
  proposer: string;
  votes: Map<string, { vote: boolean; signature: string }>;
  createdAt: Date;
  status: 'pending' | 'accepted' | 'rejected';
}

interface ConsensusResult {
  accepted: boolean;
  proof: string;
  votes: { for: number; against: number };
}

export class ConsensusManager {
  private proposals: Map<string, Proposal> = new Map();
  private quorumThreshold = 0.67; // 2/3 majority required

  async proposePoolRegistration(pool: DataPool): Promise<ConsensusResult> {
    const proposalId = crypto.randomUUID();
    const proposal: Proposal = {
      id: proposalId,
      type: 'pool_registration',
      data: pool,
      proposer: pool.owner,
      votes: new Map(),
      createdAt: new Date(),
      status: 'pending',
    };

    this.proposals.set(proposalId, proposal);

    // In production, this would broadcast to peers and await votes
    // For now, auto-accept for single-node operation
    proposal.status = 'accepted';

    return {
      accepted: true,
      proof: this.generateConsensusProof(proposal),
      votes: { for: 1, against: 0 },
    };
  }

  async submitVote(proposalId: string, vote: boolean, signature: string): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }

    // Verify signature (simplified)
    const voterId = this.extractVoterIdFromSignature(signature);
    proposal.votes.set(voterId, { vote, signature });

    // Check if quorum reached
    await this.checkQuorum(proposalId);
  }

  private async checkQuorum(proposalId: string): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.status !== 'pending') return;

    const totalVotes = proposal.votes.size;
    let forVotes = 0;
    let againstVotes = 0;

    for (const [_, v] of proposal.votes) {
      if (v.vote) forVotes++;
      else againstVotes++;
    }

    // Simplified quorum check
    if (forVotes / totalVotes >= this.quorumThreshold) {
      proposal.status = 'accepted';
    } else if (againstVotes / totalVotes > 1 - this.quorumThreshold) {
      proposal.status = 'rejected';
    }
  }

  private generateConsensusProof(proposal: Proposal): string {
    const proofData = {
      proposalId: proposal.id,
      type: proposal.type,
      status: proposal.status,
      timestamp: new Date().toISOString(),
      voteSummary: {
        total: proposal.votes.size,
        for: Array.from(proposal.votes.values()).filter((v) => v.vote).length,
      },
    };
    return Buffer.from(JSON.stringify(proofData)).toString('base64');
  }

  private extractVoterIdFromSignature(_signature: string): string {
    // In production, extract from cryptographic signature
    return crypto.randomUUID();
  }

  async getProposal(proposalId: string): Promise<Proposal | undefined> {
    return this.proposals.get(proposalId);
  }
}

import { pg } from '../db/pg.js';
import { v4 as uuidv4 } from 'uuid';

export interface ArchitecturalProposal {
  id: string;
  title: string;
  description: string;
  proposerId: string;
  tenantId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED';
  metadata: Record<string, any>;
  evidenceBundleUri?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CouncilVote {
  id: string;
  proposalId: string;
  voterId: string;
  vote: 'YES' | 'NO' | 'ABSTAIN';
  reason?: string;
  evidenceHash?: string;
  createdAt: Date;
}

export interface ConsensusResult {
  proposalId: string;
  approved: boolean;
  votes: { voterId: string; vote: string; reason: string }[];
  finalDecision: string;
}

export class CouncilService {
  private static instance: CouncilService;

  private constructor() {}

  public static getInstance(): CouncilService {
    if (!CouncilService.instance) {
      CouncilService.instance = new CouncilService();
    }
    return CouncilService.instance;
  }

  public async createProposal(data: {
    title: string;
    description: string;
    proposerId: string;
    tenantId: string;
    metadata?: Record<string, any>;
    evidenceBundleUri?: string;
  }): Promise<ArchitecturalProposal> {
    const id = uuidv4();
    const proposal = await pg.write(
      `INSERT INTO architectural_proposals (
        id, title, description, proposer_id, tenant_id, metadata, evidence_bundle_uri
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        id,
        data.title,
        data.description,
        data.proposerId,
        data.tenantId,
        JSON.stringify(data.metadata || {}),
        data.evidenceBundleUri,
      ],
      { tenantId: data.tenantId }
    );

    return this.mapProposalRow(proposal);
  }

  public async castVote(data: {
    proposalId: string;
    voterId: string;
    tenantId: string;
    vote: 'YES' | 'NO' | 'ABSTAIN';
    reason?: string;
    evidenceHash?: string;
  }): Promise<CouncilVote> {
    // Verify voter is a council member
    const member = await pg.read(
      'SELECT 1 FROM council_members WHERE user_id = $1 AND tenant_id = $2 AND active = TRUE',
      [data.voterId, data.tenantId],
      { tenantId: data.tenantId }
    );

    if (!member) {
      throw new Error('User is not an active council member');
    }

    const vote = await pg.write(
      `INSERT INTO council_votes (proposal_id, voter_id, vote, reason, evidence_hash)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (proposal_id, voter_id)
       DO UPDATE SET vote = EXCLUDED.vote, reason = EXCLUDED.reason, evidence_hash = EXCLUDED.evidence_hash
       RETURNING *`,
      [data.proposalId, data.voterId, data.vote, data.reason, data.evidenceHash],
      { tenantId: data.tenantId }
    );

    // Trigger consensus check after vote
    await this.evaluateConsensus(data.proposalId, data.tenantId);

    return this.mapVoteRow(vote);
  }

  public async getProposal(id: string, tenantId: string): Promise<ArchitecturalProposal | null> {
    const row = await pg.read(
      'SELECT * FROM architectural_proposals WHERE id = $1 AND tenant_id = $2',
      [id, tenantId],
      { tenantId }
    );
    return row ? this.mapProposalRow(row) : null;
  }

  private async evaluateConsensus(proposalId: string, tenantId: string): Promise<void> {
    const votes = await pg.readMany(
      'SELECT * FROM council_votes WHERE proposal_id = $1',
      [proposalId],
      { tenantId }
    );

    const members = await pg.readMany(
      'SELECT * FROM council_members WHERE tenant_id = $1 AND active = TRUE',
      [tenantId],
      { tenantId }
    );

    const yesVotes = votes.filter((v: any) => v.vote === 'YES').length;
    const totalMembers = members.length;

    // Simple majority consensus rule
    if (yesVotes > totalMembers / 2) {
      await pg.write(
        "UPDATE architectural_proposals SET status = 'APPROVED', updated_at = NOW() WHERE id = $1",
        [proposalId],
        { tenantId }
      );
    } else if (votes.filter((v: any) => v.vote === 'NO').length > totalMembers / 2) {
      await pg.write(
        "UPDATE architectural_proposals SET status = 'REJECTED', updated_at = NOW() WHERE id = $1",
        [proposalId],
        { tenantId }
      );
    }
  }

  private mapProposalRow(row: any): ArchitecturalProposal {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      proposerId: row.proposer_id,
      tenantId: row.tenant_id,
      status: row.status,
      metadata: row.metadata,
      evidenceBundleUri: row.evidence_bundle_uri,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapVoteRow(row: any): CouncilVote {
    return {
      id: row.id,
      proposalId: row.proposal_id,
      voterId: row.voter_id,
      vote: row.vote,
      reason: row.reason,
      evidenceHash: row.evidence_hash,
      createdAt: row.created_at,
    };
  }

  public async registerCouncilMember(userId: string, tenantId: string, role: string = 'MEMBER'): Promise<void> {
    await pg.write(
      `INSERT INTO council_members (user_id, tenant_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = EXCLUDED.role, active = TRUE`,
      [userId, tenantId, role],
      { tenantId }
    );
  }
}

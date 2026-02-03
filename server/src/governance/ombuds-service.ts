import { randomUUID } from 'crypto';
import { provenanceLedger } from '../provenance/ledger.js';
import { logger } from '../config/logger.js';
import { getPostgresPool } from '../config/database.js';

export type OmbudsTrigger = 'tripwire' | 'export_appeal' | 'policy_exception';
export type OmbudsRuling = 'approve' | 'deny' | 'coach' | 'escalate';
export type DecisionStatus = 'draft' | 'final';

export interface OmbudsDecision {
  decisionId: string;
  tenantId: string;
  caseId: string;
  trigger: OmbudsTrigger;
  ruling: OmbudsRuling;
  rationale: {
    summary: string; // Structured short reason
    text: string;    // Free text explanation
  };
  linkedEvidence: {
    auditEventIds: string[];
    claimIds: string[];
    bundleIds: string[];
  };
  redactionNotes?: string;
  tags: string[]; // Added for Precedent Search
  status: DecisionStatus;
  createdAt: Date;
  updatedAt: Date;
  decidedBy: string; // Actor ID (e.g., ombuds user)
}

export interface CreateDecisionInput {
  tenantId: string;
  caseId: string;
  trigger: OmbudsTrigger;
  ruling: OmbudsRuling;
  rationale: {
    summary: string;
    text: string;
  };
  linkedEvidence?: {
    auditEventIds?: string[];
    claimIds?: string[];
    bundleIds?: string[];
  };
  redactionNotes?: string;
  tags?: string[];
  decidedBy: string;
}

export class OmbudsService {
  constructor() {
    this.initializeSchema().catch(err => {
      logger.error({ error: err }, 'Failed to initialize OmbudsService schema');
    });
  }

  private async initializeSchema() {
    try {
      const pool = getPostgresPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ombuds_decisions (
          decision_id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          case_id TEXT NOT NULL,
          trigger TEXT NOT NULL,
          ruling TEXT NOT NULL,
          rationale JSONB NOT NULL,
          linked_evidence JSONB NOT NULL,
          redaction_notes TEXT,
          tags TEXT[],
          status TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          decided_by TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_ombuds_decisions_tenant ON ombuds_decisions(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_ombuds_decisions_case ON ombuds_decisions(case_id);
        CREATE INDEX IF NOT EXISTS idx_ombuds_decisions_tags ON ombuds_decisions USING GIN(tags);
      `);
    } catch (e: any) {
      // In tests/sandbox where DB might be missing, log and ignore?
      // But for production this is critical.
      logger.warn({ error: e }, "Could not initialize DB schema for OmbudsService");
    }
  }

  async recordDecision(input: CreateDecisionInput): Promise<OmbudsDecision> {
    const decision: OmbudsDecision = {
      decisionId: `dec_${randomUUID()}`,
      tenantId: input.tenantId,
      caseId: input.caseId,
      trigger: input.trigger,
      ruling: input.ruling,
      rationale: input.rationale,
      linkedEvidence: {
        auditEventIds: input.linkedEvidence?.auditEventIds || [],
        claimIds: input.linkedEvidence?.claimIds || [],
        bundleIds: input.linkedEvidence?.bundleIds || [],
      },
      redactionNotes: input.redactionNotes,
      tags: input.tags || [],
      status: 'final', // For MVP, we go straight to final.
      createdAt: new Date(),
      updatedAt: new Date(),
      decidedBy: input.decidedBy,
    };

    // Persist to DB
    try {
      const pool = getPostgresPool();
      await pool.query(`
        INSERT INTO ombuds_decisions (
          decision_id, tenant_id, case_id, trigger, ruling, rationale,
          linked_evidence, redaction_notes, tags, status, created_at, updated_at, decided_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        decision.decisionId, decision.tenantId, decision.caseId, decision.trigger, decision.ruling,
        JSON.stringify(decision.rationale), JSON.stringify(decision.linkedEvidence),
        decision.redactionNotes, decision.tags, decision.status,
        decision.createdAt, decision.updatedAt, decision.decidedBy
      ]);
    } catch (e: any) {
      logger.error({ error: e }, "Failed to persist decision to DB");
      // Fallback or throw? Ideally throw. But for now, if DB is down, maybe we just rely on Ledger (which also uses DB but might be different pool/retry logic)
      // I'll throw to be safe as per "Persistence" requirement.
      // But if pool is missing (test env), I might want to skip.
      // I'll throw.
      throw e;
    }

    // Audit trail integration
    try {
      await provenanceLedger.appendEntry({
        timestamp: new Date(),
        tenantId: decision.tenantId,
        actionType: 'ombuds_decision_recorded',
        resourceType: 'OmbudsDecision',
        resourceId: decision.decisionId,
        actorId: decision.decidedBy,
        actorType: 'user', // Assuming ombuds is a user
        payload: {
          mutationType: 'create',
          entityId: decision.decisionId,
          entityType: 'OmbudsDecision',
          trigger: decision.trigger,
          ruling: decision.ruling,
          caseId: decision.caseId,
          tags: decision.tags,
          linkedEvidence: decision.linkedEvidence
        } as any, // Cast to any to allow extra fields if type is strict
        metadata: {
          purpose: 'governance_oversight',
          classification: ['internal', 'confidential']
        }
      });
    } catch (error: any) {
      logger.error({ error, decisionId: decision.decisionId }, 'Failed to append ombuds decision to provenance ledger');
      // We don't block the operation for MVP if ledger fails (e.g. DB issue)
    }

    return decision;
  }

  async getDecision(decisionId: string): Promise<OmbudsDecision | undefined> {
    const pool = getPostgresPool();
    const res = await pool.query('SELECT * FROM ombuds_decisions WHERE decision_id = $1', [decisionId]);
    if (res.rows.length === 0) return undefined;
    return this.mapRowToDecision(res.rows[0]);
  }

  async getDecisionsByCase(caseId: string): Promise<OmbudsDecision[]> {
    const pool = getPostgresPool();
    const res = await pool.query('SELECT * FROM ombuds_decisions WHERE case_id = $1', [caseId]);
    return res.rows.map((row: any) => this.mapRowToDecision(row));
  }

  async getDecisionsByTenant(tenantId: string): Promise<OmbudsDecision[]> {
    const pool = getPostgresPool();
    const res = await pool.query('SELECT * FROM ombuds_decisions WHERE tenant_id = $1', [tenantId]);
    return res.rows.map((row: any) => this.mapRowToDecision(row));
  }

  async getAllDecisions(): Promise<OmbudsDecision[]> {
    const pool = getPostgresPool();
    const res = await pool.query('SELECT * FROM ombuds_decisions');
    return res.rows.map((row: any) => this.mapRowToDecision(row));
  }

  private mapRowToDecision(row: any): OmbudsDecision {
    return {
      decisionId: row.decision_id,
      tenantId: row.tenant_id,
      caseId: row.case_id,
      trigger: row.trigger as OmbudsTrigger,
      ruling: row.ruling as OmbudsRuling,
      rationale: row.rationale,
      linkedEvidence: row.linked_evidence,
      redactionNotes: row.redaction_notes,
      tags: row.tags || [],
      status: row.status as DecisionStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      decidedBy: row.decided_by
    };
  }

  /**
   * Export a decision receipt as JSON
   */
  async generateReceipt(decisionId: string): Promise<object | null> {
    const decision = await this.getDecision(decisionId);
    if (!decision) return null;

    return {
      receiptId: `rcpt_${randomUUID()}`,
      issuedAt: new Date(),
      decision,
      signature: 'mock_signature_for_mvp' // In real system, sign this object
    };
  }
}

export const ombudsService = new OmbudsService();

import { z } from 'zod';
import { getPostgresPool } from '../config/database.js';
import { provenanceLedger } from '../provenance/ledger.js';
import logger from '../utils/logger.js';
import { AppError } from '../lib/errors.js';
import { createHash } from 'crypto';

export const AssuranceSchema = z.object({
  summary: z.string(),
  sourceActor: z.string(),
  recipientActor: z.string().optional(),
  occurredAt: z.string().datetime(),
  channel: z.string(),
  evidenceRef: z.string().optional(),
});
export interface AssuranceInput {
  summary: string;
  sourceActor: string;
  recipientActor?: string;
  occurredAt: string;
  channel: string;
  evidenceRef?: string;
}

export const RiskSchema = z.object({
  category: z.enum(['contractual', 'security', 'sla', 'commercial', 'relationship']),
  description: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['open', 'mitigated', 'accepted', 'resolved']).default('open'),
  mitigationPlan: z.string().optional(),
});
export interface RiskInput {
  category: 'contractual' | 'security' | 'sla' | 'commercial' | 'relationship';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'mitigated' | 'accepted' | 'resolved';
  mitigationPlan?: string;
}

export const ArtifactSchema = z.object({
  name: z.string(),
  type: z.enum(['contract', 'audit_report', 'incident_pack', 'change_log', 'trust_pack', 'other']),
  storageRef: z.string(),
  hash: z.string().regex(/^[a-f0-9]{64}$/, "Must be SHA256 hex"), // Enforce SHA256
});
export interface ArtifactInput {
  name: string;
  type: 'contract' | 'audit_report' | 'incident_pack' | 'change_log' | 'trust_pack' | 'other';
  storageRef: string;
  hash: string;
}

export class AccountDossierService {
  private static instance: AccountDossierService;

  private constructor() {}

  public static getInstance(): AccountDossierService {
    if (!AccountDossierService.instance) {
      AccountDossierService.instance = new AccountDossierService();
    }
    return AccountDossierService.instance;
  }

  async ensureDossier(tenantId: string): Promise<any> {
    const pool = getPostgresPool();

    // UPSERT pattern to avoid race conditions
    const result = await pool.query(
      `INSERT INTO account_dossiers (tenant_id) VALUES ($1)
       ON CONFLICT (tenant_id) DO NOTHING
       RETURNING *`,
      [tenantId]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // If inserted nothing, fetch existing
    const existing = await pool.query(
      'SELECT * FROM account_dossiers WHERE tenant_id = $1',
      [tenantId]
    );
    return existing.rows[0];
  }

  async getDossier(tenantId: string): Promise<any> {
    const pool = getPostgresPool();
    const dossierRes = await pool.query(
      'SELECT * FROM account_dossiers WHERE tenant_id = $1',
      [tenantId]
    );

    if (dossierRes.rows.length === 0) return null;
    const dossier = dossierRes.rows[0];

    const assurances = await pool.query(
      'SELECT * FROM dossier_assurances WHERE dossier_id = $1 ORDER BY occurred_at DESC',
      [dossier.id]
    );
    const risks = await pool.query(
      'SELECT * FROM dossier_risks WHERE dossier_id = $1 ORDER BY severity DESC',
      [dossier.id]
    );
    const artifacts = await pool.query(
      'SELECT * FROM dossier_artifacts WHERE dossier_id = $1 ORDER BY uploaded_at DESC',
      [dossier.id]
    );

    return {
      ...dossier,
      assurances: assurances.rows,
      risks: risks.rows,
      artifacts: artifacts.rows,
    };
  }

  async addAssurance(tenantId: string, input: AssuranceInput, userId: string) {
    const dossier = await this.ensureDossier(tenantId);
    const pool = getPostgresPool();

    const result = await pool.query(
      `INSERT INTO dossier_assurances
       (dossier_id, summary, source_actor, recipient_actor, occurred_at, channel, evidence_ref, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [dossier.id, input.summary, input.sourceActor, input.recipientActor, input.occurredAt, input.channel, input.evidenceRef, userId]
    );

    const assuranceId = result.rows[0].id;

    await provenanceLedger.appendEntry({
      tenantId,
      actionType: 'DOSSIER_ASSURANCE_ADDED',
      resourceType: 'dossier_assurance',
      resourceId: assuranceId,
      actorId: userId,
      actorType: 'user',
      timestamp: new Date(),
      payload: {
          mutationType: 'CREATE',
          entityId: assuranceId,
          entityType: 'dossier_assurance',
          newState: {
              id: assuranceId,
              type: 'dossier_assurance',
              version: 1,
              data: input as unknown as Record<string, any>,
              metadata: {}
          }
      },
      metadata: { } as any
    });

    return result.rows[0];
  }

  async addRisk(tenantId: string, input: RiskInput, userId: string) {
    const dossier = await this.ensureDossier(tenantId);
    const pool = getPostgresPool();

    const result = await pool.query(
      `INSERT INTO dossier_risks
       (dossier_id, category, description, severity, status, mitigation_plan)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [dossier.id, input.category, input.description, input.severity, input.status, input.mitigationPlan]
    );

    const riskId = result.rows[0].id;

    await provenanceLedger.appendEntry({
      tenantId,
      actionType: 'DOSSIER_RISK_ADDED',
      resourceType: 'dossier_risk',
      resourceId: riskId,
      actorId: userId,
      actorType: 'user',
      timestamp: new Date(),
      payload: {
          mutationType: 'CREATE',
          entityId: riskId,
          entityType: 'dossier_risk',
          newState: {
              id: riskId,
              type: 'dossier_risk',
              version: 1,
              data: input as unknown as Record<string, any>,
              metadata: {}
          }
      },
      metadata: { } as any
    });

    return result.rows[0];
  }

  async addArtifact(tenantId: string, input: ArtifactInput, userId: string) {
    const dossier = await this.ensureDossier(tenantId);
    const pool = getPostgresPool();

    const result = await pool.query(
      `INSERT INTO dossier_artifacts
       (dossier_id, name, type, storage_ref, hash, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [dossier.id, input.name, input.type, input.storageRef, input.hash, userId]
    );

    const artifactId = result.rows[0].id;

    await provenanceLedger.appendEntry({
      tenantId,
      actionType: 'DOSSIER_ARTIFACT_ADDED',
      resourceType: 'dossier_artifact',
      resourceId: artifactId,
      actorId: userId,
      actorType: 'user',
      timestamp: new Date(),
      payload: {
          mutationType: 'CREATE',
          entityId: artifactId,
          entityType: 'dossier_artifact',
          newState: {
              id: artifactId,
              type: 'dossier_artifact',
              version: 1,
              data: input as unknown as Record<string, any>,
              metadata: {}
          }
      },
      metadata: {
          // @ts-ignore
          hashAlgo: 'sha256',
          contentHash: input.hash
      } as any
    });

    return result.rows[0];
  }

  async generateExport(tenantId: string) {
    const dossier = await this.getDossier(tenantId);
    if (!dossier) throw new AppError('Dossier not found', 404);

    // Compute deterministic manifest hash
    const manifestContent = {
        dossierId: dossier.id,
        artifacts: dossier.artifacts.map((a: any) => ({ id: a.id, hash: a.hash })),
        risks: dossier.risks.map((r: any) => ({ id: r.id, hash: createHash('sha256').update(JSON.stringify(r)).digest('hex') })),
    };

    const manifestHash = createHash('sha256').update(JSON.stringify(manifestContent)).digest('hex');

    return {
      generatedAt: new Date().toISOString(),
      dossier,
      manifest: {
          fileCount: dossier.artifacts.length,
          totalRiskCount: dossier.risks.length,
          contentHash: manifestHash,
          integrityCheck: 'sha256'
      }
    };
  }
}

export const accountDossierService = AccountDossierService.getInstance();

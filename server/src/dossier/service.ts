import { randomUUID as uuid, createHash } from 'crypto';
import { Pool } from 'pg';
import { provenanceLedger } from '../provenance/ledger.js';
import {
  CreateAssuranceInput,
  CreateRiskInput,
  CreateArtifactInput,
  DossierExport
} from './types.js';

export class AccountDossierService {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async ensureDossier(tenantId: string, accountId: string, actorId: string): Promise<string> {
    const id = uuid();
    // Idempotent insert: ON CONFLICT DO NOTHING
    // If conflict, we fetch the existing ID.
    const query = `
      INSERT INTO account_dossiers (id, tenant_id, account_id, status)
      VALUES ($1, $2, $3, 'active')
      ON CONFLICT (tenant_id, account_id) DO NOTHING
      RETURNING id
    `;
    const res = await this.db.query(query, [id, tenantId, accountId]);

    let dossierId = res.rows[0]?.id;

    if (!dossierId) {
      // Conflict occurred, fetch existing
      const fetchRes = await this.db.query(
        `SELECT id FROM account_dossiers WHERE tenant_id = $1 AND account_id = $2`,
        [tenantId, accountId]
      );
      if (fetchRes.rows.length === 0) {
        throw new Error('Dossier creation failed unexpectedly');
      }
      dossierId = fetchRes.rows[0].id;
    } else {
        // New dossier created, log provenance
        await provenanceLedger.appendEntry({
            tenantId,
            actorId,
            actorType: 'user',
            actionType: 'CREATE_DOSSIER',
            resourceType: 'AccountDossier',
            resourceId: dossierId,
            timestamp: new Date(),
            payload: {
                mutationType: 'CREATE',
                entityId: dossierId,
                entityType: 'AccountDossier',
                newState: {
                    id: dossierId,
                    type: 'AccountDossier',
                    version: 1,
                    data: { accountId },
                    metadata: {}
                }
            },
            metadata: {
                purpose: 'Customer Evidence Dossier Creation'
            }
        });
    }

    return dossierId;
  }

  async addAssurance(
    tenantId: string,
    dossierId: string,
    input: CreateAssuranceInput,
    actorId: string
  ): Promise<string> {
    const id = uuid();

    await this.db.query(
      `INSERT INTO dossier_assurances (
        id, dossier_id, tenant_id, type, content, source, start_date, end_date, created_by, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id, dossierId, tenantId, input.type, input.content, input.source,
        input.startDate || null, input.endDate || null, actorId, input.metadata || {}
      ]
    );

    await provenanceLedger.appendEntry({
        tenantId,
        actorId,
        actorType: 'user',
        actionType: 'ADD_ASSURANCE',
        resourceType: 'DossierAssurance',
        resourceId: id,
        timestamp: new Date(),
        payload: {
            mutationType: 'CREATE',
            entityId: id,
            entityType: 'DossierAssurance',
            newState: {
                id,
                type: 'DossierAssurance',
                version: 1,
                data: input,
                metadata: { dossierId }
            }
        },
        metadata: {
            purpose: `Add Assurance to Dossier ${dossierId}`
        }
    });

    return id;
  }

  async addRisk(
    tenantId: string,
    dossierId: string,
    input: CreateRiskInput,
    actorId: string
  ): Promise<string> {
    const id = uuid();

    await this.db.query(
        `INSERT INTO dossier_risks (
            id, dossier_id, tenant_id, category, description, severity, status, mitigation_plan, created_by, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
            id, dossierId, tenantId, input.category, input.description, input.severity,
            input.status, input.mitigationPlan || null, actorId, input.metadata || {}
        ]
    );

    await provenanceLedger.appendEntry({
        tenantId,
        actorId,
        actorType: 'user',
        actionType: 'ADD_RISK',
        resourceType: 'DossierRisk',
        resourceId: id,
        timestamp: new Date(),
        payload: {
            mutationType: 'CREATE',
            entityId: id,
            entityType: 'DossierRisk',
            newState: {
                id,
                type: 'DossierRisk',
                version: 1,
                data: input,
                metadata: { dossierId }
            }
        },
        metadata: {
             purpose: `Add Risk to Dossier ${dossierId}`
        }
    });

    return id;
  }

  async addArtifact(
    tenantId: string,
    dossierId: string,
    input: CreateArtifactInput,
    actorId: string
  ): Promise<string> {
    const id = uuid();

    await this.db.query(
        `INSERT INTO dossier_artifacts (
            id, dossier_id, tenant_id, type, name, uri, hash, source, created_by, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
            id, dossierId, tenantId, input.type, input.name, input.uri, input.hash,
            input.source || null, actorId, input.metadata || {}
        ]
    );

    await provenanceLedger.appendEntry({
        tenantId,
        actorId,
        actorType: 'user',
        actionType: 'ADD_ARTIFACT',
        resourceType: 'DossierArtifact',
        resourceId: id,
        timestamp: new Date(),
        payload: {
            mutationType: 'CREATE',
            entityId: id,
            entityType: 'DossierArtifact',
            newState: {
                id,
                type: 'DossierArtifact',
                version: 1,
                data: input,
                metadata: { dossierId }
            }
        },
        metadata: {
            purpose: `Add Artifact to Dossier ${dossierId}`
        }
    });

    return id;
  }

  async exportDossier(tenantId: string, accountId: string): Promise<DossierExport> {
      // 1. Get Dossier ID
      const dossierRes = await this.db.query(
          `SELECT id FROM account_dossiers WHERE tenant_id = $1 AND account_id = $2`,
          [tenantId, accountId]
      );
      if (dossierRes.rows.length === 0) {
          throw new Error('Dossier not found');
      }
      const dossierId = dossierRes.rows[0].id;

      // 2. Fetch components
      const assurances = await this.db.query(
          `SELECT * FROM dossier_assurances WHERE dossier_id = $1 ORDER BY created_at ASC`,
          [dossierId]
      );
      const risks = await this.db.query(
          `SELECT * FROM dossier_risks WHERE dossier_id = $1 ORDER BY created_at ASC`,
          [dossierId]
      );
      const artifacts = await this.db.query(
          `SELECT * FROM dossier_artifacts WHERE dossier_id = $1 ORDER BY created_at ASC`,
          [dossierId]
      );

      // 3. Construct Timeline (Merge and Sort)
      const timeline = [
          ...assurances.rows.map(r => ({ type: 'ASSURANCE', date: r.created_at, data: r })),
          ...risks.rows.map(r => ({ type: 'RISK', date: r.created_at, data: r })),
          ...artifacts.rows.map(r => ({ type: 'ARTIFACT', date: r.created_at, data: r })),
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // 4. Calculate Manifest Hash
      const exportData = {
          dossierId,
          accountId,
          generatedAt: new Date().toISOString(),
          assurances: assurances.rows,
          risks: risks.rows,
          artifacts: artifacts.rows,
          timeline
      };

      const manifestHash = createHash('sha256')
          .update(JSON.stringify(exportData))
          .digest('hex');

      return {
          ...exportData,
          manifestHash
      };
  }
}

import { getPostgresPool } from '../../db/postgres.js';
import {
  EnterprisePolicy,
  EnterprisePolicySchema,
  PolicyStatus,
  PolicyRecord,
  PolicyVersionRecord
} from './types.js';

// Simple diff function to compare policy versions
function diff(oldPolicy: unknown, newPolicy: unknown): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  const oldObj = oldPolicy as Record<string, unknown>;
  const newObj = newPolicy as Record<string, unknown>;

  for (const key in newObj) {
    if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
      changes[key] = { old: oldObj[key], new: newObj[key] };
    }
  }
  return changes;
}

export interface DbClient {
    query: (text: string, params?: any[]) => Promise<{ rows: any[] }>;
}

const getDefaultDb = (): DbClient => {
  const pool = getPostgresPool();
  return {
    query: (text: string, params?: any[]) => pool.query(text, params),
  };
};

export class PolicyLifecycleService {
  private static instance: PolicyLifecycleService;
  private db: DbClient;

  private constructor(dbClient: DbClient) {
      this.db = dbClient;
  }

  public static getInstance(dbClient?: DbClient): PolicyLifecycleService {
    const defaultDb = dbClient || getDefaultDb();
    if (!PolicyLifecycleService.instance) {
      PolicyLifecycleService.instance = new PolicyLifecycleService(defaultDb);
    }
    // Allow replacing db client for testing if instance already exists (simple approach)
    if (dbClient) {
        PolicyLifecycleService.instance.db = dbClient;
    }
    return PolicyLifecycleService.instance;
  }

  /**
   * Creates a new policy draft. If a policy already exists for the tenant,
   * creates a new version for that policy.
   */
  async createDraft(tenantId: string, userId: string, content: EnterprisePolicy): Promise<PolicyVersionRecord> {
    // Validate Schema
    const parseResult = EnterprisePolicySchema.safeParse(content);
    if (!parseResult.success) {
      throw new Error(`Invalid policy schema: ${parseResult.error.message}`);
    }

    // Check if policy exists for tenant
    let policyId: string;
    const policyRes = await this.db.query(
      `SELECT id FROM policies WHERE tenant_id = $1`,
      [tenantId]
    );

    if (policyRes.rows.length === 0) {
      // Create new policy container
      const newPolicy = await this.db.query(
        `INSERT INTO policies (tenant_id) VALUES ($1) RETURNING id`,
        [tenantId]
      );
      policyId = newPolicy.rows[0].id;
    } else {
      policyId = policyRes.rows[0].id;
    }

    // Determine next version number
    const verRes = await this.db.query(
      `SELECT MAX(version_number) as max_ver FROM policy_versions WHERE policy_id = $1`,
      [policyId]
    );
    const nextVersion = (verRes.rows[0].max_ver || 0) + 1;

    // Create Draft Version
    const draftRes = await this.db.query(
      `INSERT INTO policy_versions
       (policy_id, version_number, content, status, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [policyId, nextVersion, JSON.stringify(content), PolicyStatus.DRAFT, userId]
    );

    return draftRes.rows[0];
  }

  async updateDraft(versionId: string, content: EnterprisePolicy, userId: string): Promise<PolicyVersionRecord> {
     // Validate Schema
     const parseResult = EnterprisePolicySchema.safeParse(content);
     if (!parseResult.success) {
       throw new Error(`Invalid policy schema: ${parseResult.error.message}`);
     }

     const res = await this.db.query(
       `UPDATE policy_versions
        SET content = $1, updated_at = NOW()
        WHERE id = $2 AND status = $3 AND created_by = $4
        RETURNING *`,
        [JSON.stringify(content), versionId, PolicyStatus.DRAFT, userId]
     );

     if (res.rows.length === 0) {
       throw new Error('Draft not found or not editable by this user');
     }
     return res.rows[0];
  }

  async submitForReview(versionId: string, userId: string): Promise<PolicyVersionRecord> {
    const res = await this.db.query(
      `UPDATE policy_versions
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND status = $3
       RETURNING *`,
       [PolicyStatus.PENDING_REVIEW, versionId, PolicyStatus.DRAFT]
    );

    if (res.rows.length === 0) {
        throw new Error('Draft not found or invalid state transition');
    }
    return res.rows[0];
  }

  async approve(versionId: string, approverId: string, comment?: string): Promise<PolicyVersionRecord> {
    try {
        await this.db.query('BEGIN');

        // 1. Update status to ACTIVE
        const res = await this.db.query(
            `UPDATE policy_versions
            SET status = $1, approved_by = $2, review_comments = $3, updated_at = NOW()
            WHERE id = $4 AND status = $5
            RETURNING *`,
            [PolicyStatus.ACTIVE, approverId, comment, versionId, PolicyStatus.PENDING_REVIEW]
        );

        if (res.rows.length === 0) {
            throw new Error('Policy not found or not in review');
        }

        const policyId = res.rows[0].policy_id;

        // 2. Set as active version on the Policy container
        await this.db.query(
            `UPDATE policies SET active_version_id = $1, updated_at = NOW() WHERE id = $2`,
            [versionId, policyId]
        );

        // 3. Archive previous active versions
        await this.db.query(
            `UPDATE policy_versions
            SET status = $1
            WHERE policy_id = $2 AND id != $3 AND status = $4`,
            [PolicyStatus.ARCHIVED, policyId, versionId, PolicyStatus.ACTIVE]
        );

        await this.db.query('COMMIT');
        return res.rows[0];
    } catch (error: any) {
        await this.db.query('ROLLBACK');
        throw error;
    }
  }

  async getActivePolicy(tenantId: string): Promise<EnterprisePolicy | null> {
    const res = await this.db.query(
        `SELECT pv.content
         FROM policies p
         JOIN policy_versions pv ON p.active_version_id = pv.id
         WHERE p.tenant_id = $1`,
         [tenantId]
    );

    if (res.rows.length === 0) return null;
    return res.rows[0].content as EnterprisePolicy;
  }

  async getDiff(versionIdA: string, versionIdB: string): Promise<any> {
    const res = await this.db.query(
        `SELECT id, content FROM policy_versions WHERE id IN ($1, $2)`,
        [versionIdA, versionIdB]
    );

    const versionA = res.rows.find((r: any) => r.id === versionIdA)?.content;
    const versionB = res.rows.find((r: any) => r.id === versionIdB)?.content;

    if (!versionA || !versionB) throw new Error('Versions not found');

    return diff(versionA, versionB);
  }

  async getHistory(tenantId: string): Promise<PolicyVersionRecord[]> {
      const res = await this.db.query(
          `SELECT pv.*
           FROM policy_versions pv
           JOIN policies p ON pv.policy_id = p.id
           WHERE p.tenant_id = $1
           ORDER BY pv.version_number DESC`,
           [tenantId]
      );
      return res.rows;
  }
}

export const policyLifecycleService = PolicyLifecycleService.getInstance();

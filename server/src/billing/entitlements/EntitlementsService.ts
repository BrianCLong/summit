import { getPostgresPool } from '../../config/database.ts';
import logger from '../../utils/logger.ts';
import { Entitlement, EntitlementCheckResult } from './types.ts';
import { randomUUID } from 'crypto';
import { provenanceLedger } from '../../provenance/ledger.ts';

export interface EntitlementsInterface {
  canUse(feature: string, tenantId: string): Promise<boolean>;
  quotaRemaining(feature: string, tenantId: string): Promise<number>;
}

export class EntitlementsService implements EntitlementsInterface {
  private static instance: EntitlementsService;

  private constructor() { }

  public static getInstance(): EntitlementsService {
    if (!EntitlementsService.instance) {
      EntitlementsService.instance = new EntitlementsService();
    }
    return EntitlementsService.instance;
  }

  async canUse(feature: string, tenantId: string): Promise<boolean> {
    const pool = getPostgresPool();
    const result = await pool.read(
      `SELECT 1 FROM entitlements
       WHERE tenant_id = $1
       AND artifact_key = $2
       AND status = 'active'
       AND (end_date IS NULL OR end_date > NOW())
       LIMIT 1`,
      [tenantId, feature]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async quotaRemaining(feature: string, tenantId: string): Promise<number> {
    const pool = getPostgresPool();
    const result = await pool.read(
      `SELECT limits FROM entitlements
       WHERE tenant_id = $1
       AND artifact_key = $2
       AND status = 'active'
       AND (end_date IS NULL OR end_date > NOW())
       LIMIT 1`,
      [tenantId, feature]
    );

    if (result.rowCount === 0) return 0;

    const limits = result.rows[0].limits;
    // Assuming limits structure like { "daily_requests": 1000 }
    // Ideally we need to check current usage too.
    // For this MVP step, we just return the limit if defined, or Infinity.

    // If 'quota' key exists in limits
    if (limits && typeof limits.quota === 'number') {
      return limits.quota;
    }
    return Infinity;
  }

  async grantEntitlement(
    tenantId: string,
    artifactKey: string,
    source: string,
    sourceId: string | null,
    limits: Record<string, any> = {},
    actorId: string
  ): Promise<Entitlement> {
    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check for existing active entitlement
      const existing = await client.query(
        `SELECT * FROM entitlements
         WHERE tenant_id = $1 AND artifact_key = $2 AND status = 'active'`,
        [tenantId, artifactKey]
      );

      if (existing.rowCount && existing.rowCount > 0) {
        // Update existing? Or throw?
        // Let's update limits and end_date
        const id = existing.rows[0].id;
        const result = await client.query(
          `UPDATE entitlements SET limits = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
          [limits, id]
        );
        await client.query('COMMIT');
        return this.mapRow(result.rows[0]);
      }

      const id = randomUUID();
      const result = await client.query(
        `INSERT INTO entitlements (
          id, tenant_id, artifact_key, status, limits, source, source_id
        ) VALUES ($1, $2, $3, 'active', $4, $5, $6)
        RETURNING *`,
        [id, tenantId, artifactKey, limits, source, sourceId]
      );

      const entitlement = this.mapRow(result.rows[0]);

      // Provenance
      await provenanceLedger.appendEntry({
        tenantId,
        actionType: 'ENTITLEMENT_GRANTED',
        resourceType: 'Entitlement',
        resourceId: id,
        actorId: actorId,
        actorType: 'user',
        timestamp: new Date(),
        payload: {
          mutationType: 'CREATE',
          entityId: id,
          entityType: 'Entitlement',
          artifactKey,
          source,
          sourceId: sourceId ?? undefined
        },
        metadata: {
          tenantId,
          artifactKey,
          source,
          entitlementId: id
        }
      });

      await client.query('COMMIT');
      return entitlement;
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async revokeEntitlement(id: string, actorId: string): Promise<void> {
    const pool = getPostgresPool();
    await pool.write(
      `UPDATE entitlements SET status = 'expired', end_date = NOW(), updated_at = NOW() WHERE id = $1`,
      [id]
    );
    await provenanceLedger.appendEntry({
      tenantId: 'system',
      actionType: 'ENTITLEMENT_REVOKED',
      resourceType: 'Entitlement',
      resourceId: id,
      actorId: actorId,
      actorType: 'user',
      timestamp: new Date(),
      payload: {
        mutationType: 'UPDATE',
        entityId: id,
        entityType: 'Entitlement',
        actorRole: 'admin',
        action: 'revoke'
      },
      metadata: {
        entitlementId: id
      }
    });
  }

  async getEntitlements(tenantId: string): Promise<Entitlement[]> {
    const pool = getPostgresPool();
    const result = await pool.read(
      `SELECT * FROM entitlements WHERE tenant_id = $1`,
      [tenantId]
    );
    return result.rows.map(this.mapRow);
  }

  private mapRow(row: any): Entitlement {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      artifactKey: row.artifact_key,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      limits: row.limits,
      source: row.source,
      sourceId: row.source_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export const entitlementsService = EntitlementsService.getInstance();

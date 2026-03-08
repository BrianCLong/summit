import { getPostgresPool } from '../db/postgres.js';
import { TABLE_MAPPINGS, LIFECYCLE_POLICIES, getRetentionDays } from './policy.js';
import { DataCategory } from './types.js';
import baseLogger from '../config/logger.js';
import { LegalHoldManager } from './legal-hold.js';
import { LifecycleEvidence } from './evidence.js';

const logger = baseLogger.child({ name: 'retention-manager' });

export class RetentionManager {
  private static instance: RetentionManager;

  private constructor() {}

  public static getInstance(): RetentionManager {
    if (!RetentionManager.instance) {
      RetentionManager.instance = new RetentionManager();
    }
    return RetentionManager.instance;
  }

  /**
   * Scans for expired data across all known tables and deletes it.
   * Returns a summary of deleted records.
   */
  public async scanExpired(): Promise<Record<DataCategory, number>> {
    const results: Record<DataCategory, number> = {
      OPERATIONAL_METADATA: 0,
      ANALYTICS_ARTIFACTS: 0,
      PREDICTIVE_MODELS: 0,
      AUDIT_RECORDS: 0,
      TENANT_DATA: 0,
    };

    const pool = getPostgresPool();

    for (const mapping of TABLE_MAPPINGS) {
      const policy = LIFECYCLE_POLICIES[mapping.category];
      if (!policy) {
        logger.warn({ category: mapping.category }, 'No policy found for category');
        continue;
      }

      if (policy.retention === 'infinity') {
        continue;
      }

      const retentionDays = getRetentionDays(policy.retention);
      if (retentionDays <= 0) continue;

      // Calculate cutoff date
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - retentionDays);

      const tableName = mapping.schema ? `"${mapping.schema}"."${mapping.tableName}"` : `"${mapping.tableName}"`;

      // Check for Legal Holds
      let legalHoldClause = '';
      if (policy.legalHoldEligible && mapping.tenantColumn) {
        // Exclude data belonging to tenants under hold
        legalHoldClause = `AND ${mapping.tenantColumn} NOT IN (SELECT target_id FROM legal_holds WHERE status='active')`;
      }

      try {
        const query = `
          DELETE FROM ${tableName}
          WHERE ${mapping.timestampColumn} < $1
          ${legalHoldClause}
          RETURNING *
        `;

        const res = await pool.query(query, [cutoff]);
        const deletedCount = res.rowCount || 0;

        if (deletedCount > 0) {
          logger.info(
            { table: tableName, count: deletedCount, category: mapping.category },
            'Expired records deleted'
          );
          results[mapping.category] += deletedCount;

          // Log evidence
          await LifecycleEvidence.getInstance().recordEvent(
            'RETENTION_ENFORCED',
            'system',
            { category: mapping.category, count: deletedCount, table: tableName }
          );
        }
      } catch (err: any) {
        logger.error(
          { table: tableName, err },
          'Failed to clean up expired records'
        );
      }
    }

    return results;
  }
}

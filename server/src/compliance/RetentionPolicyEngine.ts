import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { getPostgresPool } from '../config/database.js';
import { RetentionPolicy } from './types.js';

export interface RetentionStrategy {
  shouldRetain(item: any, policy: RetentionPolicy): boolean;
}

export class TimeBasedRetentionStrategy implements RetentionStrategy {
  shouldRetain(item: { createdAt: Date }, policy: RetentionPolicy): boolean {
    const ageInMs = new Date().getTime() - new Date(item.createdAt).getTime();
    const ageInDays = ageInMs / (1000 * 60 * 60 * 24);
    return ageInDays <= policy.retentionDays;
  }
}

export class RetentionPolicyEngine {
  private static instance: RetentionPolicyEngine;
  private pool: Pool;
  private strategies: Map<string, RetentionStrategy>;

  private constructor() {
    this.pool = getPostgresPool();
    this.strategies = new Map();
    this.registerStrategy('TIME_BASED', new TimeBasedRetentionStrategy());
  }

  public static getInstance(): RetentionPolicyEngine {
    if (!RetentionPolicyEngine.instance) {
      RetentionPolicyEngine.instance = new RetentionPolicyEngine();
    }
    return RetentionPolicyEngine.instance;
  }

  public registerStrategy(name: string, strategy: RetentionStrategy) {
    this.strategies.set(name, strategy);
  }

  public async createPolicy(
    targetType: string,
    retentionDays: number,
    action: 'DELETE' | 'ARCHIVE'
  ): Promise<string> {
    const id = randomUUID();
    await this.pool.query(
      `INSERT INTO retention_policies (id, target_type, retention_days, action) VALUES ($1, $2, $3, $4)`,
      [id, targetType, retentionDays, action]
    );
    return id;
  }

  /**
   * Run retention checks.
   * Note: This assumes generic "target_type" maps to a table name or known entity.
   * For this implementation, we'll support 'provenance_ledger_v2' and 'audit_events' specifically.
   */
  public async enforcePolicies(): Promise<void> {
    const policies = await this.pool.query(`SELECT * FROM retention_policies WHERE is_active = TRUE`);

    for (const row of policies.rows) {
      const policy: RetentionPolicy = {
        id: row.id,
        targetType: row.target_type,
        retentionDays: row.retention_days,
        action: row.action,
        isActive: row.is_active
      };

      await this.applyPolicy(policy);
    }
  }

  public async getRetentionRules(tenantId: string, type: 'all' | 'user'): Promise<RetentionPolicy[]> {
    // For MVP, we ignore tenantId filtering for global policies, but could add it.
    const policies = await this.pool.query(`SELECT * FROM retention_policies WHERE is_active = TRUE`);

    return policies.rows.map((row: any) => ({
      id: row.id,
      targetType: row.target_type,
      retentionDays: row.retention_days,
      action: row.action,
      isActive: row.is_active
    }));
  }

  private async applyPolicy(policy: RetentionPolicy): Promise<void> {
    console.log(`Applying retention policy for ${policy.targetType}: ${policy.action} older than ${policy.retentionDays} days`);

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    let tableName = '';
    let dateColumn = 'created_at'; // Default

    if (policy.targetType === 'audit_logs') {
      // Assuming audit logs are in a table or managed by WORM service.
      // If managed by WORM, we might need to call WORM service.
      // For this MVP, we assume a hypothetical table or skip if not directly accessible via SQL.
      console.warn('Audit log retention requiring WORM storage interface - skipping SQL delete');
      return;
    } else if (policy.targetType === 'audit_events') {
      tableName = 'audit_events';
      dateColumn = 'timestamp';
    } else if (policy.targetType === 'provenance_entries') {
      tableName = 'provenance_ledger_v2';
      dateColumn = 'timestamp';
    } else {
      console.warn(`Unknown target type for retention: ${policy.targetType}`);
      return;
    }

    if (tableName) {
      if (tableName) {
        if (policy.action === 'DELETE') {
          const res = await this.pool.query(
            `DELETE FROM ${tableName} WHERE ${dateColumn} < $1`,
            [cutoffDate],
          );
          console.log(`Deleted ${res.rowCount} rows from ${tableName}`);
        } else if (policy.action === 'ARCHIVE') {
          // Implement archive logic (e.g. move to cold storage table or export to S3)
          console.log(`Archiving not yet implemented for ${tableName}`);
        }
      }
    }
  }
}

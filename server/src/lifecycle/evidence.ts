import { getPostgresPool } from '../db/postgres.js';
import baseLogger from '../config/logger.js';

const logger = baseLogger.child({ name: 'lifecycle-evidence' });

export type EvidenceType = 'RETENTION_ENFORCED' | 'DELETION_COMPLETED' | 'LEGAL_HOLD_APPLIED' | 'LEGAL_HOLD_RELEASED';

export class LifecycleEvidence {
  private static instance: LifecycleEvidence;

  private constructor() {}

  public static getInstance(): LifecycleEvidence {
    if (!LifecycleEvidence.instance) {
      LifecycleEvidence.instance = new LifecycleEvidence();
    }
    return LifecycleEvidence.instance;
  }

  public async recordEvent(
    type: EvidenceType,
    targetId: string,
    details: Record<string, any>,
    tenantId?: string
  ): Promise<void> {
    const pool = getPostgresPool();

    try {
      await pool.query(
        `INSERT INTO provenance_records (
          id,
          action_type,
          target_id,
          tenant_id,
          details,
          created_at,
          actor_id
        ) VALUES (
          gen_random_uuid(),
          $1,
          $2,
          $3,
          $4,
          NOW(),
          'system:lifecycle'
        )`,
        [type, targetId, tenantId || 'system', details]
      );

      logger.info({ type, targetId }, 'Lifecycle evidence recorded');
    } catch (error: any) {
      // If table missing, fallback to logging
      if (error.code === '42P01') {
        logger.warn({ type, targetId, details }, 'provenance_records table missing, evidence logged to stdout only');
      } else {
        logger.error({ err: error }, 'Failed to record lifecycle evidence');
      }
    }
  }
}

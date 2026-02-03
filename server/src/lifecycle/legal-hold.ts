import { getPostgresPool } from '../db/postgres.js';
import baseLogger from '../config/logger.js';
import { LifecycleEvidence } from './evidence.js';

const logger = baseLogger.child({ name: 'legal-hold-manager' });

export class LegalHoldManager {
  private static instance: LegalHoldManager;

  private constructor() {}

  public static getInstance(): LegalHoldManager {
    if (!LegalHoldManager.instance) {
      LegalHoldManager.instance = new LegalHoldManager();
    }
    return LegalHoldManager.instance;
  }

  /**
   * Checks if a tenant or user is under active legal hold.
   */
  public async isUnderHold(targetId: string): Promise<boolean> {
    const pool = getPostgresPool();

    try {
      const query = `
        SELECT 1 FROM legal_holds
        WHERE target_id = $1
        AND status = 'active'
        LIMIT 1
      `;
      const res = await pool.query(query, [targetId]);
      return (res.rowCount || 0) > 0;
    } catch (error: any) {
      // If table doesn't exist, log warning and return false
      if (error.code === '42P01') {
        logger.warn('legal_holds table does not exist. Assuming no holds.');
        return false;
      }
      logger.error({ err: error }, 'Failed to check legal hold status');
      // Fail safe: bias towards preservation in case of error
      return true;
    }
  }

  public async createHold(targetId: string, reason: string, createdBy: string): Promise<void> {
    const pool = getPostgresPool();
    // Ensure table exists (idempotent)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS legal_holds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        target_id VARCHAR(255) NOT NULL,
        reason TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        created_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        released_at TIMESTAMP WITH TIME ZONE
      );
      CREATE INDEX IF NOT EXISTS idx_legal_holds_target ON legal_holds(target_id);
    `);

    await pool.query(
      `INSERT INTO legal_holds (target_id, reason, created_by) VALUES ($1, $2, $3)`,
      [targetId, reason, createdBy]
    );
    logger.info({ targetId, reason }, 'Legal hold created');

    await LifecycleEvidence.getInstance().recordEvent(
      'LEGAL_HOLD_APPLIED',
      targetId,
      { reason, createdBy }
    );
  }

  public async releaseHold(targetId: string, releasedBy: string): Promise<void> {
    const pool = getPostgresPool();
    await pool.query(
      `UPDATE legal_holds SET status = 'released', released_at = NOW() WHERE target_id = $1 AND status = 'active'`,
      [targetId]
    );
    logger.info({ targetId }, 'Legal hold released');

    await LifecycleEvidence.getInstance().recordEvent(
      'LEGAL_HOLD_RELEASED',
      targetId,
      { releasedBy }
    );
  }
}

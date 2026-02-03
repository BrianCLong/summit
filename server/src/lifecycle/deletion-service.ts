import { getPostgresPool } from '../db/postgres.js';
import baseLogger from '../config/logger.js';
import { LegalHoldManager } from './legal-hold.js';
import { LifecycleEvidence } from './evidence.js';

const logger = baseLogger.child({ name: 'deletion-service' });

export class DeletionService {
  private static instance: DeletionService;

  private constructor() {}

  public static getInstance(): DeletionService {
    if (!DeletionService.instance) {
      DeletionService.instance = new DeletionService();
    }
    return DeletionService.instance;
  }

  /**
   * Hard deletes a tenant and all associated data.
   * This is a destructive operation and should be used with caution.
   *
   * @param tenantId The ID of the tenant to delete.
   */
  public async hardDeleteTenant(tenantId: string): Promise<void> {
    logger.info({ tenantId }, 'Starting hard deletion of tenant');
    const pool = getPostgresPool();

    // Tables to clean up, in order of dependency (leafs first)
    const tables = [
      'maestro.audit_access_logs',
      'audit_logs',
      'provenance_records',
      'user_sessions',
      'runs',
      'analysis_results',
      'search_analytics',
      'risk_scores',
      'masint_signals',
      'maestro.case_state_history',
      'maestro.cases',
      'investigations',
      'users',
      'tenants'
    ];

    await pool.withTransaction(async (client: any) => {
      // Check legal hold
      const isHeld = await LegalHoldManager.getInstance().isUnderHold(tenantId);
      if (isHeld) {
        const msg = `Tenant ${tenantId} is under active legal hold. Deletion aborted.`;
        logger.warn({ tenantId }, msg);
        throw new Error(msg);
      }

      for (const table of tables) {
        // Handle schema prefix if present
        const tableName = table.includes('.') ? table : `public.${table}`;
        const [schema, name] = tableName.split('.');

        try {
          const query = `DELETE FROM "${schema}"."${name}" WHERE tenant_id = $1`;
          await client.query(query, [tenantId]);
          logger.debug({ table: tableName, tenantId }, 'Deleted records for tenant');
        } catch (error: any) {
          // Ignore if table doesn't exist or column doesn't exist
          if (error.code === '42P01' || error.code === '42703') {
            logger.warn({ table: tableName, error: error.message }, 'Skipping table during tenant deletion');
          } else {
            throw error;
          }
        }
      }

      // Log the final deletion event
      logger.info({ tenantId }, 'Tenant hard deletion completed');

      await LifecycleEvidence.getInstance().recordEvent(
        'DELETION_COMPLETED',
        tenantId,
        { type: 'tenant_hard_delete' },
        tenantId
      );
    });
  }

  /**
   * Deletes a user and their PII.
   */
  public async deleteUser(userId: string, tenantId: string): Promise<void> {
    logger.info({ userId, tenantId }, 'Starting user deletion');
    const pool = getPostgresPool();

    await pool.withTransaction(async (client: any) => {
      // Delete sessions
      await client.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);

      // Anonymize or delete from users table
      await client.query('DELETE FROM users WHERE id = $1 AND tenant_id = $2', [userId, tenantId]);

      logger.info({ userId, tenantId }, 'User deleted');
    });
  }
}

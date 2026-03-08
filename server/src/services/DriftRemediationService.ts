
import { logger } from '../config/logger.js';
import { getPostgresPool } from '../db/postgres.js';
import { tenantRouter } from '../db/tenantRouter.js';

/**
 * Service for Auto-Remediation of Configuration Drift (Task #104).
 * Ensures that live routing and residency configs match the desired state.
 */
export class DriftRemediationService {
  private static instance: DriftRemediationService;
  private intervalId: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): DriftRemediationService {
    if (!DriftRemediationService.instance) {
      DriftRemediationService.instance = new DriftRemediationService();
    }
    return DriftRemediationService.instance;
  }

  public start(): void {
    if (this.intervalId) return;
    logger.info('DriftRemediationService: Starting drift correction loop');
    this.intervalId = setInterval(() => this.remediateDrift(), 300000); // Every 5 minutes
  }

  /**
   * Performs drift detection and remediation.
   */
  public async remediateDrift(): Promise<void> {
    logger.info('DriftRemediation: Checking for configuration drift...');
    const pool = getPostgresPool();

    try {
      // 1. Audit tenant_partitions against tenant_partition_map
      // Ensure every mapping points to a valid partition
      const orphanedMappings = await pool.query(`
        SELECT m.tenant_id, m.partition_key 
        FROM tenant_partition_map m
        LEFT JOIN tenant_partitions p ON m.partition_key = p.partition_key
        WHERE p.partition_key IS NULL
      `);

      if (orphanedMappings.rows.length > 0) {
        logger.warn({ count: orphanedMappings.rows.length }, 'DriftRemediation: Found orphaned tenant mappings');
        
        for (const mapping of orphanedMappings.rows) {
          logger.info({ tenantId: mapping.tenant_id }, 'DriftRemediation: Resetting orphaned mapping to primary');
          await pool.query(
            "UPDATE tenant_partition_map SET partition_key = 'primary', updated_at = NOW() WHERE tenant_id = $1",
            [mapping.tenant_id]
          );
        }
        await tenantRouter.refresh();
      }

      // 2. Audit residency configs for missing defaults
      // (Simplified example: ensure every tenant has a residency config)
      const missingConfigs = await pool.query(`
        SELECT t.id 
        FROM tenants t
        LEFT JOIN data_residency_configs c ON t.id = c.tenant_id
        WHERE c.tenant_id IS NULL AND t.is_active = true
      `);

      if (missingConfigs.rows.length > 0) {
        logger.warn({ count: missingConfigs.rows.length }, 'DriftRemediation: Missing data residency configs');
        
        for (const tenant of missingConfigs.rows) {
          logger.info({ tenantId: tenant.id }, 'DriftRemediation: Creating default residency config');
          await pool.query(`
            INSERT INTO data_residency_configs (id, tenant_id, region, country, jurisdiction, created_at)
            VALUES ($1, $2, 'us-east-1', 'US', 'US', NOW())
          `, [`residency-${tenant.id}-auto`, tenant.id]);
        }
      }

      logger.info('DriftRemediation: Sync complete');
    } catch (err: any) {
      logger.error({ err }, 'DriftRemediation: Error during drift correction');
    }
  }
}

export const driftRemediationService = DriftRemediationService.getInstance();

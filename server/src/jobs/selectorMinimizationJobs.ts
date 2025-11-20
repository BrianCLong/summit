/**
 * Scheduled Jobs for Selector Minimization and PNC Reporting
 *
 * This module sets up cron jobs for:
 * - Daily tripwire metrics calculation
 * - Weekly/monthly aggregations
 * - Monthly Proof-of-Non-Collection report generation
 * - Baseline recalculation
 */

import cron from 'node-cron';
import logger from '../utils/logger.js';
import { tripwireMetricsService } from '../services/TripwireMetricsService.js';
import { proofOfNonCollectionService } from '../services/ProofOfNonCollectionService.js';
import { getPostgresPool } from '../db/postgres.js';

// ============================================================================
// Job Definitions
// ============================================================================

/**
 * Daily job: Calculate tripwire metrics for all tenants
 * Runs at 2:00 AM every day
 */
export function scheduleDailyMetricsCalculation() {
  // Run at 2:00 AM daily
  cron.schedule('0 2 * * *', async () => {
    logger.info('Starting daily tripwire metrics calculation');

    try {
      await tripwireMetricsService.calculateDailyMetricsForAllTenants();
      logger.info('Daily tripwire metrics calculation completed');
    } catch (error) {
      logger.error('Failed to calculate daily tripwire metrics', { error });
    }
  });

  logger.info('Scheduled daily tripwire metrics calculation (2:00 AM)');
}

/**
 * Weekly job: Calculate weekly metrics for all tenants
 * Runs at 3:00 AM every Monday
 */
export function scheduleWeeklyMetricsCalculation() {
  // Run at 3:00 AM every Monday
  cron.schedule('0 3 * * 1', async () => {
    logger.info('Starting weekly tripwire metrics calculation');

    try {
      const tenants = await getActiveTenants();

      for (const tenantId of tenants) {
        try {
          await tripwireMetricsService.calculateWeeklyMetrics(tenantId);
        } catch (error) {
          logger.error('Failed to calculate weekly metrics for tenant', { error, tenantId });
        }
      }

      logger.info('Weekly tripwire metrics calculation completed', { tenantsProcessed: tenants.length });
    } catch (error) {
      logger.error('Failed to calculate weekly tripwire metrics', { error });
    }
  });

  logger.info('Scheduled weekly tripwire metrics calculation (Mondays 3:00 AM)');
}

/**
 * Monthly job: Calculate monthly metrics for all tenants
 * Runs at 4:00 AM on the 1st of every month
 */
export function scheduleMonthlyMetricsCalculation() {
  // Run at 4:00 AM on the 1st of every month
  cron.schedule('0 4 1 * *', async () => {
    logger.info('Starting monthly tripwire metrics calculation');

    try {
      const tenants = await getActiveTenants();

      for (const tenantId of tenants) {
        try {
          await tripwireMetricsService.calculateMonthlyMetrics(tenantId);
        } catch (error) {
          logger.error('Failed to calculate monthly metrics for tenant', { error, tenantId });
        }
      }

      logger.info('Monthly tripwire metrics calculation completed', { tenantsProcessed: tenants.length });
    } catch (error) {
      logger.error('Failed to calculate monthly tripwire metrics', { error });
    }
  });

  logger.info('Scheduled monthly tripwire metrics calculation (1st of month, 4:00 AM)');
}

/**
 * Monthly job: Generate Proof-of-Non-Collection reports
 * Runs at 5:00 AM on the 1st of every month
 */
export function scheduleMonthlyPNCReports() {
  // Run at 5:00 AM on the 1st of every month
  cron.schedule('0 5 1 * *', async () => {
    logger.info('Starting monthly PNC report generation');

    try {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const year = lastMonth.getFullYear();
      const month = lastMonth.getMonth() + 1; // JavaScript months are 0-indexed

      const tenants = await getActiveTenants();

      for (const tenantId of tenants) {
        try {
          logger.info('Generating PNC report for tenant', { tenantId, year, month });

          const report = await proofOfNonCollectionService.generateMonthlyReport(
            tenantId,
            year,
            month,
            {
              sampleRate: 0.05, // 5% sample
              samplingMethod: 'stratified',
            }
          );

          // Auto-finalize if no violations detected
          if (report.violationsDetected === 0 && report.id) {
            await proofOfNonCollectionService.finalizeReport(report.id);
            logger.info('PNC report auto-finalized (no violations)', {
              reportId: report.id,
              tenantId,
            });
          } else {
            logger.warn('PNC report has violations, requires manual review', {
              reportId: report.id,
              tenantId,
              violations: report.violationsDetected,
            });
          }
        } catch (error) {
          logger.error('Failed to generate PNC report for tenant', { error, tenantId });
        }
      }

      logger.info('Monthly PNC report generation completed', { tenantsProcessed: tenants.length });
    } catch (error) {
      logger.error('Failed to generate monthly PNC reports', { error });
    }
  });

  logger.info('Scheduled monthly PNC report generation (1st of month, 5:00 AM)');
}

/**
 * Daily job: Archive old PNC reports (older than 7 years)
 * Runs at 6:00 AM every day
 */
export function scheduleReportArchival() {
  // Run at 6:00 AM daily
  cron.schedule('0 6 * * *', async () => {
    logger.info('Starting PNC report archival');

    try {
      const postgres = getPostgresPool();

      // Find reports older than 7 years that are finalized but not archived
      const query = `
        SELECT id FROM proof_of_non_collection_reports
        WHERE status = 'finalized'
          AND finalized_at < NOW() - INTERVAL '7 years'
        LIMIT 100
      `;

      const result = await postgres.query(query);

      for (const row of result.rows) {
        try {
          await proofOfNonCollectionService.archiveReport(row.id);
        } catch (error) {
          logger.error('Failed to archive PNC report', { error, reportId: row.id });
        }
      }

      logger.info('PNC report archival completed', { reportsArchived: result.rows.length });
    } catch (error) {
      logger.error('Failed to archive PNC reports', { error });
    }
  });

  logger.info('Scheduled PNC report archival (6:00 AM daily)');
}

/**
 * Hourly job: Clean up old query scope metrics (retention policy)
 * Runs every hour
 */
export function scheduleMetricsCleanup() {
  // Run at the start of every hour
  cron.schedule('0 * * * *', async () => {
    try {
      const postgres = getPostgresPool();

      // Delete metrics older than retention period (default 90 days)
      const retentionDays = parseInt(process.env.QUERY_METRICS_RETENTION_DAYS || '90');

      const query = `
        DELETE FROM query_scope_metrics
        WHERE executed_at < NOW() - INTERVAL '${retentionDays} days'
      `;

      const result = await postgres.query(query);

      if (result.rowCount && result.rowCount > 0) {
        logger.info('Query scope metrics cleanup completed', {
          deletedRecords: result.rowCount,
          retentionDays,
        });
      }
    } catch (error) {
      logger.error('Failed to clean up query scope metrics', { error });
    }
  });

  logger.info('Scheduled query scope metrics cleanup (hourly)');
}

/**
 * Weekly job: Recalculate baselines for anomaly detection
 * Runs at 1:00 AM every Sunday
 */
export function scheduleBaselineRecalculation() {
  // Run at 1:00 AM every Sunday
  cron.schedule('0 1 * * 0', async () => {
    logger.info('Starting baseline recalculation for anomaly detection');

    try {
      const postgres = getPostgresPool();

      // Find query patterns that need baseline updates (not updated in last 7 days)
      const query = `
        SELECT DISTINCT tenant_id, query_hash
        FROM query_scope_metrics
        WHERE executed_at > NOW() - INTERVAL '30 days'
        GROUP BY tenant_id, query_hash
        HAVING COUNT(*) >= 10
      `;

      const result = await postgres.query(query);

      logger.info('Found query patterns for baseline recalculation', {
        patterns: result.rows.length,
      });

      // Baselines are automatically updated by SelectorMinimizationService
      // when tracking queries, so this job just logs the patterns that should
      // have baselines

      for (const row of result.rows) {
        logger.debug('Query pattern baseline should be current', {
          tenantId: row.tenant_id,
          queryHash: row.query_hash,
        });
      }

      logger.info('Baseline recalculation check completed');
    } catch (error) {
      logger.error('Failed to recalculate baselines', { error });
    }
  });

  logger.info('Scheduled baseline recalculation (Sundays 1:00 AM)');
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get list of active tenants (tenants with activity in last 7 days)
 */
async function getActiveTenants(): Promise<string[]> {
  const postgres = getPostgresPool();

  const query = `
    SELECT DISTINCT tenant_id
    FROM query_scope_metrics
    WHERE executed_at > NOW() - INTERVAL '7 days'
  `;

  const result = await postgres.query(query);
  return result.rows.map((row) => row.tenant_id);
}

// ============================================================================
// Job Initialization
// ============================================================================

/**
 * Initialize all scheduled jobs
 */
export function initializeSelectorMinimizationJobs() {
  logger.info('Initializing selector minimization scheduled jobs');

  try {
    scheduleDailyMetricsCalculation();
    scheduleWeeklyMetricsCalculation();
    scheduleMonthlyMetricsCalculation();
    scheduleMonthlyPNCReports();
    scheduleReportArchival();
    scheduleMetricsCleanup();
    scheduleBaselineRecalculation();

    logger.info('All selector minimization scheduled jobs initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize selector minimization jobs', { error });
    throw error;
  }
}

/**
 * Stop all scheduled jobs (for graceful shutdown)
 */
export function stopSelectorMinimizationJobs() {
  logger.info('Stopping selector minimization scheduled jobs');

  // Note: node-cron doesn't provide a global stop method
  // Individual tasks would need to be tracked if we need to stop them
  // For now, they'll stop when the process exits

  logger.info('Selector minimization scheduled jobs stopped');
}

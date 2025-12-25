import { CronJob } from 'cron';
import logger from '../config/logger.js';
import { billingService } from './BillingService.js';
import { getPostgresPool } from '../config/database.js';

export class BillingJobService {
  private job: CronJob | null = null;
  private isProcessing = false;

  constructor() {
    // Schedule for 00:01 AM on the 1st of every month
    this.job = new CronJob('0 1 1 * *', async () => {
      logger.info('Starting monthly billing close...');
      await this.processBillingClose();
    });
  }

  start() {
    if (this.job) {
        this.job.start();
        logger.info('BillingJobService started');
    }
  }

  stop() {
    if (this.job) {
        this.job.stop();
        logger.info('BillingJobService stopped');
    }
  }

  async processBillingClose() {
    if (this.isProcessing) {
        logger.warn('Billing close already in progress, skipping overlap');
        return;
    }
    this.isProcessing = true;

    // TODO: In a clustered environment, use pg-boss or redis-lock to ensure single execution.
    // For now, we rely on single-replica deployment or manually triggered jobs via admin API.

    const pool = getPostgresPool();
    try {
        const client = await pool.connect();
        try {
            const res = await client.query('SELECT tenant_id FROM tenant_plans');
            const tenantIds = res.rows.map(r => r.tenant_id);

            for (const tenantId of tenantIds) {
                try {
                    logger.info({ tenantId }, 'Processing billing for tenant');
                    await billingService.generateAndExportReport(tenantId);
                } catch (err) {
                    logger.error({ err, tenantId }, 'Failed to process billing for tenant');
                }
            }
        } finally {
            client.release();
        }
    } catch (err) {
        logger.error({ err }, 'Failed to list tenants for billing close');
    } finally {
        this.isProcessing = false;
    }
  }
}

export const billingJobService = new BillingJobService();

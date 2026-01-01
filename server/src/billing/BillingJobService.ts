import { CronJob } from 'cron';
import logger from '../config/logger.js';
import { billingService } from './BillingService.js';
import { getPostgresPool } from '../config/database.js';

type BillingClient = {
  query: (...args: any[]) => Promise<any>;
  release: () => void;
};

export class BillingJobService {
  private job: CronJob | null = null;
  private isProcessing = false;
  private readonly lockKey = 8_522_441; // Arbitrary constant to coordinate advisory locks

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

    const pool = getPostgresPool();
    let client: BillingClient | null = null;
    let lockAcquired = false;
    try {
      client = await pool.connect();

      if (!client) {
        throw new Error('Unable to acquire billing database client');
      }

      const { rows } = await client.query(
        'SELECT pg_try_advisory_lock($1) as acquired',
        [this.lockKey],
      );

      lockAcquired = Boolean(rows[0]?.acquired);
      if (!lockAcquired) {
        logger.warn(
          'Billing close already owned by another worker; skipping this run',
        );
        return;
      }

      const res = await client.query('SELECT tenant_id FROM tenant_plans');
      const tenantIds = res.rows.map((r: { tenant_id: string }) => r.tenant_id);

      for (const tenantId of tenantIds) {
        try {
          logger.info({ tenantId }, 'Processing billing for tenant');
          await billingService.generateAndExportReport(tenantId);
        } catch (err) {
          logger.error({ err, tenantId }, 'Failed to process billing for tenant');
        }
      }
    } catch (err) {
      logger.error({ err }, 'Failed to list tenants for billing close');
    } finally {
      if (client) {
        if (lockAcquired) {
          try {
            await client.query('SELECT pg_advisory_unlock($1)', [this.lockKey]);
          } catch (unlockErr) {
            logger.error(
              { unlockErr },
              'Failed to release billing close advisory lock',
            );
          }
        }
        client.release();
      }
      this.isProcessing = false;
    }
  }
}

export const billingJobService = new BillingJobService();

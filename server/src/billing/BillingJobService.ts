import { CronJob } from 'cron';
import baseLogger from '../config/logger.js';
import { billingService } from './BillingService.js';
import { getPostgresPool } from '../config/database.js';

type BillingJobDependencies = {
  pool?: ReturnType<typeof getPostgresPool>;
  logger?: typeof baseLogger;
  billing?: typeof billingService;
  enableSchedule?: boolean;
};

type PostgresClient = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
  release: () => void;
};

export class BillingJobService {
  private job: CronJob | null = null;
  private isProcessing = false;
  private static readonly BILLING_CLOSE_LOCK_KEY = 42_101_337;
  private static readonly DEFAULT_LOCK_TIMEOUT_MS = 10_000;
  private static readonly LOCK_RETRY_DELAY_MS = 200;
  private readonly pool: ReturnType<typeof getPostgresPool>;
  private readonly logger: typeof baseLogger;
  private readonly billing: typeof billingService;
  private readonly enableSchedule: boolean;

  constructor({ pool, logger, billing, enableSchedule = true }: BillingJobDependencies = {}) {
    this.pool = pool ?? getPostgresPool();
    this.logger = logger ?? baseLogger;
    this.billing = billing ?? billingService;
    this.enableSchedule = enableSchedule;

    if (this.enableSchedule) {
      // Schedule for 00:01 AM on the 1st of every month
      this.job = new CronJob('0 1 1 * *', async () => {
        this.logger.info('Starting monthly billing close...');
        await this.processBillingClose();
      });
    }
  }

  start() {
    if (this.job) {
      this.job.start();
      this.logger.info('BillingJobService started');
    }
  }

  stop() {
    if (this.job) {
      this.job.stop();
      this.logger.info('BillingJobService stopped');
    }
  }

  async processBillingClose(options: { dryRun?: boolean; lockTimeoutMs?: number } = {}) {
    if (this.isProcessing) {
      this.logger.warn('Billing close already in progress, skipping overlap');
      return;
    }
    this.isProcessing = true;

    const lockTimeoutMs = options.lockTimeoutMs ?? BillingJobService.DEFAULT_LOCK_TIMEOUT_MS;
    const dryRun = options.dryRun ?? false;
    let client: PostgresClient | null = null;
    let lockAcquired = false;

    try {
      client = await this.pool.connect();
      if (!client) {
        throw new Error('Failed to acquire PostgreSQL client for billing close');
      }
      const activeClient: PostgresClient = client;
      lockAcquired = await this.acquireDistributedLock(activeClient, lockTimeoutMs);
      if (!lockAcquired) {
        this.logger.warn({ lockTimeoutMs }, 'Billing close lock not acquired within timeout; skipping run');
        return;
      }

      const res = await activeClient.query('SELECT tenant_id FROM tenant_plans');
      const rows = res.rows as Array<{ tenant_id: string }>;
      const tenantIds = rows.map((r) => r.tenant_id);

      for (const tenantId of tenantIds) {
        try {
          this.logger.info({ tenantId, dryRun }, 'Processing billing for tenant');
          if (dryRun) {
            continue;
          }
          await this.billing.generateAndExportReport(tenantId);
        } catch (err: unknown) {
          this.logger.error({ err, tenantId }, 'Failed to process billing for tenant');
        }
      }
    } catch (err: unknown) {
      this.logger.error({ err }, 'Failed to list tenants for billing close');
    } finally {
      if (lockAcquired && client) {
        await this.releaseDistributedLock(client);
      }
      if (client) {
        client.release();
      }
      this.isProcessing = false;
    }
  }

  private async acquireDistributedLock(client: PostgresClient, timeoutMs: number): Promise<boolean> {
    const endAt = Date.now() + timeoutMs;
    while (Date.now() < endAt) {
      const result = await client.query('SELECT pg_try_advisory_lock($1) AS acquired', [
        BillingJobService.BILLING_CLOSE_LOCK_KEY,
      ]);
      const acquired = (result.rows as Array<{ acquired?: boolean }>)[0]?.acquired;
      if (acquired) {
        this.logger.info('Billing close lock acquired via pg_try_advisory_lock');
        return true;
      }

      await this.delay(BillingJobService.LOCK_RETRY_DELAY_MS);
    }

    return false;
  }

  private async releaseDistributedLock(client: PostgresClient) {
    try {
      await client.query('SELECT pg_advisory_unlock($1) AS released', [
        BillingJobService.BILLING_CLOSE_LOCK_KEY,
      ]);
      this.logger.info('Billing close lock released');
    } catch (err: unknown) {
      this.logger.error({ err }, 'Failed to release billing close advisory lock');
    }
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const billingJobService = new BillingJobService();

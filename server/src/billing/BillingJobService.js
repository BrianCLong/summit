"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingJobService = exports.BillingJobService = void 0;
const cron_1 = require("cron");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const BillingService_js_1 = require("./BillingService.js");
const database_js_1 = require("../config/database.js");
class BillingJobService {
    job = null;
    isProcessing = false;
    static BILLING_CLOSE_LOCK_KEY = 42_101_337;
    static DEFAULT_LOCK_TIMEOUT_MS = 10_000;
    static LOCK_RETRY_DELAY_MS = 200;
    pool;
    logger;
    billing;
    enableSchedule;
    constructor({ pool, logger, billing, enableSchedule = true } = {}) {
        this.pool = pool ?? (0, database_js_1.getPostgresPool)();
        this.logger = logger ?? logger_js_1.default;
        this.billing = billing ?? BillingService_js_1.billingService;
        this.enableSchedule = enableSchedule;
        if (this.enableSchedule) {
            // Schedule for 00:01 AM on the 1st of every month
            this.job = new cron_1.CronJob('0 1 1 * *', async () => {
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
    async processBillingClose(options = {}) {
        if (this.isProcessing) {
            this.logger.warn('Billing close already in progress, skipping overlap');
            return;
        }
        this.isProcessing = true;
        const lockTimeoutMs = options.lockTimeoutMs ?? BillingJobService.DEFAULT_LOCK_TIMEOUT_MS;
        const dryRun = options.dryRun ?? false;
        let client = null;
        let lockAcquired = false;
        try {
            client = await this.pool.connect();
            if (!client) {
                throw new Error('Failed to acquire PostgreSQL client for billing close');
            }
            const activeClient = client;
            lockAcquired = await this.acquireDistributedLock(activeClient, lockTimeoutMs);
            if (!lockAcquired) {
                this.logger.warn({ lockTimeoutMs }, 'Billing close lock not acquired within timeout; skipping run');
                return;
            }
            const res = await activeClient.query('SELECT tenant_id FROM tenant_plans');
            const tenantIds = res.rows.map((r) => r.tenant_id);
            for (const tenantId of tenantIds) {
                try {
                    this.logger.info({ tenantId, dryRun }, 'Processing billing for tenant');
                    if (dryRun) {
                        continue;
                    }
                    await this.billing.generateAndExportReport(tenantId);
                }
                catch (err) {
                    this.logger.error({ err, tenantId }, 'Failed to process billing for tenant');
                }
            }
        }
        catch (err) {
            this.logger.error({ err }, 'Failed to list tenants for billing close');
        }
        finally {
            if (lockAcquired && client) {
                await this.releaseDistributedLock(client);
            }
            if (client) {
                client.release();
            }
            this.isProcessing = false;
        }
    }
    async acquireDistributedLock(client, timeoutMs) {
        const endAt = Date.now() + timeoutMs;
        while (Date.now() < endAt) {
            const result = await client.query('SELECT pg_try_advisory_lock($1) AS acquired', [
                BillingJobService.BILLING_CLOSE_LOCK_KEY,
            ]);
            if (result?.rows?.[0]?.acquired) {
                this.logger.info('Billing close lock acquired via pg_try_advisory_lock');
                return true;
            }
            await this.delay(BillingJobService.LOCK_RETRY_DELAY_MS);
        }
        return false;
    }
    async releaseDistributedLock(client) {
        try {
            await client.query('SELECT pg_advisory_unlock($1) AS released', [
                BillingJobService.BILLING_CLOSE_LOCK_KEY,
            ]);
            this.logger.info('Billing close lock released');
        }
        catch (err) {
            this.logger.error({ err }, 'Failed to release billing close advisory lock');
        }
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.BillingJobService = BillingJobService;
exports.billingJobService = new BillingJobService();

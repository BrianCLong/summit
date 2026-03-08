"use strict";
/**
 * Canary Auto-Escalation Worker: Promote canary tenants after 7 clean days
 * Automatically escalates daily limits from $25 to $50, monthly from $750 to $1,500
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanaryEscalationManager = void 0;
exports.getEscalationManager = getEscalationManager;
exports.startEscalationManager = startEscalationManager;
exports.stopEscalationManager = stopEscalationManager;
// import { Queue, Worker, Job } from 'bullmq';
const pg_1 = require("pg");
const node_fetch_1 = __importDefault(require("node-fetch"));
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const safeMutationsMetrics_js_1 = require("../monitoring/safeMutationsMetrics.js");
/**
 * Canary Escalation Manager
 */
class CanaryEscalationManager {
    // private queue: Queue<EscalationJobData>;
    // private worker: Worker<EscalationJobData>;
    pool;
    config = {
        promqlUrl: process.env.PROMQL_URL,
        cleanDaysRequired: parseInt(process.env.CANARY_CLEAN_DAYS || '7'),
        maxDailyLimit: parseFloat(process.env.CANARY_MAX_DAILY_LIMIT || '100.00'),
        escalationFactor: parseFloat(process.env.CANARY_ESCALATION_FACTOR || '2.0'),
        dryRunMode: process.env.CANARY_ESCALATION_DRY_RUN === 'true',
    };
    stats = {
        totalChecks: 0,
        candidatesFound: 0,
        escalationsPerformed: 0,
        escalationsFailed: 0,
        lastRun: new Date(),
    };
    constructor() {
        const redisConnection = {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || '0'),
        };
        this.pool = new pg_1.Pool({
            connectionString: process.env.DATABASE_URL,
            max: 5,
            idleTimeoutMillis: 30000,
        });
        // this.queue = new Queue<EscalationJobData>('canary-escalate', {
        //   connection: redisConnection,
        //   defaultJobOptions: {
        //     removeOnComplete: 50,
        //     removeOnFail: 25
        //   }
        // });
        // this.worker = new Worker<EscalationJobData>('canary-escalate',
        //   this.processEscalation.bind(this),
        //   {
        //     connection: redisConnection,
        //     concurrency: 1, // Only one escalation job at a time
        //     maxStalledCount: 1,
        //     stalledInterval: 300000 // 5 minutes
        //   }
        // );
        this.setupEventHandlers();
        this.scheduleDaily();
    }
    /**
     * Setup worker event handlers
     */
    setupEventHandlers() {
        // this.worker.on('completed', (job: any) => {
        //   this.stats.lastRun = new Date();
        //   logger.info('Canary escalation job completed', {
        //     jobId: job.id,
        //     duration: Date.now() - job.processedOn!
        //   });
        // });
        // this.worker.on('failed', (job, err) => {
        //   logger.error('Canary escalation job failed', {
        //     jobId: job?.id,
        //     error: err.message
        //   });
        // });
    }
    /**
     * Schedule daily escalation checks
     */
    scheduleDaily() {
        // Run daily at 2 AM UTC
        // this.queue.add('escalation-check', {}, {
        //   repeat: {
        //     cron: '0 2 * * *' // Daily at 2 AM
        //   },
        //   jobId: 'daily-escalation-check' // Prevent duplicate jobs
        // }).catch(err => {
        //   logger.error('Failed to schedule daily escalation job', { error: err });
        // });
        logger_js_1.default.info('Canary escalation worker scheduled', {
            cron: '0 2 * * *',
            cleanDaysRequired: this.config.cleanDaysRequired,
            dryRunMode: this.config.dryRunMode,
        });
    }
    /**
     * Main escalation processing logic
     */
    async processEscalation(job) {
        const { dryRun = this.config.dryRunMode } = job.data;
        this.stats.totalChecks++;
        logger_js_1.default.info('Starting canary escalation check', {
            jobId: job.id,
            dryRun,
            cleanDaysRequired: this.config.cleanDaysRequired,
        });
        try {
            // Find escalation candidates
            const candidates = await this.findEscalationCandidates();
            this.stats.candidatesFound = candidates.filter((c) => c.canEscalate).length;
            if (candidates.length === 0) {
                logger_js_1.default.info('No canary tenants found for escalation evaluation');
                return;
            }
            const results = [];
            // Process each candidate
            for (const candidate of candidates) {
                if (!candidate.canEscalate) {
                    logger_js_1.default.debug('Skipping tenant escalation', {
                        tenantId: candidate.tenantId,
                        reasons: candidate.blockingReasons,
                    });
                    continue;
                }
                try {
                    const result = await this.escalateTenant(candidate, dryRun);
                    results.push(result);
                    if (result.success) {
                        this.stats.escalationsPerformed++;
                    }
                    else {
                        this.stats.escalationsFailed++;
                    }
                }
                catch (error) {
                    logger_js_1.default.error('Error escalating tenant', {
                        tenantId: candidate.tenantId,
                        error: error instanceof Error ? error.message : String(error),
                    });
                    this.stats.escalationsFailed++;
                    results.push({
                        tenantId: candidate.tenantId,
                        success: false,
                        previousDailyLimit: candidate.currentDailyLimit,
                        newDailyLimit: candidate.currentDailyLimit,
                        previousMonthlyLimit: candidate.currentMonthlyLimit,
                        newMonthlyLimit: candidate.currentMonthlyLimit,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }
            // Log summary
            const successful = results.filter((r) => r.success);
            const failed = results.filter((r) => !r.success);
            logger_js_1.default.info('Canary escalation check completed', {
                totalCandidates: candidates.length,
                eligibleForEscalation: candidates.filter((c) => c.canEscalate).length,
                successful: successful.length,
                failed: failed.length,
                dryRun,
                results: successful.map((r) => ({
                    tenant: r.tenantId,
                    newDaily: r.newDailyLimit,
                    newMonthly: r.newMonthlyLimit,
                })),
            });
            // Record metrics
            safeMutationsMetrics_js_1.SafeMutationMetrics.recordRollback('manual_rollback', 'automatic', 'system', 'canary_escalation');
        }
        catch (error) {
            logger_js_1.default.error('Canary escalation check failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Find tenants eligible for escalation
     */
    async findEscalationCandidates() {
        const query = `
      SELECT
        tenant_id,
        daily_usd_limit,
        monthly_usd_limit,
        last_escalated_at,
        canary,
        auto_escalate
      FROM tenant_budget
      WHERE canary = TRUE
        AND auto_escalate = TRUE
        AND daily_usd_limit < $1
        AND deleted_at IS NULL
    `;
        const result = await this.pool.query(query, [this.config.maxDailyLimit]);
        const candidates = [];
        for (const row of result.rows) {
            const candidate = await this.evaluateCandidate({
                tenantId: row.tenant_id,
                currentDailyLimit: parseFloat(row.daily_usd_limit),
                currentMonthlyLimit: parseFloat(row.monthly_usd_limit),
                lastEscalated: row.last_escalated_at,
            });
            candidates.push(candidate);
        }
        return candidates;
    }
    /**
     * Evaluate if a tenant is ready for escalation
     */
    async evaluateCandidate(params) {
        const { tenantId, currentDailyLimit, currentMonthlyLimit, lastEscalated } = params;
        const blockingReasons = [];
        // Check if enough time has passed since last escalation
        if (lastEscalated) {
            const daysSinceEscalation = Math.floor((Date.now() - lastEscalated.getTime()) / (24 * 60 * 60 * 1000));
            if (daysSinceEscalation < this.config.cleanDaysRequired) {
                blockingReasons.push(`Only ${daysSinceEscalation} days since last escalation`);
            }
        }
        // Check Prometheus for clean behavior
        let daysClean = 0;
        if (this.config.promqlUrl) {
            try {
                const cleanDays = await this.checkCleanBehavior(tenantId);
                daysClean = cleanDays;
                if (cleanDays < this.config.cleanDaysRequired) {
                    blockingReasons.push(`Only ${cleanDays} clean days (need ${this.config.cleanDaysRequired})`);
                }
            }
            catch (error) {
                blockingReasons.push(`Failed to check Prometheus metrics: ${error}`);
            }
        }
        else {
            blockingReasons.push('Prometheus URL not configured - cannot verify clean behavior');
        }
        return {
            tenantId,
            currentDailyLimit,
            currentMonthlyLimit,
            lastEscalated,
            daysClean,
            canEscalate: blockingReasons.length === 0,
            blockingReasons,
        };
    }
    /**
     * Check tenant behavior via Prometheus metrics
     */
    async checkCleanBehavior(tenantId) {
        if (!this.config.promqlUrl) {
            throw new Error('Prometheus URL not configured');
        }
        const endTime = Math.floor(Date.now() / 1000);
        const queryWindow = `${this.config.cleanDaysRequired}d`;
        // Check for budget exceeded alerts
        const budgetQuery = `sum_over_time(ALERTS{alertname="CanaryDailyBudgetExceeded",tenant_id="${tenantId}"}[${queryWindow}])`;
        // Check for rollback events
        const rollbackQuery = `sum_over_time(rollback_events_total{tenant="${tenantId}"}[${queryWindow}])`;
        const [budgetResponse, rollbackResponse] = await Promise.all([
            this.queryPrometheus(budgetQuery, endTime),
            this.queryPrometheus(rollbackQuery, endTime),
        ]);
        const budgetExceeded = this.extractMetricValue(budgetResponse) > 0;
        const rollbacksOccurred = this.extractMetricValue(rollbackResponse) > 0;
        if (budgetExceeded) {
            throw new Error('Budget exceeded alerts found in evaluation period');
        }
        if (rollbacksOccurred) {
            throw new Error('Rollback events found in evaluation period');
        }
        // If we reach here, tenant has been clean for the full period
        return this.config.cleanDaysRequired;
    }
    /**
     * Query Prometheus API
     */
    async queryPrometheus(query, time) {
        const url = `${this.config.promqlUrl}/api/v1/query`;
        const params = new URLSearchParams({
            query,
            time: time.toString(),
        });
        const response = await (0, node_fetch_1.default)(`${url}?${params}`, {
            timeout: 10000,
        });
        if (!response.ok) {
            throw new Error(`Prometheus query failed: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }
    /**
     * Extract numeric value from Prometheus response
     */
    extractMetricValue(response) {
        const result = response?.data?.result;
        if (!result || result.length === 0) {
            return 0;
        }
        const value = result[0]?.value?.[1];
        return value ? parseFloat(value) : 0;
    }
    /**
     * Perform tenant escalation
     */
    async escalateTenant(candidate, dryRun) {
        const newDailyLimit = candidate.currentDailyLimit * this.config.escalationFactor;
        const newMonthlyLimit = candidate.currentMonthlyLimit * this.config.escalationFactor;
        const result = {
            tenantId: candidate.tenantId,
            success: false,
            previousDailyLimit: candidate.currentDailyLimit,
            newDailyLimit,
            previousMonthlyLimit: candidate.currentMonthlyLimit,
            newMonthlyLimit,
        };
        if (dryRun) {
            logger_js_1.default.info('DRY RUN: Would escalate tenant', {
                tenantId: candidate.tenantId,
                currentDaily: candidate.currentDailyLimit,
                newDaily: newDailyLimit,
                currentMonthly: candidate.currentMonthlyLimit,
                newMonthly: newMonthlyLimit,
            });
            result.success = true;
            return result;
        }
        try {
            const updateQuery = `
        UPDATE tenant_budget
        SET
          daily_usd_limit = $1,
          monthly_usd_limit = $2,
          last_escalated_at = NOW(),
          updated_at = NOW(),
          updated_by = 'auto-escalate',
          notes = COALESCE(notes || ' | ', '') || 'Auto-escalated from $' || daily_usd_limit || '/day to $' || $1 || '/day on ' || NOW()::date
        WHERE tenant_id = $3
          AND canary = TRUE
          AND auto_escalate = TRUE
      `;
            const updateResult = await this.pool.query(updateQuery, [
                newDailyLimit,
                newMonthlyLimit,
                candidate.tenantId,
            ]);
            if (updateResult.rowCount === 0) {
                throw new Error('No rows updated - tenant may not exist or not eligible');
            }
            logger_js_1.default.info('Tenant successfully escalated', {
                tenantId: candidate.tenantId,
                previousDaily: candidate.currentDailyLimit,
                newDaily: newDailyLimit,
                previousMonthly: candidate.currentMonthlyLimit,
                newMonthly: newMonthlyLimit,
                daysClean: candidate.daysClean,
            });
            result.success = true;
            return result;
        }
        catch (error) {
            result.error = error instanceof Error ? error.message : String(error);
            return result;
        }
    }
    /**
     * Manual trigger for escalation check
     */
    // async triggerEscalationCheck(dryRun: boolean = false): Promise<void> {
    //   // await this.queue.add('manual-escalation-check', {
    //   //   dryRun,
    //   //   checkDate: new Date().toISOString()
    //   // });
    // }
    /**
     * Get escalation statistics
     */
    getStats() {
        return {
            ...this.stats,
            config: this.config,
            // queueName: this.queue.name
        };
    }
    /**
     * Graceful shutdown
     */
    async shutdown() {
        logger_js_1.default.info('Shutting down canary escalation manager...');
        // await this.worker.close();
        // await this.queue.close();
        await this.pool.end();
        logger_js_1.default.info('Canary escalation manager shutdown complete');
    }
}
exports.CanaryEscalationManager = CanaryEscalationManager;
// Global manager instance
let globalEscalationManager = null;
/**
 * Get global escalation manager
 */
function getEscalationManager() {
    if (!globalEscalationManager) {
        globalEscalationManager = new CanaryEscalationManager();
    }
    return globalEscalationManager;
}
/**
 * Start escalation manager (called from server startup)
 */
function startEscalationManager() {
    const manager = getEscalationManager();
    logger_js_1.default.info('Canary escalation manager started', {
        cleanDaysRequired: parseInt(process.env.CANARY_CLEAN_DAYS || '7'),
        maxDailyLimit: parseFloat(process.env.CANARY_MAX_DAILY_LIMIT || '100.00'),
        dryRunMode: process.env.CANARY_ESCALATION_DRY_RUN === 'true',
    });
    return manager;
}
/**
 * Stop escalation manager
 */
async function stopEscalationManager() {
    if (globalEscalationManager) {
        await globalEscalationManager.shutdown();
        globalEscalationManager = null;
    }
}

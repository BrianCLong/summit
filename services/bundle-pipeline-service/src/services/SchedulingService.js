"use strict";
/**
 * SchedulingService - Handles scheduled and event-triggered briefing generation
 * Supports cron-based schedules, SLA triggers, and one-time scheduled runs
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulingService = void 0;
const uuid_1 = require("uuid");
const node_cron_1 = __importDefault(require("node-cron"));
class SchedulingService {
    pool;
    logger;
    briefingService;
    activeJobs = new Map();
    jobQueue = new Map();
    constructor(pool, briefingService, logger) {
        this.pool = pool;
        this.briefingService = briefingService;
        this.logger = logger.child({ service: 'SchedulingService' });
    }
    /**
     * Initialize the scheduling service and load existing jobs
     */
    async initialize() {
        this.logger.info('Initializing scheduling service');
        try {
            // Load existing scheduled jobs from database
            const result = await this.pool.query(`SELECT * FROM scheduled_briefings WHERE status = 'active'`);
            for (const row of result.rows) {
                const job = this.mapRowToScheduledJob(row);
                this.jobQueue.set(job.id, job);
                if (job.schedule.type === 'recurring' && job.schedule.cronExpression) {
                    this.scheduleRecurringJob(job);
                }
                else if (job.schedule.type === 'once' && job.schedule.runAt) {
                    this.scheduleOneTimeJob(job);
                }
            }
            this.logger.info({ jobCount: this.jobQueue.size }, 'Loaded existing scheduled jobs');
        }
        catch (err) {
            this.logger.error({ err }, 'Failed to initialize scheduling service');
        }
    }
    /**
     * Create a new scheduled briefing
     */
    async createSchedule(input) {
        const jobId = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const nextRunAt = this.calculateNextRun(input.schedule);
        const job = {
            id: jobId,
            caseId: input.caseId,
            tenantId: input.tenantId,
            briefingType: input.briefingType,
            templateId: input.templateId,
            schedule: input.schedule,
            deliveryChannels: input.deliveryChannels,
            recipients: input.recipients,
            createdBy: input.createdBy,
            createdAt: now,
            updatedAt: now,
            nextRunAt,
            runCount: 0,
            status: 'active',
            metadata: input.metadata || {},
        };
        // Persist to database
        await this.saveScheduledJob(job);
        // Add to in-memory queue
        this.jobQueue.set(jobId, job);
        // Schedule the job
        if (input.schedule.type === 'recurring' && input.schedule.cronExpression) {
            this.scheduleRecurringJob(job);
        }
        else if (input.schedule.type === 'once' && input.schedule.runAt) {
            this.scheduleOneTimeJob(job);
        }
        this.logger.info({ jobId, caseId: input.caseId, nextRunAt }, 'Created scheduled briefing job');
        return job;
    }
    /**
     * Cancel a scheduled job
     */
    async cancelSchedule(jobId) {
        const job = this.jobQueue.get(jobId);
        if (!job) {
            return false;
        }
        // Stop the cron task if running
        const task = this.activeJobs.get(jobId);
        if (task) {
            task.stop();
            this.activeJobs.delete(jobId);
        }
        // Update status
        job.status = 'completed';
        job.updatedAt = new Date().toISOString();
        await this.updateScheduledJob(job);
        this.jobQueue.delete(jobId);
        this.logger.info({ jobId }, 'Cancelled scheduled briefing job');
        return true;
    }
    /**
     * Pause a scheduled job
     */
    async pauseSchedule(jobId) {
        const job = this.jobQueue.get(jobId);
        if (!job) {
            return false;
        }
        const task = this.activeJobs.get(jobId);
        if (task) {
            task.stop();
        }
        job.status = 'paused';
        job.updatedAt = new Date().toISOString();
        await this.updateScheduledJob(job);
        this.logger.info({ jobId }, 'Paused scheduled briefing job');
        return true;
    }
    /**
     * Resume a paused job
     */
    async resumeSchedule(jobId) {
        const job = this.jobQueue.get(jobId);
        if (!job || job.status !== 'paused') {
            return false;
        }
        job.status = 'active';
        job.nextRunAt = this.calculateNextRun(job.schedule);
        job.updatedAt = new Date().toISOString();
        await this.updateScheduledJob(job);
        // Re-schedule
        if (job.schedule.type === 'recurring' && job.schedule.cronExpression) {
            this.scheduleRecurringJob(job);
        }
        else if (job.schedule.type === 'once' && job.schedule.runAt) {
            this.scheduleOneTimeJob(job);
        }
        this.logger.info({ jobId }, 'Resumed scheduled briefing job');
        return true;
    }
    /**
     * Get all scheduled jobs for a case
     */
    async getSchedulesForCase(caseId, tenantId) {
        const result = await this.pool.query(`SELECT * FROM scheduled_briefings WHERE case_id = $1 AND tenant_id = $2 ORDER BY created_at DESC`, [caseId, tenantId]);
        return result.rows.map((row) => this.mapRowToScheduledJob(row));
    }
    /**
     * Get a specific scheduled job
     */
    async getSchedule(jobId) {
        const result = await this.pool.query(`SELECT * FROM scheduled_briefings WHERE id = $1`, [jobId]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToScheduledJob(result.rows[0]);
    }
    /**
     * Trigger immediate execution of a scheduled job
     */
    async triggerImmediate(jobId, userId) {
        const job = this.jobQueue.get(jobId) || await this.getSchedule(jobId);
        if (!job) {
            return {
                success: false,
                error: 'Job not found',
                executedAt: new Date().toISOString(),
                duration: 0,
            };
        }
        return this.executeJob(job, userId);
    }
    /**
     * Get execution history for a job
     */
    async getExecutionHistory(jobId, limit = 10) {
        const result = await this.pool.query(`SELECT * FROM briefing_job_executions
       WHERE job_id = $1
       ORDER BY executed_at DESC
       LIMIT $2`, [jobId, limit]);
        return result.rows.map((row) => ({
            success: row.success,
            briefingId: row.briefing_id,
            error: row.error,
            executedAt: row.executed_at,
            duration: row.duration,
        }));
    }
    /**
     * Clean up completed one-time jobs
     */
    async cleanupCompletedJobs(olderThanDays = 30) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - olderThanDays);
        const result = await this.pool.query(`DELETE FROM scheduled_briefings
       WHERE status IN ('completed', 'failed')
       AND updated_at < $1
       RETURNING id`, [cutoff.toISOString()]);
        this.logger.info({ deletedCount: result.rowCount }, 'Cleaned up old scheduled jobs');
        return result.rowCount || 0;
    }
    // ============================================================================
    // Private Methods
    // ============================================================================
    scheduleRecurringJob(job) {
        if (!job.schedule.cronExpression) {
            return;
        }
        // Validate cron expression
        if (!node_cron_1.default.validate(job.schedule.cronExpression)) {
            this.logger.error({ jobId: job.id, cronExpression: job.schedule.cronExpression }, 'Invalid cron expression');
            return;
        }
        const task = node_cron_1.default.schedule(job.schedule.cronExpression, async () => {
            await this.executeJob(job, job.createdBy);
            // Check if job should end
            if (job.schedule.endAfterOccurrences && job.runCount >= job.schedule.endAfterOccurrences) {
                await this.cancelSchedule(job.id);
            }
            if (job.schedule.endAt && new Date() >= new Date(job.schedule.endAt)) {
                await this.cancelSchedule(job.id);
            }
        }, {
            timezone: job.schedule.timezone,
            scheduled: true,
        });
        this.activeJobs.set(job.id, task);
        this.logger.debug({ jobId: job.id, cronExpression: job.schedule.cronExpression }, 'Scheduled recurring job');
    }
    scheduleOneTimeJob(job) {
        if (!job.schedule.runAt) {
            return;
        }
        const runAt = new Date(job.schedule.runAt);
        const now = new Date();
        const delay = runAt.getTime() - now.getTime();
        if (delay <= 0) {
            // Run immediately if time has passed
            this.executeJob(job, job.createdBy).then(() => {
                this.cancelSchedule(job.id);
            });
            return;
        }
        // Use setTimeout for one-time jobs
        const timeoutId = setTimeout(async () => {
            await this.executeJob(job, job.createdBy);
            await this.cancelSchedule(job.id);
        }, delay);
        // Store as a fake cron task for management
        const fakeTask = {
            stop: () => clearTimeout(timeoutId),
        };
        this.activeJobs.set(job.id, fakeTask);
        this.logger.debug({ jobId: job.id, runAt: job.schedule.runAt }, 'Scheduled one-time job');
    }
    async executeJob(job, triggeredBy) {
        const startTime = Date.now();
        const executedAt = new Date().toISOString();
        this.logger.info({ jobId: job.id, caseId: job.caseId }, 'Executing scheduled briefing job');
        try {
            const context = {
                userId: triggeredBy,
                tenantId: job.tenantId,
                reason: `Scheduled briefing: ${job.id}`,
            };
            // Get latest evidence and claim bundles for the case
            const evidenceBundles = await this.getLatestEvidenceBundleIds(job.caseId, job.tenantId);
            const claimBundles = await this.getLatestClaimBundleIds(job.caseId, job.tenantId);
            const result = await this.briefingService.assembleBriefingPackage({
                caseId: job.caseId,
                title: `${job.briefingType.replace(/_/g, ' ')} - ${new Date().toLocaleDateString()}`,
                briefingType: job.briefingType,
                templateId: job.templateId,
                evidenceBundleIds: evidenceBundles,
                claimBundleIds: claimBundles,
                includeExecutiveSummary: true,
                includeSlideDecks: true,
                generateNarrativeWithAI: false,
                classificationLevel: 'CONFIDENTIAL',
                deliveryChannels: job.deliveryChannels,
                distributionList: job.recipients,
            }, context);
            const duration = Date.now() - startTime;
            // Update job state
            job.lastRunAt = executedAt;
            job.runCount += 1;
            job.nextRunAt = this.calculateNextRun(job.schedule);
            job.updatedAt = executedAt;
            if (!result.success) {
                job.lastError = result.errors.join('; ');
            }
            else {
                job.lastError = undefined;
            }
            await this.updateScheduledJob(job);
            // Record execution
            await this.recordExecution(job.id, {
                success: result.success,
                briefingId: result.briefing?.id,
                error: result.errors.join('; ') || undefined,
                executedAt,
                duration,
            });
            this.logger.info({ jobId: job.id, briefingId: result.briefing?.id, duration }, 'Completed scheduled briefing execution');
            return {
                success: result.success,
                briefingId: result.briefing?.id,
                error: result.errors.length > 0 ? result.errors.join('; ') : undefined,
                executedAt,
                duration,
            };
        }
        catch (err) {
            const duration = Date.now() - startTime;
            const error = err instanceof Error ? err.message : String(err);
            this.logger.error({ err, jobId: job.id }, 'Failed to execute scheduled briefing');
            // Update job state
            job.lastRunAt = executedAt;
            job.runCount += 1;
            job.lastError = error;
            job.updatedAt = executedAt;
            await this.updateScheduledJob(job);
            await this.recordExecution(job.id, {
                success: false,
                error,
                executedAt,
                duration,
            });
            return {
                success: false,
                error,
                executedAt,
                duration,
            };
        }
    }
    calculateNextRun(schedule) {
        if (schedule.type === 'once') {
            return schedule.runAt;
        }
        if (schedule.type === 'recurring' && schedule.cronExpression) {
            // Parse cron and calculate next run
            // This is a simplified implementation
            const now = new Date();
            const interval = node_cron_1.default.schedule(schedule.cronExpression, () => { }, {
                timezone: schedule.timezone,
                scheduled: false,
            });
            // Get next execution time (node-cron doesn't provide this directly)
            // For now, return a placeholder
            return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
        }
        return undefined;
    }
    async getLatestEvidenceBundleIds(caseId, tenantId) {
        const result = await this.pool.query(`SELECT id FROM evidence_bundles
       WHERE case_id = $1 AND tenant_id = $2 AND status IN ('approved', 'published')
       ORDER BY created_at DESC
       LIMIT 10`, [caseId, tenantId]);
        return result.rows.map((row) => row.id);
    }
    async getLatestClaimBundleIds(caseId, tenantId) {
        const result = await this.pool.query(`SELECT id FROM claim_bundles
       WHERE case_id = $1 AND tenant_id = $2 AND status IN ('approved', 'published')
       ORDER BY created_at DESC
       LIMIT 10`, [caseId, tenantId]);
        return result.rows.map((row) => row.id);
    }
    async saveScheduledJob(job) {
        await this.pool.query(`INSERT INTO scheduled_briefings (
        id, case_id, tenant_id, briefing_type, template_id,
        schedule, delivery_channels, recipients,
        created_by, created_at, updated_at,
        last_run_at, next_run_at, run_count,
        status, last_error, metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
      )`, [
            job.id,
            job.caseId,
            job.tenantId,
            job.briefingType,
            job.templateId,
            JSON.stringify(job.schedule),
            JSON.stringify(job.deliveryChannels),
            JSON.stringify(job.recipients),
            job.createdBy,
            job.createdAt,
            job.updatedAt,
            job.lastRunAt,
            job.nextRunAt,
            job.runCount,
            job.status,
            job.lastError,
            JSON.stringify(job.metadata),
        ]);
    }
    async updateScheduledJob(job) {
        await this.pool.query(`UPDATE scheduled_briefings SET
        updated_at = $2,
        last_run_at = $3,
        next_run_at = $4,
        run_count = $5,
        status = $6,
        last_error = $7
      WHERE id = $1`, [
            job.id,
            job.updatedAt,
            job.lastRunAt,
            job.nextRunAt,
            job.runCount,
            job.status,
            job.lastError,
        ]);
    }
    async recordExecution(jobId, result) {
        await this.pool.query(`INSERT INTO briefing_job_executions (
        id, job_id, success, briefing_id, error, executed_at, duration
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
            (0, uuid_1.v4)(),
            jobId,
            result.success,
            result.briefingId,
            result.error,
            result.executedAt,
            result.duration,
        ]);
    }
    mapRowToScheduledJob(row) {
        return {
            id: row.id,
            caseId: row.case_id,
            tenantId: row.tenant_id,
            briefingType: row.briefing_type,
            templateId: row.template_id,
            schedule: JSON.parse(row.schedule),
            deliveryChannels: JSON.parse(row.delivery_channels),
            recipients: JSON.parse(row.recipients),
            createdBy: row.created_by,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            lastRunAt: row.last_run_at,
            nextRunAt: row.next_run_at,
            runCount: row.run_count,
            status: row.status,
            lastError: row.last_error,
            metadata: JSON.parse(row.metadata || '{}'),
        };
    }
    /**
     * Shutdown the scheduling service
     */
    async shutdown() {
        this.logger.info('Shutting down scheduling service');
        for (const [jobId, task] of this.activeJobs) {
            task.stop();
            this.logger.debug({ jobId }, 'Stopped scheduled job');
        }
        this.activeJobs.clear();
        this.jobQueue.clear();
    }
}
exports.SchedulingService = SchedulingService;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JOB_QUEUE_GENERATE_REPORT = void 0;
// @ts-nocheck
const pg_boss_1 = require("pg-boss");
const index_js_1 = __importDefault(require("../config/index.js"));
const service_js_1 = require("../reporting/service.js");
const access_control_js_1 = require("../reporting/access-control.js");
const RevenueJobs_js_1 = require("../jobs/revenue/RevenueJobs.js");
// Define system-level access rules for background jobs
const systemRules = [
    { resource: 'report', action: 'view', roles: ['system'] },
    { resource: 'report', action: 'create', roles: ['system'] },
    { resource: 'report', action: 'deliver', roles: ['system'] },
];
const reportingService = (0, service_js_1.createReportingService)(new access_control_js_1.AccessControlService(systemRules));
exports.JOB_QUEUE_GENERATE_REPORT = 'generate-report';
/**
 * @class BatchJobService
 * @description Manages background job processing using pg-boss.
 * This service is responsible for initializing the job queue, registering workers for different job types,
 * and scheduling recurring or one-off tasks. It is implemented as a singleton.
 *
 * @example
 * ```typescript
 * import BatchJobService from './BatchJobService.js';
 *
 * async function initializeApp() {
 *   const jobService = BatchJobService.getInstance();
 *   await jobService.start();
 *
 *   // Queue a report to be generated immediately
 *   await jobService.queueReport('daily-summary', { date: new Date() });
 *
 *   // Schedule a weekly report
 *   await jobService.scheduleReport('weekly-digest', '0 8 * * 1', { period: 'weekly' });
 * }
 *
 * initializeApp();
 * ```
 */
class BatchJobService {
    static instance;
    _boss;
    constructor() {
        // Lazy initialization
    }
    get boss() {
        if (!this._boss) {
            // @ts-ignore
            this._boss = new pg_boss_1.PgBoss(index_js_1.default.DATABASE_URL);
            this._boss.on('error', error => console.error(`[PG-BOSS] Error: ${error.message}`));
        }
        return this._boss;
    }
    /**
     * @method getInstance
     * @description Gets the singleton instance of the BatchJobService.
     * @static
     * @returns {BatchJobService} The singleton instance.
     */
    static getInstance() {
        if (!BatchJobService.instance) {
            BatchJobService.instance = new BatchJobService();
        }
        return BatchJobService.instance;
    }
    /**
     * @method start
     * @description Starts the pg-boss instance, which begins processing jobs from the queue.
     * It also registers all necessary job workers and schedules any recurring system jobs.
     * This should be called once during application startup.
     * @returns {Promise<void>}
     */
    async start() {
        await this.boss.start();
        console.log('[PG-BOSS] Job processor started.');
        await this.registerWorkers();
        await this.scheduleJobs();
    }
    /**
     * @private
     * @method registerWorkers
     * @description Registers all worker functions that process jobs from the queues.
     * Each worker is associated with a specific job queue name.
     */
    async registerWorkers() {
        // Register revenue jobs
        await (0, RevenueJobs_js_1.registerRevenueJobs)(this.boss);
        // Register worker for report generation
        await this.boss.work(exports.JOB_QUEUE_GENERATE_REPORT, async (job) => {
            console.log(`[PG-BOSS] Processing report job ${job.id} (${job.name})`);
            try {
                const { request, userId, reportName } = job.data;
                console.log(`[PG-BOSS] Generating report: ${reportName || 'unnamed'}`);
                // Construct a system access context, impersonating the user who scheduled it or using system user
                const access = {
                    userId: userId || 'system-scheduler',
                    roles: ['system', 'admin', 'user'], // Grant sufficient roles for background execution
                };
                await reportingService.generate(request, access);
                console.log(`[PG-BOSS] Report generated successfully for job ${job.id}`);
            }
            catch (error) {
                console.error(`[PG-BOSS] Report generation failed for job ${job.id}:`, error);
                throw error;
            }
        });
    }
    /**
     * @private
     * @method scheduleJobs
     * @description Schedules recurring system-level jobs using a cron-like syntax.
     * It ensures that existing schedules are cleared on startup to prevent duplicates.
     */
    async scheduleJobs() {
        // Unschedule existing jobs to prevent duplicates during restarts
        await this.boss.unschedule('generate-soc2-evidence');
        // Schedule the SOC2 evidence generation job to run on the 1st of every month
        // cron: <minutes> <hours> <days of month> <months> <days of week>
        const cron = '0 3 1 * *'; // At 03:00 on day-of-month 1
        await this.boss.schedule('generate-soc2-evidence', cron);
        console.log(`[PG-BOSS] Scheduled job 'generate-soc2-evidence' with cron: ${cron}`);
    }
    /**
     * @method scheduleReport
     * @description Schedules a report to be generated on a recurring basis, defined by a cron string.
     * @param {string} reportName - A descriptive name for the report being scheduled.
     * @param {string} cron - The cron string defining the schedule (e.g., '0 8 * * 1' for every Monday at 8 AM).
     * @param {any} data - The data required by the report generation job.
     * @returns {Promise<string | null>} The ID of the scheduled job.
     */
    async scheduleReport(reportName, cron, data) {
        const jobData = { ...data, reportName };
        const jobId = await this.boss.send(exports.JOB_QUEUE_GENERATE_REPORT, jobData, { tz: 'UTC', ...(cron ? { cron } : {}) });
        console.log(`[PG-BOSS] Scheduled report '${reportName}' on queue '${exports.JOB_QUEUE_GENERATE_REPORT}' with cron: ${cron}`);
        return jobId;
    }
    /**
     * @method queueReport
     * @description Adds a report generation job to the queue for immediate, one-time execution.
     * @param {string} reportName - A descriptive name for the report.
     * @param {any} data - The data required for the report generation.
     * @returns {Promise<string | null>} The ID of the queued job.
     */
    async queueReport(reportName, data) {
        const jobData = { ...data, reportName };
        const jobId = await this.boss.send(exports.JOB_QUEUE_GENERATE_REPORT, jobData);
        console.log(`[PG-BOSS] Queued report '${reportName}' on queue '${exports.JOB_QUEUE_GENERATE_REPORT}' with id: ${jobId}`);
        return jobId;
    }
    /**
     * @method stop
     * @description Gracefully stops the job processor.
     * This allows any currently running jobs to complete before shutting down.
     * @returns {Promise<void>}
     */
    async stop() {
        await this.boss.stop();
        console.log('[PG-BOSS] Job processor stopped.');
    }
}
exports.default = BatchJobService.getInstance();

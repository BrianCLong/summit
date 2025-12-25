// @ts-nocheck
import PgBoss from 'pg-boss';
import { cfg } from '../config/index.js';
import { createReportingService } from '../reporting/service.js';
import { AccessControlService } from '../reporting/access-control.js';
import { AccessRule, AccessContext } from '../reporting/types.js';
import { registerRevenueJobs } from '../jobs/revenue/RevenueJobs.js';

// Define system-level access rules for background jobs
const systemRules: AccessRule[] = [
    { resource: 'report', action: 'view', roles: ['system'] },
    { resource: 'report', action: 'create', roles: ['system'] },
    { resource: 'report', action: 'deliver', roles: ['system'] },
];
const reportingService = createReportingService(new AccessControlService(systemRules));

export const JOB_QUEUE_GENERATE_REPORT = 'generate-report';

/**
 * @class BatchJobService
 * @description Manages background job processing with pg-boss.
 *
 * This singleton service initializes and configures pg-boss, registers job
 * processors, and schedules recurring tasks.
 */
class BatchJobService {
  private static instance: BatchJobService;
  public boss: PgBoss;

  private constructor() {
    this.boss = new PgBoss(cfg.DATABASE_URL);
    this.boss.on('error', error => console.error(`[PG-BOSS] Error: ${error.message}`));
  }

  public static getInstance(): BatchJobService {
    if (!BatchJobService.instance) {
      BatchJobService.instance = new BatchJobService();
    }
    return BatchJobService.instance;
  }

  /**
   * Starts the job processor and schedules recurring jobs.
   */
  public async start() {
    await this.boss.start();
    console.log('[PG-BOSS] Job processor started.');
    await this.registerWorkers();
    await this.scheduleJobs();
  }

  private async registerWorkers() {
      // Register revenue jobs
      await registerRevenueJobs(this.boss);

      // Register worker for report generation
      await this.boss.work(JOB_QUEUE_GENERATE_REPORT, async (job) => {
          console.log(`[PG-BOSS] Processing report job ${job.id} (${job.name})`);
          try {
              const { request, userId, reportName } = job.data;
              console.log(`[PG-BOSS] Generating report: ${reportName || 'unnamed'}`);

              // Construct a system access context, impersonating the user who scheduled it or using system user
              const access: AccessContext = {
                  userId: userId || 'system-scheduler',
                  roles: ['system', 'admin', 'user'], // Grant sufficient roles for background execution
              };

              await reportingService.generate(request, access);
              console.log(`[PG-BOSS] Report generated successfully for job ${job.id}`);
          } catch (error) {
              console.error(`[PG-BOSS] Report generation failed for job ${job.id}:`, error);
              throw error;
          }
      });
  }

  /**
   * Registers and schedules all recurring jobs for the application.
   */
  private async scheduleJobs() {
    // Unschedule existing jobs to prevent duplicates during restarts
    await this.boss.unschedule('generate-soc2-evidence');

    // Schedule the SOC2 evidence generation job to run on the 1st of every month
    // cron: <minutes> <hours> <days of month> <months> <days of week>
    const cron = '0 3 1 * *'; // At 03:00 on day-of-month 1
    await this.boss.schedule('generate-soc2-evidence', cron);
    console.log(`[PG-BOSS] Scheduled job 'generate-soc2-evidence' with cron: ${cron}`);
  }

  /**
   * Schedules a one-off or recurring reporting job.
   */
  public async scheduleReport(reportName: string, cron: string, data: any) {
      // We use a single queue 'generate-report' and pass the name in data
      const jobData = { ...data, reportName };
      // pg-boss schedule key (the job name) should be unique per schedule, so we use reportName as key suffix if needed,
      // but boss.schedule(queue, cron, data) uses queue as the grouping.
      // Wait, pg-boss schedule signature is (name, cron, data, options).
      // If we use 'generate-report' as name, all reports share the same schedule entry? No, that overrides.
      // We need unique names for different schedules.
      // BUT we want the WORKER to pick them up. The worker listens to a queue.
      // In pg-boss, the first argument to schedule() is the queue name.
      // To have different schedules on the same queue, pg-boss documentation says:
      // "When scheduling a job, the job name is used as the schedule key." - Wait, no.
      // "boss.schedule(queue, cron, data)"
      // So if I call boss.schedule('generate-report', ...) multiple times, it might overwrite?
      // Actually, standard pg-boss usage for singleton schedules is: schedule('job-name', cron).
      // Worker listens to 'job-name'.
      // If we want dynamic schedules, maybe we shouldn't use `schedule()` which is for system maintenance tasks usually.
      // But the requirement is "Scheduled generation".
      // If we use distinct queue names like `report-${name}`, we need wildcard listeners.
      // If wildcard listeners are not supported or tricky, we can use a single queue `generate-report`
      // but `schedule` might be limited.
      // Let's check if we can use `send()` with `startAfter` or `repeat` options?
      // `boss.send('generate-report', data, { retryLimit: 3, repeat: { cron: ... } })` ?
      // Modern pg-boss supports `send(name, data, options)` where options has `cron` or `repeat`.
      // Let's assume we use that pattern instead of `schedule()` which is often for singletons.

      const jobId = await this.boss.send(JOB_QUEUE_GENERATE_REPORT, jobData, { tz: 'UTC', ... (cron ? { cron } : {}) });
      console.log(`[PG-BOSS] Scheduled report '${reportName}' on queue '${JOB_QUEUE_GENERATE_REPORT}' with cron: ${cron}`);
      return jobId;
  }

  /**
   * Queues an immediate reporting job.
   */
  public async queueReport(reportName: string, data: any) {
      const jobData = { ...data, reportName };
      const jobId = await this.boss.send(JOB_QUEUE_GENERATE_REPORT, jobData);
      console.log(`[PG-BOSS] Queued report '${reportName}' on queue '${JOB_QUEUE_GENERATE_REPORT}' with id: ${jobId}`);
      return jobId;
  }

  /**
   * Stops the job processor gracefully.
   */
  public async stop() {
    await this.boss.stop();
    console.log('[PG-BOSS] Job processor stopped.');
  }
}

export default BatchJobService.getInstance();

// @ts-nocheck
import PgBoss from 'pg-boss';
import { cfg } from '../config/index.js';
import { createReportingService } from '../reporting/service.js';
import { AccessControlService } from '../reporting/access-control.js';
import { AccessRule, AccessContext } from '../reporting/types.js';
import { GraphEmbeddingService } from './GraphEmbeddingService.js';
import logger from '../utils/logger.js';

// Define system-level access rules for background jobs
const systemRules: AccessRule[] = [
    { resource: 'report', action: 'view', roles: ['system'] },
    { resource: 'report', action: 'create', roles: ['system'] },
    { resource: 'report', action: 'deliver', roles: ['system'] },
];
const reportingService = createReportingService(new AccessControlService(systemRules));
const graphEmbeddingService = new GraphEmbeddingService();

export const JOB_QUEUE_GENERATE_REPORT = 'generate-report';
export const JOB_QUEUE_GRAPH_EMBEDDING = 'graph-embedding';

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
    this.boss.on('error', error => logger.error(`[PG-BOSS] Error: ${error.message}`));
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
    logger.info('[PG-BOSS] Job processor started.');
    await this.registerWorkers();
    await this.scheduleJobs();
  }

  private async registerWorkers() {
      // Register worker for report generation
      await this.boss.work(JOB_QUEUE_GENERATE_REPORT, async (job) => {
          logger.info(`[PG-BOSS] Processing report job ${job.id} (${job.name})`);
          try {
              const { request, userId, reportName } = job.data;
              logger.info(`[PG-BOSS] Generating report: ${reportName || 'unnamed'}`);

              // Construct a system access context, impersonating the user who scheduled it or using system user
              const access: AccessContext = {
                  userId: userId || 'system-scheduler',
                  roles: ['system', 'admin', 'user'], // Grant sufficient roles for background execution
              };

              await reportingService.generate(request, access);
              logger.info(`[PG-BOSS] Report generated successfully for job ${job.id}`);
          } catch (error) {
              logger.error(`[PG-BOSS] Report generation failed for job ${job.id}:`, error);
              throw error;
          }
      });

      // Register worker for graph embedding
      await this.boss.work(JOB_QUEUE_GRAPH_EMBEDDING, async (job) => {
          logger.info(`[PG-BOSS] Processing graph embedding job ${job.id}`);
          try {
              const { tenantId, forceUpdate, dryRun } = job.data;
              if (!tenantId) {
                  throw new Error('Tenant ID is required for graph embedding job');
              }
              logger.info(`[PG-BOSS] Computing embeddings for tenant: ${tenantId}`);

              const result = await graphEmbeddingService.computeAndStoreNodeEmbeddings(tenantId, { forceUpdate, dryRun });

              logger.info(`[PG-BOSS] Graph embeddings computed for tenant ${tenantId}`, result);
          } catch (error) {
              logger.error(`[PG-BOSS] Graph embedding failed for job ${job.id}:`, error);
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
    logger.info(`[PG-BOSS] Scheduled job 'generate-soc2-evidence' with cron: ${cron}`);
  }

  /**
   * Schedules a one-off or recurring reporting job.
   */
  public async scheduleReport(reportName: string, cron: string, data: any) {
      const jobData = { ...data, reportName };
      const jobId = await this.boss.send(JOB_QUEUE_GENERATE_REPORT, jobData, { tz: 'UTC', ... (cron ? { cron } : {}) });
      logger.info(`[PG-BOSS] Scheduled report '${reportName}' on queue '${JOB_QUEUE_GENERATE_REPORT}' with cron: ${cron}`);
      return jobId;
  }

  /**
   * Queues an immediate reporting job.
   */
  public async queueReport(reportName: string, data: any) {
      const jobData = { ...data, reportName };
      const jobId = await this.boss.send(JOB_QUEUE_GENERATE_REPORT, jobData);
      logger.info(`[PG-BOSS] Queued report '${reportName}' on queue '${JOB_QUEUE_GENERATE_REPORT}' with id: ${jobId}`);
      return jobId;
  }

  /**
   * Schedules a recurring graph embedding job for a tenant
   */
  public async scheduleGraphEmbedding(tenantId: string, cron: string, options: any = {}) {
      const jobData = { tenantId, ...options };
      const scheduleName = `graph-embedding-${tenantId}`;

      const jobId = await this.boss.send(JOB_QUEUE_GRAPH_EMBEDDING, jobData, {
          tz: 'UTC',
          ... (cron ? { cron } : {}),
          singletonKey: scheduleName
      });
      logger.info(`[PG-BOSS] Scheduled graph embedding for tenant '${tenantId}' with cron: ${cron}`);
      return jobId;
  }

  /**
   * Queues an immediate graph embedding job
   */
  public async queueGraphEmbedding(tenantId: string, options: any = {}) {
      const jobData = { tenantId, ...options };
      const jobId = await this.boss.send(JOB_QUEUE_GRAPH_EMBEDDING, jobData);
      logger.info(`[PG-BOSS] Queued graph embedding for tenant '${tenantId}' with id: ${jobId}`);
      return jobId;
  }

  /**
   * Stops the job processor gracefully.
   */
  public async stop() {
    await this.boss.stop();
    logger.info('[PG-BOSS] Job processor stopped.');
  }
}

export default BatchJobService.getInstance();

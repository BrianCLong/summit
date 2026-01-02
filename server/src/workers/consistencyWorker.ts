// @ts-nocheck
import { Worker, Job, Queue } from 'bullmq';
import { cfg } from '../config.js';
import { getPostgresPool, getNeo4jDriver } from '../config/database.js';
import { GraphConsistencyService } from '../services/consistency/GraphConsistencyService.js';
import { ConsistencyStore } from '../services/consistency/ConsistencyStore.js';
import logger from '../config/logger.js';

const consistencyLogger = logger.child({ name: 'consistencyWorker' });
const QUEUE_NAME = 'consistency-check';

// Instantiate the Queue for scheduling
const consistencyQueue = new Queue(QUEUE_NAME, {
  connection: {
    host: cfg.REDIS_HOST,
    port: cfg.REDIS_PORT,
    password: cfg.REDIS_PASSWORD,
    tls: cfg.REDIS_TLS ? {} : undefined,
  },
});

export const scheduleConsistencyCheck = async () => {
    // Schedule the job to run every hour
    await consistencyQueue.add('check', { autoRepair: true }, {
        repeat: {
            pattern: '0 * * * *', // Every hour
        },
        jobId: 'hourly-consistency-check' // Ensures singleton
    });
    consistencyLogger.info('Scheduled hourly consistency check');
};

export const startConsistencyWorker = () => {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      consistencyLogger.info('Starting scheduled consistency check');
      const pg = getPostgresPool();
      const neo4j = getNeo4jDriver();
      const service = new GraphConsistencyService(pg, neo4j);
      const store = new ConsistencyStore();

      try {
        const reports = await service.runGlobalCheck();

        // Save reports to Redis for the API to consume
        await store.saveReports(reports);

        // Auto-repair if configured
        if (job.data.autoRepair) {
             let repairedCount = 0;
             for (const report of reports) {
                 if (report.status === 'drifted') {
                     consistencyLogger.info({ investigationId: report.investigationId }, 'Auto-repairing drift');
                     await service.repairInvestigation(report.investigationId, report.tenantId, report);
                     repairedCount++;
                 }
             }
             if (repairedCount > 0) {
                 // Refresh reports after repair
                 const newReports = await service.runGlobalCheck();
                 await store.saveReports(newReports);
             }
        }

        return { checked: reports.length, drifted: reports.filter(r => r.status === 'drifted').length };
      } catch (err: any) {
        consistencyLogger.error(err, 'Consistency check failed');
        throw err;
      }
    },
    {
      connection: {
        host: cfg.REDIS_HOST,
        port: cfg.REDIS_PORT,
        password: cfg.REDIS_PASSWORD,
        tls: cfg.REDIS_TLS ? {} : undefined,
      },
    },
  );

  worker.on('completed', (job: any) => {
    consistencyLogger.info({ jobId: job.id, returnvalue: job.returnvalue }, 'Consistency check completed');
  });

  worker.on('failed', (job, err) => {
    consistencyLogger.error({ jobId: job?.id, err }, 'Consistency check failed');
  });

  return worker;
};

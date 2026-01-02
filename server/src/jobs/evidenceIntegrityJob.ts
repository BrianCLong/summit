import * as cron from 'node-cron';
import pino from 'pino';
import { evidenceIntegrityService } from '../evidence/integrity-service.js';

const logger = (pino as any)({ name: 'EvidenceIntegrityJob' });
const cronExpression = process.env.EVIDENCE_INTEGRITY_CRON || '0 2 * * *';
const chunkSize = Number(process.env.EVIDENCE_INTEGRITY_CHUNK || '50');
const rateLimitPerSecond = Number(process.env.EVIDENCE_INTEGRITY_RPS || '5');

export function startEvidenceIntegrityJob() {
  if (process.env.EVIDENCE_INTEGRITY !== 'true') {
    logger.info('Evidence integrity job disabled via EVIDENCE_INTEGRITY flag');
    return;
  }

  cron.schedule(cronExpression, async () => {
    try {
      const result = await evidenceIntegrityService.verifyAll({
        chunkSize,
        rateLimitPerSecond,
        emitIncidents: process.env.EVIDENCE_INTEGRITY_INCIDENTS === 'true',
      });
      logger.info({ cronExpression, ...result }, 'Evidence integrity verification completed');
    } catch (error: any) {
      logger.error({ err: error }, 'Evidence integrity verification job failed');
    }
  });

  logger.info({ cronExpression }, 'Evidence integrity job scheduled');
}

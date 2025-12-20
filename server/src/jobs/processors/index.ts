import { workerManager } from '../../queue/worker.js';
import { QueueName } from '../../queue/types.js';
import { retentionProcessor } from './retentionProcessor.js';
import pino from 'pino';

const logger = pino({ name: 'processors-init' });

export function initializeProcessors() {
  logger.info('Initializing job processors...');

  workerManager.registerWorker(QueueName.RETENTION, retentionProcessor);

  logger.info('Job processors initialized.');
}

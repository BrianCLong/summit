
import * as cron from 'node-cron';
import logger from '../config/logger.js';
import { GraphConsistencyService } from '../services/GraphConsistencyService.js';

/**
 * Weekly job: Check graph consistency and generate report
 * Runs at 12:00 PM every Sunday
 */
export function scheduleWeeklyGraphConsistencyCheck(service: GraphConsistencyService) {
  // Run at 12:00 PM every Sunday
  cron.schedule('0 12 * * 0', async () => {
    logger.info('Starting weekly graph consistency check');

    try {
      const report = await service.generateWeeklyReport();
      logger.info('Graph consistency report generated', { report });

      // In a real system, we might email this report or store it in DB
    } catch (error) {
      logger.error('Failed to run graph consistency check', { error });
    }
  });

  logger.info('Scheduled weekly graph consistency check (Sundays 12:00 PM)');
}

import * as cron from 'node-cron';
import { Pool } from 'pg';
import logger from '../config/logger.js';
import { CaseOverviewService } from '../cases/overview/CaseOverviewService.js';

export function scheduleCaseOverviewCacheRefresh(
  pg: Pool,
  cronExpression = '*/5 * * * *',
  batchSize = 100,
) {
  const service = new CaseOverviewService(pg);

  const task = cron.schedule(cronExpression, async () => {
    try {
      const refreshed = await service.refreshStale(batchSize);
      logger.info(
        { refreshed, cronExpression, batchSize },
        'Refreshed stale case overview cache entries',
      );
    } catch (error: any) {
      logger.error({ error }, 'Failed to refresh case overview cache');
    }
  });

  logger.info({ cronExpression }, 'Scheduled case overview cache refresh job');
  return task;
}

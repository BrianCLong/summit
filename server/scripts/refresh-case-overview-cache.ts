import { getPostgresPool } from '../src/db/postgres.js';
import logger from '../src/config/logger.js';
import { CaseOverviewRefreshJob } from '../src/cases/overview/CaseOverviewRefreshJob.js';

async function main() {
  const pg = getPostgresPool();
  const job = new CaseOverviewRefreshJob(pg);
  const result = await job.run();
  logger.info(result, 'Refreshed expired or stale case overview cache entries');
  await pg.end();
}

main().catch((error) => {
  logger.error({ error }, 'Failed to refresh case overview cache');
  process.exit(1);
});

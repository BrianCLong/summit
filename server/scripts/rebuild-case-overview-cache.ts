import { getPostgresPool } from '../src/db/postgres.js';
import logger from '../src/config/logger.js';
import { CaseOverviewService } from '../src/cases/overview/CaseOverviewService.js';

async function main() {
  const pg = getPostgresPool();
  const service = new CaseOverviewService(pg);
  const count = await service.rebuildAll();
  logger.info({ count }, 'Rebuilt case overview cache entries');
  await pg.end();
}

main().catch((error) => {
  logger.error({ error }, 'Failed to rebuild case overview cache');
  process.exit(1);
});

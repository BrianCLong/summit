import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';
import logger from '../config/logger.js';
import { getPostgresPool } from '../db/postgres.js';
import { CaseOverviewService } from '../cases/overview/CaseOverviewService.js';

interface CommandArgs {
  _: (string | number)[];
  limit: number;
  caseId?: string;
  tenantId?: string;
  $0: string;
}

async function run(): Promise<void> {
  const argv = await yargs(hideBin(process.argv))
    .scriptName('case-overview-cache')
    .command<CommandArgs>(
      'rebuild [limit]',
      'Rebuild the materialized overview cache for recent cases',
      (cmd) =>
        cmd
          .positional('limit', {
            type: 'number',
            default: 500,
            describe: 'Maximum cases to rebuild',
          })
          .example('$0 rebuild 100', 'Rebuild up to 100 cache entries'),
    )
    .command<CommandArgs>(
      'refresh-stale [limit]',
      'Refresh expired or stale overview cache rows',
      (cmd) =>
        cmd
          .positional('limit', {
            type: 'number',
            default: 50,
            describe: 'Maximum stale entries to refresh in one run',
          })
          .example('$0 refresh-stale', 'Refresh stale cache rows in batches of 50'),
    )
    .command<CommandArgs>(
      'mark-stale <caseId> <tenantId>',
      'Mark a cache entry as stale to trigger SWR refresh',
      (cmd) =>
        cmd
          .positional('caseId', { type: 'string', demandOption: true })
          .positional('tenantId', { type: 'string', demandOption: true }),
    )
    .demandCommand(1)
    .help()
    .parseAsync();

  const pg = getPostgresPool();
  const service = new CaseOverviewService(pg);
  const command = argv._[0];

  try {
    if (command === 'rebuild') {
      const rebuilt = await service.rebuildAll(argv.limit ?? 500);
      logger.info({ rebuilt }, 'Case overview cache rebuild complete');
    } else if (command === 'refresh-stale') {
      const refreshed = await service.refreshStale(argv.limit ?? 50);
      logger.info({ refreshed }, 'Case overview cache stale refresh complete');
    } else if (command === 'mark-stale') {
      await service.markStale(argv.caseId!, argv.tenantId!);
      logger.info({ caseId: argv.caseId, tenantId: argv.tenantId }, 'Marked cache row as stale');
    }
  } finally {
    await pg.end();
  }
}

void run();

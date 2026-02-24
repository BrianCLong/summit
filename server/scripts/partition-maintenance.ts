import { Client } from 'pg';
import 'dotenv/config';
import { PartitionMaintenanceService } from '../src/services/PartitionMaintenanceService.js';
import { logger } from '../src/config/logger.js';

interface CliOptions {
  tenantId?: string;
  monthsAhead: number;
  retentionMonths: number;
  dryRun?: boolean;
}

function parseArgs(): CliOptions {
  const argv = process.argv.slice(2);
  const opts: CliOptions = {
    tenantId: process.env.TENANT_ID,
    monthsAhead: Number(process.env.DB_PARTITION_MONTHS_AHEAD || 2),
    retentionMonths: Number(process.env.DB_PARTITION_RETENTION_MONTHS || 18),
    dryRun: process.env.DRY_RUN === '1',
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--tenant' || arg === '-t') {
      opts.tenantId = argv[++i];
    } else if (arg === '--months-ahead') {
      opts.monthsAhead = Number(argv[++i]);
    } else if (arg === '--retention-months') {
      opts.retentionMonths = Number(argv[++i]);
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
    }
  }

  return opts;
}

async function run() {
  const options = parseArgs();
  const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!connStr) {
    throw new Error('Set DATABASE_URL or POSTGRES_URL to run partition maintenance');
  }

  const client = new Client({ connectionString: connStr });
  await client.connect();

  const service = new PartitionMaintenanceService(client);

  try {
    if (options.dryRun) {
      logger.info(
        `Dry run: would ensure partitions for ${
          options.tenantId ? `tenant ${options.tenantId}` : 'all tenants'
        } with monthsAhead=${options.monthsAhead}, retentionMonths=${options.retentionMonths}`,
      );
      await service.archiveOldPartitions(options.retentionMonths, true);
      return;
    }

    await service.ensurePartitions(options.tenantId, options.monthsAhead, options.retentionMonths);

    // Archive old partitions strategy
    await service.archiveOldPartitions(options.retentionMonths, false);

    // Metrics display (kept from original script)
    try {
        const metrics = await client.query(
        `SELECT partition_name, total_pretty, bounds
        FROM event_store_partition_metrics
        ORDER BY total_bytes DESC
        LIMIT 15`,
        );
        console.table(metrics.rows);
    } catch (e) {
        logger.warn('Could not fetch partition metrics (view might not exist)');
    }

  } finally {
    await client.end();
  }
}

if (require.main === module) {
  run().catch((err) => {
    console.error('Partition maintenance failed', err);
    process.exit(1);
  });
}

import { Client } from 'pg';
import 'dotenv/config';

interface CliOptions {
  tenantId?: string;
  monthsAhead: number;
  retentionMonths: number;
  dryRun?: boolean;
  planOnly?: boolean;
}

interface PartitionPlanAction {
  type: 'ensure_event_store_partitions';
  scope: 'single-tenant' | 'all-tenants';
  tenantId?: string;
  monthsAhead: number;
  retentionMonths: number;
  window: string[];
}

export interface PartitionPlan {
  generatedAt: string;
  actions: PartitionPlanAction[];
}

function parseArgs(): CliOptions {
  const argv = process.argv.slice(2);
  const opts: CliOptions = {
    tenantId: process.env.TENANT_ID,
    monthsAhead: Number(process.env.DB_PARTITION_MONTHS_AHEAD || 2),
    retentionMonths: Number(process.env.DB_PARTITION_RETENTION_MONTHS || 18),
    dryRun: process.env.DRY_RUN === '1',
    planOnly: false,
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
    } else if (arg === '--plan') {
      opts.planOnly = true;
    }
  }

  return opts;
}

export function buildPartitionPlan(options: CliOptions, now = new Date()): PartitionPlan {
  const boundedMonthsAhead = Math.min(Math.max(options.monthsAhead, 0), 12);
  const window: string[] = [];

  for (let i = 0; i <= boundedMonthsAhead; i++) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    const descriptor = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    window.push(descriptor);
  }

  const tenantId = options.tenantId?.replace(/[^a-zA-Z0-9_-]/g, '') || undefined;

  const action: PartitionPlanAction = {
    type: 'ensure_event_store_partitions',
    scope: tenantId ? 'single-tenant' : 'all-tenants',
    tenantId,
    monthsAhead: boundedMonthsAhead,
    retentionMonths: options.retentionMonths,
    window,
  };

  return {
    generatedAt: now.toISOString(),
    actions: [action],
  };
}

async function run() {
  const options = parseArgs();
  const plan = buildPartitionPlan(options);
  const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!connStr) {
    throw new Error('Set DATABASE_URL or POSTGRES_URL to run partition maintenance');
  }

  const client = new Client({ connectionString: connStr });
  await client.connect();

  try {
    const planJson = JSON.stringify(plan, null, 2);

    if (options.dryRun || options.planOnly) {
      console.log(planJson);
      return;
    }

    const tableExists = await client.query(
      `SELECT to_regclass('event_store') AS exists`,
    );

    if (!tableExists.rows[0]?.exists) {
      console.log('event_store table is missing; skipping partition maintenance to avoid destructive operations');
      return;
    }

    if (options.tenantId) {
      await client.query(
        'SELECT ensure_event_store_partition($1, $2, $3)',
        [options.tenantId, plan.actions[0].monthsAhead, plan.actions[0].retentionMonths],
      );
      console.log(`✅ ensured partitions for tenant ${options.tenantId}`);
    } else {
      const { rows } = await client.query(
        'SELECT ensure_event_store_partitions_for_all($1, $2) AS tenants_touched',
        [plan.actions[0].monthsAhead, plan.actions[0].retentionMonths],
      );
      console.log(
        `✅ ensured partitions for ${rows[0]?.tenants_touched ?? 0} tenants (or existing event_store tenants)`,
      );
    }

    const metrics = await client.query(
      `SELECT partition_name, total_pretty, bounds
       FROM event_store_partition_metrics
       ORDER BY total_bytes DESC
       LIMIT 15`,
    );

    console.table(metrics.rows);
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

import { Gauge, register } from 'prom-client';
import type { ManagedPostgresPool } from './postgres.js';
import { getPostgresPool } from './postgres.js';
import { appLogger } from '../logging/structuredLogger.js';

type QueryablePool = Pick<ManagedPostgresPool, 'query'>;

export type BloatEstimate = {
  schema: string;
  name: string;
  kind: 'table' | 'index';
  sizeBytes: number;
  bloatBytes: number;
  bloatPct: number;
  deadTuples: number;
  liveTuples: number;
  method: 'pgstattuple' | 'heuristic';
  sourceRelation?: string;
};

export type VacuumStat = {
  schema: string;
  name: string;
  deadTuples: number;
  liveTuples: number;
  lastVacuum: string | null;
  lastAutovacuum: string | null;
  lastAnalyze: string | null;
  lastAutoanalyze: string | null;
  vacuumTrigger: number;
  analyzeTrigger: number;
  vacuumDebt: number;
  xidAge: number;
  wraparoundRisk: boolean;
};

export type EnvironmentRecommendation = {
  environment: 'dev' | 'stage' | 'prod';
  settings: Record<string, string>;
  rationale: string[];
};

export type DbHealthReport = {
  generatedAt: string;
  usedPgstattuple: boolean;
  bloat: {
    method: 'pgstattuple' | 'heuristic';
    tables: BloatEstimate[];
    indexes: BloatEstimate[];
    notes: string[];
  };
  autovacuum: {
    stats: VacuumStat[];
    freezeMaxAge: number;
  };
  alerts: string[];
  recommendations: {
    autovacuumProfiles: EnvironmentRecommendation[];
    migrationFreeConfig: string[];
    targetedActions: string[];
  };
  observability: {
    metrics: string[];
    logReference: string;
  };
};

export type DbHealthOptions = {
  pool?: QueryablePool;
  limit?: number;
  useExtensions?: boolean;
  now?: Date;
};

type PgstattupleRow = {
  schema: string;
  name: string;
  table_len: string | number;
  dead_tuple_len: string | number;
  dead_tuple_count: string | number;
  tuple_count: string | number;
  relkind: 'r' | 'm' | 'i';
  table_name?: string;
};

type VacuumRow = {
  schema: string;
  name: string;
  n_dead_tup: string | number;
  n_live_tup: string | number;
  last_vacuum: string | null;
  last_autovacuum: string | null;
  last_analyze: string | null;
  last_autoanalyze: string | null;
  vacuum_trigger: string | number;
  analyze_trigger: string | number;
  xid_age: string | number;
  freeze_max_age: string | number;
};

const DB_HEALTH_JSON_START = 'BEGIN_DB_HEALTH_JSON';
const DB_HEALTH_JSON_END = 'END_DB_HEALTH_JSON';

const autovacuumProfiles: EnvironmentRecommendation[] = [
  {
    environment: 'dev',
    settings: {
      autovacuum_vacuum_scale_factor: '0.2',
      autovacuum_analyze_scale_factor: '0.1',
      autovacuum_naptime: '20s',
      log_autovacuum_min_duration: '0',
    },
    rationale: [
      'Keep feedback loops short in developer sandboxes.',
      'Surface noisy tables quickly without overwhelming small environments.',
    ],
  },
  {
    environment: 'stage',
    settings: {
      autovacuum_vacuum_scale_factor: '0.08',
      autovacuum_analyze_scale_factor: '0.05',
      autovacuum_naptime: '15s',
      autovacuum_max_workers: '5',
      vacuum_cost_limit: '400',
      vacuum_cost_delay: '10ms',
    },
    rationale: [
      'Tighter thresholds to mirror production traffic without risking wraparound.',
      'Bounded cost parameters to protect shared staging instances.',
    ],
  },
  {
    environment: 'prod',
    settings: {
      autovacuum_vacuum_scale_factor: '0.04',
      autovacuum_analyze_scale_factor: '0.02',
      autovacuum_naptime: '10s',
      autovacuum_max_workers: '10',
      vacuum_cost_limit: '800',
      log_autovacuum_min_duration: '1s',
    },
    rationale: [
      'Aggressive thresholds to avoid vacuum debt and wraparound risk.',
      'Log long-running autovacuum tasks for observability without flooding logs.',
    ],
  },
];

const metrics = {
  bloatPct: getOrCreateGauge('db_health_bloat_percent', 'Estimated relation bloat percent', [
    'schema',
    'relation',
    'kind',
  ]),
  vacuumDebt: getOrCreateGauge(
    'db_health_vacuum_dead_tuples_over_threshold',
    'Dead tuples above the autovacuum trigger',
    ['schema', 'relation'],
  ),
  xidAge: getOrCreateGauge(
    'db_health_relation_xid_age',
    'Age of relation relfrozenxid relative to autovacuum_freeze_max_age',
    ['schema', 'relation'],
  ),
};

function getOrCreateGauge(
  name: string,
  help: string,
  labelNames: string[],
): Gauge<string> {
  const existing = register.getSingleMetric(name) as Gauge<string> | undefined;
  if (existing) {
    return existing;
  }

  return new Gauge({
    name,
    help,
    labelNames,
  });
}

function asNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function pgstattupleAvailable(pool: QueryablePool): Promise<boolean> {
  try {
    const result = await pool.query<{ exists: boolean }>(
      "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgstattuple')",
    );
    return Boolean(result.rows[0]?.exists);
  } catch (error: any) {
    appLogger?.warn(
      { err: error },
      'Failed to check for pgstattuple extension availability',
    );
    return false;
  }
}

async function collectPgstattupleBloat(
  pool: QueryablePool,
  limit: number,
): Promise<{ tables: BloatEstimate[]; indexes: BloatEstimate[] }> {
  const tablesResult = await pool.query<PgstattupleRow>(
    `
    WITH targets AS (
      SELECT c.oid AS relid, n.nspname AS schema, c.relname AS name, c.relkind
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind IN ('r', 'm')
        AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY pg_total_relation_size(c.oid) DESC
      LIMIT $1
    )
    SELECT schema,
           name,
           relkind,
           stats.table_len,
           stats.dead_tuple_len,
           stats.dead_tuple_count,
           stats.tuple_count
    FROM targets
    CROSS JOIN LATERAL pgstattuple(relid) AS stats;
  `,
    [limit],
  );

  const indexesResult = await pool.query<PgstattupleRow>(
    `
    WITH idx AS (
      SELECT i.oid AS relid,
             n.nspname AS schema,
             i.relname AS name,
             t.relname AS table_name
      FROM pg_class i
      JOIN pg_index ix ON ix.indexrelid = i.oid
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_namespace n ON n.oid = i.relnamespace
      WHERE i.relkind = 'i'
        AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY pg_relation_size(i.oid) DESC
      LIMIT $1
    )
    SELECT schema,
           name,
           'i'::text AS relkind,
           table_name,
           stats.table_len,
           stats.dead_tuple_len,
           stats.dead_tuple_count,
           stats.tuple_count
    FROM idx
    CROSS JOIN LATERAL pgstattuple(relid) AS stats;
  `,
    [limit],
  );

  const tables = tablesResult.rows.map((row: any) => toBloatEstimate(row, 'pgstattuple'));
  const indexes = indexesResult.rows.map((row: any) =>
    toBloatEstimate({ ...row, sourceRelation: row.table_name ?? row.name }, 'pgstattuple', 'index'),
  );

  return { tables, indexes };
}

async function collectHeuristicBloat(
  pool: QueryablePool,
  limit: number,
): Promise<{ tables: BloatEstimate[]; indexes: BloatEstimate[] }> {
  const tablesResult = await pool.query<PgstattupleRow>(
    `
    SELECT
      n.nspname AS schema,
      c.relname AS name,
      'r'::text AS relkind,
      pg_total_relation_size(c.oid) AS table_len,
      LEAST(
        pg_total_relation_size(c.oid),
        COALESCE(s.n_dead_tup, 0) * current_setting('block_size')::numeric
      ) AS dead_tuple_len,
      COALESCE(s.n_dead_tup, 0) AS dead_tuple_count,
      COALESCE(s.n_live_tup, 0) + COALESCE(s.n_dead_tup, 0) AS tuple_count
    FROM pg_stat_all_tables s
    JOIN pg_class c ON c.oid = s.relid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
    ORDER BY dead_tuple_count DESC, table_len DESC
    LIMIT $1;
  `,
    [limit],
  );

  const indexesResult = await pool.query<PgstattupleRow>(
    `
    SELECT
      n.nspname AS schema,
      i.relname AS name,
      'i'::text AS relkind,
      t.relname AS table_name,
      pg_relation_size(i.oid) AS table_len,
      GREATEST(pg_relation_size(i.oid) * (1 - NULLIF(si.idx_tup_fetch, 0) / GREATEST(si.idx_tup_read, 1)), 0) AS dead_tuple_len,
      GREATEST(si.idx_tup_read - si.idx_tup_fetch, 0) AS dead_tuple_count,
      GREATEST(si.idx_tup_read, 0) AS tuple_count
    FROM pg_class i
    JOIN pg_index ix ON ix.indexrelid = i.oid
    JOIN pg_class t ON t.oid = ix.indrelid
    JOIN pg_namespace n ON n.oid = i.relnamespace
    LEFT JOIN pg_stat_all_indexes si ON si.indexrelid = i.oid
    WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
    ORDER BY dead_tuple_len DESC, table_len DESC
    LIMIT $1;
  `,
    [limit],
  );

  const tables = tablesResult.rows.map((row: any) => toBloatEstimate(row, 'heuristic'));
  const indexes = indexesResult.rows.map((row: any) =>
    toBloatEstimate({ ...row, sourceRelation: row.table_name ?? row.name }, 'heuristic', 'index'),
  );

  return { tables, indexes };
}

function toBloatEstimate(
  row: PgstattupleRow & { sourceRelation?: string },
  method: 'pgstattuple' | 'heuristic',
  kind: 'table' | 'index' = row.relkind === 'i' ? 'index' : 'table',
): BloatEstimate {
  const sizeBytes = asNumber(row.table_len);
  const deadBytes = Math.max(asNumber(row.dead_tuple_len), 0);
  const liveTuples = Math.max(asNumber(row.tuple_count) - asNumber(row.dead_tuple_count), 0);
  const bloatPct = sizeBytes > 0 ? Math.min(100, (deadBytes / sizeBytes) * 100) : 0;

  return {
    schema: row.schema,
    name: row.name,
    kind,
    sizeBytes,
    bloatBytes: deadBytes,
    bloatPct: Math.round(bloatPct * 100) / 100,
    deadTuples: asNumber(row.dead_tuple_count),
    liveTuples,
    method,
    sourceRelation: row.sourceRelation,
  };
}

async function collectAutovacuumStats(
  pool: QueryablePool,
  limit: number,
  now: Date,
): Promise<{ stats: VacuumStat[]; freezeMaxAge: number }> {
  const result = await pool.query<VacuumRow>(
    `
    WITH params AS (
      SELECT
        current_setting('autovacuum_vacuum_threshold', true)::numeric AS vacuum_base,
        current_setting('autovacuum_vacuum_scale_factor', true)::numeric AS vacuum_scale,
        current_setting('autovacuum_analyze_threshold', true)::numeric AS analyze_base,
        current_setting('autovacuum_analyze_scale_factor', true)::numeric AS analyze_scale,
        COALESCE(current_setting('autovacuum_freeze_max_age', true), '200000000')::numeric AS freeze_max_age
    )
    SELECT
      n.nspname AS schema,
      c.relname AS name,
      COALESCE(s.n_dead_tup, 0) AS n_dead_tup,
      COALESCE(s.n_live_tup, 0) AS n_live_tup,
      s.last_vacuum,
      s.last_autovacuum,
      s.last_analyze,
      s.last_autoanalyze,
      (SELECT vacuum_base + vacuum_scale * c.reltuples FROM params) AS vacuum_trigger,
      (SELECT analyze_base + analyze_scale * c.reltuples FROM params) AS analyze_trigger,
      age(c.relfrozenxid) AS xid_age,
      (SELECT freeze_max_age FROM params) AS freeze_max_age
    FROM pg_stat_all_tables s
    JOIN pg_class c ON c.oid = s.relid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
    ORDER BY COALESCE(s.n_dead_tup, 0) DESC
    LIMIT $1;
  `,
    [limit],
  );

  const freezeMaxAge = asNumber(result.rows[0]?.freeze_max_age) || 200_000_000;

  const stats = result.rows.map((row: any) => {
    const vacuumTrigger = asNumber(row.vacuum_trigger);
    const analyzeTrigger = asNumber(row.analyze_trigger);
    const vacuumDebt = Math.max(asNumber(row.n_dead_tup) - vacuumTrigger, 0);
    const xidAge = asNumber(row.xid_age);
    const wraparoundRisk = xidAge >= freezeMaxAge * 0.8;

    return {
      schema: row.schema,
      name: row.name,
      deadTuples: asNumber(row.n_dead_tup),
      liveTuples: asNumber(row.n_live_tup),
      lastVacuum: row.last_vacuum,
      lastAutovacuum: row.last_autovacuum,
      lastAnalyze: row.last_analyze,
      lastAutoanalyze: row.last_autoanalyze,
      vacuumTrigger,
      analyzeTrigger,
      vacuumDebt,
      xidAge,
      wraparoundRisk,
    };
  });

  const nowIso = now.toISOString();
  appLogger?.info(
    { at: nowIso, tables: stats.length },
    'Collected autovacuum/analyze cadence',
  );

  return { stats, freezeMaxAge };
}

function emitMetrics(
  bloat: { tables: BloatEstimate[]; indexes: BloatEstimate[] },
  autovacuum: { stats: VacuumStat[]; freezeMaxAge: number },
): void {
  [...bloat.tables, ...bloat.indexes].forEach((estimate) => {
    metrics.bloatPct
      .labels(estimate.schema, estimate.name, estimate.kind)
      .set(estimate.bloatPct);
  });

  autovacuum.stats.forEach((stat) => {
    metrics.vacuumDebt
      .labels(stat.schema, stat.name)
      .set(Math.max(stat.vacuumDebt, 0));
    metrics.xidAge.labels(stat.schema, stat.name).set(stat.xidAge);
  });
}

function buildAlerts(
  bloat: { tables: BloatEstimate[]; indexes: BloatEstimate[] },
  autovacuum: { stats: VacuumStat[]; freezeMaxAge: number },
): string[] {
  const alerts: string[] = [];

  bloat.tables
    .filter((table) => table.bloatPct >= 20)
    .slice(0, 5)
    .forEach((table) => {
      alerts.push(
        `Table ${table.schema}.${table.name} has ${table.bloatPct.toFixed(
          2,
        )}% bloat (${table.deadTuples} dead tuples).`,
      );
    });

  bloat.indexes
    .filter((index) => index.bloatPct >= 30)
    .slice(0, 5)
    .forEach((index) => {
      alerts.push(
        `Index ${index.schema}.${index.name} on ${index.sourceRelation ?? 'table'} has ${index.bloatPct.toFixed(
          2,
        )}% suspected bloat.`,
      );
    });

  autovacuum.stats
    .filter((stat) => stat.vacuumDebt > 0)
    .slice(0, 5)
    .forEach((stat) => {
      alerts.push(
        `Vacuum debt: ${stat.schema}.${stat.name} has ${stat.deadTuples} dead tuples (trigger ${Math.round(
          stat.vacuumTrigger,
        )}).`,
      );
    });

  autovacuum.stats
    .filter((stat) => stat.wraparoundRisk)
    .slice(0, 5)
    .forEach((stat) => {
      alerts.push(
        `Transaction ID wraparound risk for ${stat.schema}.${stat.name}: age ${stat.xidAge} vs freeze_max_age ${autovacuum.freezeMaxAge}.`,
      );
    });

  autovacuum.stats
    .filter((stat) => !stat.lastAutovacuum)
    .slice(0, 3)
    .forEach((stat) => {
      alerts.push(
        `No autovacuum history for ${stat.schema}.${stat.name}; ensure autovacuum is enabled or tuned for this table.`,
      );
    });

  return alerts;
}

function buildTargetedActions(
  bloat: { tables: BloatEstimate[]; indexes: BloatEstimate[] },
  autovacuum: VacuumStat[],
): string[] {
  const actions: string[] = [];

  bloat.tables.slice(0, 3).forEach((table) => {
    actions.push(
      `VACUUM (ANALYZE) "${table.schema}"."${table.name}" -- ${table.bloatPct.toFixed(2)}% bloat`,
    );
  });

  bloat.indexes.slice(0, 3).forEach((index) => {
    actions.push(
      `REINDEX INDEX CONCURRENTLY "${index.schema}"."${index.name}" -- suspected ${index.bloatPct.toFixed(
        2,
      )}% index bloat`,
    );
  });

  autovacuum
    .filter((stat) => stat.vacuumDebt > 0)
    .slice(0, 3)
    .forEach((stat) => {
      actions.push(
        `Increase autovacuum for "${stat.schema}"."${stat.name}" by lowering reloptions: ALTER TABLE "${stat.schema}"."${stat.name}" SET (autovacuum_vacuum_scale_factor = 0.05);`,
      );
    });

  return actions;
}

function buildMigrationFreeConfig(): string[] {
  return [
    'ALTER SYSTEM SET autovacuum_vacuum_scale_factor = \'0.08\'; -- reloadable without schema changes',
    'ALTER SYSTEM SET autovacuum_analyze_scale_factor = \'0.05\';',
    'SELECT pg_reload_conf();',
    'For a single table: ALTER TABLE <schema>.<table> SET (autovacuum_vacuum_scale_factor = 0.05, autovacuum_analyze_scale_factor = 0.03);',
    'Enable pgstattuple safely when permitted: CREATE EXTENSION IF NOT EXISTS pgstattuple;',
  ];
}

export async function generateDbHealthReport(
  options: DbHealthOptions = {},
): Promise<DbHealthReport> {
  const pool = options.pool ?? getPostgresPool();
  const limit = options.limit ?? 10;
  const allowExtensions = options.useExtensions ?? process.env.DB_HEALTH === '1';
  const now = options.now ?? new Date();

  let usedPgstattuple = false;
  let bloatNotes: string[] = [];
  let bloatEstimates: { tables: BloatEstimate[]; indexes: BloatEstimate[] };

  const extensionAvailable = allowExtensions && (await pgstattupleAvailable(pool));

  if (extensionAvailable) {
    try {
      bloatEstimates = await collectPgstattupleBloat(pool, limit);
      usedPgstattuple = true;
    } catch (error: any) {
      bloatNotes.push(
        'pgstattuple is enabled but could not be queried; falling back to heuristic estimates.',
      );
      appLogger?.warn(
        { err: error },
        'pgstattuple query failed, using heuristic bloat estimates',
      );
      bloatEstimates = await collectHeuristicBloat(pool, limit);
    }
  } else {
    bloatNotes.push(
      allowExtensions
        ? 'pgstattuple extension not installed; using heuristic bloat estimates.'
        : 'DB_HEALTH is not enabled; using lightweight heuristic bloat estimates.',
    );
    bloatEstimates = await collectHeuristicBloat(pool, limit);
  }

  const autovacuum = await collectAutovacuumStats(pool, limit, now);
  emitMetrics(bloatEstimates, autovacuum);

  const alerts = buildAlerts(bloatEstimates, autovacuum);
  const targetedActions = buildTargetedActions(
    bloatEstimates,
    autovacuum.stats,
  );

  const report: DbHealthReport = {
    generatedAt: now.toISOString(),
    usedPgstattuple,
    bloat: {
      method: usedPgstattuple ? 'pgstattuple' : 'heuristic',
      tables: bloatEstimates.tables,
      indexes: bloatEstimates.indexes,
      notes: bloatNotes,
    },
    autovacuum,
    alerts,
    recommendations: {
      autovacuumProfiles,
      migrationFreeConfig: buildMigrationFreeConfig(),
      targetedActions,
    },
    observability: {
      metrics: [
        metrics.bloatPct.name,
        metrics.vacuumDebt.name,
        metrics.xidAge.name,
      ],
      logReference: 'db.health',
    },
  };

  appLogger?.info(
    {
      event: 'db.health',
      usedPgstattuple,
      alerts: alerts.length,
      topTables: bloatEstimates.tables.slice(0, 3).map((t) => `${t.schema}.${t.name}`),
    },
    'DB health report generated',
  );

  return report;
}

export function formatDbHealthReport(report: DbHealthReport): string {
  const lines: string[] = [];
  lines.push('📊 Database Health Report');
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push(`Bloat method: ${report.bloat.method}`);
  lines.push('');

  lines.push('Top table bloat:');
  report.bloat.tables.slice(0, 5).forEach((table) => {
    lines.push(
      `- ${table.schema}.${table.name}: ${table.bloatPct.toFixed(
        2,
      )}% bloat (${table.deadTuples} dead tuples)`,
    );
  });

  lines.push('');
  lines.push('Top index bloat:');
  report.bloat.indexes.slice(0, 5).forEach((index) => {
    lines.push(
      `- ${index.schema}.${index.name} on ${index.sourceRelation ?? 'n/a'}: ${index.bloatPct.toFixed(
        2,
      )}% suspected bloat`,
    );
  });

  lines.push('');
  lines.push('Autovacuum debt:');
  report.autovacuum.stats.slice(0, 5).forEach((stat) => {
    lines.push(
      `- ${stat.schema}.${stat.name}: dead tuples ${stat.deadTuples} (trigger ${Math.round(
        stat.vacuumTrigger,
      )}), last autovacuum ${stat.lastAutovacuum ?? 'never'}`,
    );
  });

  lines.push('');
  lines.push('Recommended actions:');
  report.recommendations.targetedActions.forEach((action) => {
    lines.push(`- ${action}`);
  });

  lines.push('');
  lines.push('Autovacuum profiles:');
  report.recommendations.autovacuumProfiles.forEach((profile) => {
    lines.push(
      `- ${profile.environment}: ${Object.entries(profile.settings)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')}`,
    );
  });

  lines.push('');
  lines.push(DB_HEALTH_JSON_START);
  lines.push(JSON.stringify(report, null, 2));
  lines.push(DB_HEALTH_JSON_END);

  return lines.join('\n');
}

export function parseDbHealthOutput(output: string): DbHealthReport {
  const start = output.indexOf(DB_HEALTH_JSON_START);
  const end = output.indexOf(DB_HEALTH_JSON_END);

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No machine-readable DB health payload found in output.');
  }

  const jsonStart = output.indexOf('{', start);
  if (jsonStart === -1) {
    throw new Error('Malformed DB health output: JSON start not found.');
  }

  const jsonPayload = output.substring(jsonStart, end).trim();
  return JSON.parse(jsonPayload) as DbHealthReport;
}

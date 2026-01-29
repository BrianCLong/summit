import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import crypto from 'node:crypto';
import yaml from 'js-yaml';
import neo4j from 'neo4j-driver';
import pg from 'pg';

const { Pool } = pg;

const DEFAULT_CONFIG_PATH = 'config/governance/drift.yml';
const DEFAULT_OUT_DIR = 'artifacts/governance/graph-postgres-drift';
const DEFAULT_DETAIL_LIMIT = 25;

export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === '--') {
      continue;
    }
    if (current === '--config') {
      args.config = argv[++i];
      continue;
    }
    if (current.startsWith('--config=')) {
      args.config = current.split('=')[1];
      continue;
    }
    if (current === '--out') {
      args.out = argv[++i];
      continue;
    }
    if (current.startsWith('--out=')) {
      args.out = current.split('=')[1];
      continue;
    }
    if (current === '--entity') {
      args.entity = argv[++i];
      continue;
    }
    if (current.startsWith('--entity=')) {
      args.entity = current.split('=')[1];
      continue;
    }
    if (current === '--detail-limit') {
      args.detailLimit = Number(argv[++i]);
      continue;
    }
    if (current.startsWith('--detail-limit=')) {
      args.detailLimit = Number(current.split('=')[1]);
      continue;
    }
    if (current === '--help') {
      args.help = true;
      continue;
    }
    throw new Error(`Unknown arg: ${current}`);
  }
  return args;
}

function printHelp() {
  console.log('Usage: node scripts/ci/graph_postgres_drift_check.mjs [options]');
  console.log('');
  console.log('Options:');
  console.log(`  --config path         Config file (default: ${DEFAULT_CONFIG_PATH})`);
  console.log(`  --out path            Output directory (default: ${DEFAULT_OUT_DIR})`);
  console.log('  --entity name         Only run drift check for one entity');
  console.log(`  --detail-limit n      Max IDs in detail lists (default: ${DEFAULT_DETAIL_LIMIT})`);
}

export function loadConfig(configPath) {
  const raw = readFileSync(configPath, 'utf8');
  const parsed = yaml.load(raw);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Invalid YAML config at ${configPath}`);
  }
  return parsed;
}

function stableJson(value) {
  const normalize = (input) => {
    if (Array.isArray(input)) {
      return input.map(normalize);
    }
    if (input && typeof input === 'object') {
      return Object.keys(input)
        .sort()
        .reduce((acc, key) => {
          acc[key] = normalize(input[key]);
          return acc;
        }, {});
    }
    return input;
  };
  return JSON.stringify(normalize(value), null, 2);
}

function ensureNumber(value, label) {
  const result = Number(value);
  if (!Number.isFinite(result)) {
    throw new Error(`Expected numeric value for ${label}`);
  }
  return result;
}

export function computeCountDelta(postgresCount, neo4jCount) {
  const delta = Math.abs(postgresCount - neo4jCount);
  let deltaPct = 0;
  if (postgresCount === 0) {
    deltaPct = neo4jCount === 0 ? 0 : 100;
  } else {
    deltaPct = (delta / postgresCount) * 100;
  }
  return { delta, deltaPct };
}

export function computeDigestDiff(postgresRows, neo4jRows, detailLimit) {
  const limit = detailLimit ?? DEFAULT_DETAIL_LIMIT;
  const pgMap = new Map();
  for (const row of postgresRows) {
    pgMap.set(String(row.id), String(row.digest));
  }
  const neoMap = new Map();
  for (const row of neo4jRows) {
    neoMap.set(String(row.id), String(row.digest));
  }

  const missingInGraph = [];
  const mismatched = [];
  let missingCount = 0;
  let mismatchCount = 0;
  for (const [id, digest] of pgMap.entries()) {
    if (!neoMap.has(id)) {
      missingCount += 1;
      if (missingInGraph.length < limit) {
        missingInGraph.push(id);
      }
      continue;
    }
    const neoDigest = neoMap.get(id);
    if (neoDigest !== digest) {
      mismatchCount += 1;
      if (mismatched.length < limit) {
        mismatched.push({ id, postgres: digest, neo4j: neoDigest });
      }
    }
  }

  const extraInGraph = [];
  let extraCount = 0;
  for (const id of neoMap.keys()) {
    if (!pgMap.has(id)) {
      extraCount += 1;
      if (extraInGraph.length < limit) {
        extraInGraph.push(id);
      }
    }
  }

  return {
    missingInGraph,
    extraInGraph,
    mismatched,
    totals: {
      missing_in_graph: missingCount,
      extra_in_graph: extraCount,
      mismatched: mismatchCount
    }
  };
}

function buildThresholds(entityConfig, config) {
  const defaults = config.thresholds || {};
  const entityThresholds = entityConfig.thresholds || {};
  return {
    max_count_delta_pct: ensureNumber(
      entityThresholds.max_count_delta_pct ?? defaults.max_count_delta_pct ?? 0,
      'max_count_delta_pct'
    ),
    max_digest_mismatches: ensureNumber(
      entityThresholds.max_digest_mismatches ?? defaults.max_digest_mismatches ?? 0,
      'max_digest_mismatches'
    )
  };
}

function resolvePostgresConfig() {
  const connectionString =
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.PGURL ||
    undefined;
  if (connectionString) {
    return { connectionString };
  }
  if (!process.env.PGHOST) {
    throw new Error('Postgres connection not configured. Set POSTGRES_URL or PGHOST.');
  }
  return {
    host: process.env.PGHOST,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE
  };
}

function resolveNeo4jConfig() {
  const uri = process.env.NEO4J_URI || process.env.NEO4J_URL;
  const user = process.env.NEO4J_USER || process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;
  if (!uri || !user || !password) {
    throw new Error('Neo4j connection not configured. Set NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD.');
  }
  return { uri, user, password };
}

async function queryPostgres(pool, query, label) {
  const result = await pool.query(query);
  if (!result.rows || result.rows.length === 0) {
    throw new Error(`Postgres query returned no rows for ${label}`);
  }
  return result.rows;
}

async function queryNeo4j(driver, cypher, label) {
  const session = driver.session();
  try {
    const result = await session.run(cypher);
    if (result.records.length === 0) {
      throw new Error(`Neo4j query returned no rows for ${label}`);
    }
    return result.records.map(record => record.toObject());
  } finally {
    await session.close();
  }
}

function normalizeNeo4jValue(value) {
  if (value && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  return value;
}

function normalizeNeo4jRows(rows) {
  return rows.map(row => {
    const normalized = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[key] = normalizeNeo4jValue(value);
    }
    return normalized;
  });
}

function formatMetrics(report) {
  const metrics = {
    generated_at: report.metadata.generated_at,
    status: report.metadata.status,
    entities_checked: report.summary.entities_checked,
    violations: report.summary.violations
  };
  const lines = [];
  lines.push('# HELP summit_graph_postgres_drift_status Drift status (1=failed, 0=passed)');
  lines.push('# TYPE summit_graph_postgres_drift_status gauge');
  lines.push(`summit_graph_postgres_drift_status ${report.metadata.status === 'failed' ? 1 : 0}`);
  lines.push('# HELP summit_graph_postgres_drift_entities_checked Entities checked for drift');
  lines.push('# TYPE summit_graph_postgres_drift_entities_checked gauge');
  lines.push(`summit_graph_postgres_drift_entities_checked ${report.summary.entities_checked}`);
  lines.push('# HELP summit_graph_postgres_drift_violations Drift violations');
  lines.push('# TYPE summit_graph_postgres_drift_violations gauge');
  lines.push(`summit_graph_postgres_drift_violations ${report.summary.violations}`);

  for (const entity of report.entities) {
    const label = `entity="${entity.name}"`;
    lines.push('# HELP summit_graph_postgres_drift_count_delta_pct Count delta percentage');
    lines.push('# TYPE summit_graph_postgres_drift_count_delta_pct gauge');
    lines.push(`summit_graph_postgres_drift_count_delta_pct{${label}} ${entity.counts.delta_pct}`);
    lines.push('# HELP summit_graph_postgres_drift_digest_mismatches Digest mismatches');
    lines.push('# TYPE summit_graph_postgres_drift_digest_mismatches gauge');
    lines.push(`summit_graph_postgres_drift_digest_mismatches{${label}} ${entity.digest_summary.mismatched}`);
  }

  return { json: metrics, prom: lines.join('\n') };
}

export async function evaluateEntity(entityName, entityConfig, config, pool, driver, detailLimit) {
  const thresholds = buildThresholds(entityConfig, config);
  const pgCountRows = await queryPostgres(pool, entityConfig.postgres.count_query, `${entityName} count`);
  const pgCount = ensureNumber(pgCountRows[0].count, `${entityName} postgres count`);

  const neoCountRows = await queryNeo4j(driver, entityConfig.neo4j.count_cypher, `${entityName} count`);
  const neoCountRaw = normalizeNeo4jRows(neoCountRows)[0].count;
  const neoCount = ensureNumber(neoCountRaw, `${entityName} neo4j count`);

  const { delta, deltaPct } = computeCountDelta(pgCount, neoCount);

  const pgDigestRows = await queryPostgres(pool, entityConfig.postgres.digest_query, `${entityName} digest`);
  const neoDigestRows = await queryNeo4j(driver, entityConfig.neo4j.digest_cypher, `${entityName} digest`);
  const normalizedNeoDigests = normalizeNeo4jRows(neoDigestRows);

  const digestDiff = computeDigestDiff(pgDigestRows, normalizedNeoDigests, detailLimit);

  const violations = [];
  if (deltaPct > thresholds.max_count_delta_pct) {
    violations.push(`Count delta ${deltaPct.toFixed(2)}% exceeds ${thresholds.max_count_delta_pct}%`);
  }
  if (digestDiff.totals.mismatched > thresholds.max_digest_mismatches) {
    violations.push(`Digest mismatches ${digestDiff.totals.mismatched} exceed ${thresholds.max_digest_mismatches}`);
  }

  return {
    name: entityName,
    status: violations.length === 0 ? 'passed' : 'failed',
    counts: {
      postgres: pgCount,
      neo4j: neoCount,
      delta,
      delta_pct: Number(deltaPct.toFixed(4))
    },
    digest_summary: {
      missing_in_graph: digestDiff.totals.missing_in_graph,
      extra_in_graph: digestDiff.totals.extra_in_graph,
      mismatched: digestDiff.totals.mismatched
    },
    thresholds,
    details: {
      missing_in_graph: digestDiff.missingInGraph,
      extra_in_graph: digestDiff.extraInGraph,
      mismatched: digestDiff.mismatched
    },
    violations
  };
}

function writeReportFiles(outDir, report, metrics, stamp) {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, 'report.json'), stableJson(report));
  writeFileSync(resolve(outDir, 'metrics.json'), stableJson(metrics.json));
  writeFileSync(resolve(outDir, 'metrics.prom'), `${metrics.prom}\n`);
  writeFileSync(resolve(outDir, 'stamp.json'), stableJson(stamp));
}

function deriveEvidencePath(config) {
  const base = config.reporting?.evidence_dir || 'evidence/drift';
  const date = new Date().toISOString().slice(0, 10);
  return resolve(base, date);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  const configPath = args.config ?? DEFAULT_CONFIG_PATH;
  const config = loadConfig(configPath);
  const outDir = args.out ?? config.reporting?.output_dir ?? DEFAULT_OUT_DIR;
  const entityFilter = args.entity;
  const detailLimit = Number.isFinite(args.detailLimit) ? args.detailLimit : DEFAULT_DETAIL_LIMIT;

  const entities = config.entities || {};
  const entityNames = Object.keys(entities)
    .filter(name => !entityFilter || name === entityFilter);
  if (entityNames.length === 0) {
    throw new Error('No entities configured for drift detection.');
  }

  const pgPool = new Pool(resolvePostgresConfig());
  const neo4jConfig = resolveNeo4jConfig();
  const neo4jDriver = neo4j.driver(
    neo4jConfig.uri,
    neo4j.auth.basic(neo4jConfig.user, neo4jConfig.password)
  );

  const results = [];
  try {
    for (const name of entityNames) {
      const entityConfig = entities[name];
      if (!entityConfig?.postgres || !entityConfig?.neo4j) {
        throw new Error(`Entity ${name} missing postgres or neo4j configuration.`);
      }
      const result = await evaluateEntity(name, entityConfig, config, pgPool, neo4jDriver, detailLimit);
      results.push(result);
    }
  } finally {
    await pgPool.end();
    await neo4jDriver.close();
  }

  const violations = results.reduce((sum, entity) => sum + entity.violations.length, 0);
  const status = violations === 0 ? 'passed' : 'failed';
  const report = {
    metadata: {
      generated_at: new Date().toISOString(),
      generator: config.reporting?.generator || 'graph_postgres_drift_check',
      status,
      sha: process.env.GITHUB_SHA || 'manual',
      config_path: configPath,
      evidence_path: deriveEvidencePath(config)
    },
    summary: {
      entities_checked: results.length,
      violations
    },
    entities: results
  };

  const metrics = formatMetrics(report);
  const stamp = {
    sha: report.metadata.sha,
    status: report.metadata.status,
    timestamp: report.metadata.generated_at,
    generator: report.metadata.generator,
    report_hash: crypto.createHash('sha256').update(stableJson(report)).digest('hex')
  };

  writeReportFiles(outDir, report, metrics, stamp);

  if (status === 'failed') {
    console.error('Graph/Postgres drift detected. Review report.json for details.');
    process.exitCode = 1;
  } else {
    console.log('Graph/Postgres drift check passed.');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

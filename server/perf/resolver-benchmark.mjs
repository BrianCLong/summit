import { performance } from 'node:perf_hooks';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class FakePool {
  constructor(delayMs = 40) {
    this.delayMs = delayMs;
    this.queryLog = [];
  }

  async query(sql, params) {
    this.queryLog.push({ sql, params });
    await sleep(this.delayMs);
    if (sql.includes('entities') && !sql.includes("UNION")) {
      return { rows: [{ entities: 420 }], rowCount: 1 };
    }
    if (sql.includes('relationships') && !sql.includes("UNION")) {
      return { rows: [{ relationships: 900 }], rowCount: 1 };
    }
    if (sql.includes('investigations') && !sql.includes("UNION")) {
      return { rows: [{ investigations: 37 }], rowCount: 1 };
    }
    if (sql.includes('UNION ALL')) {
      return {
        rows: [
          { metric: 'entities', value: 420 },
          { metric: 'relationships', value: 900 },
          { metric: 'investigations', value: 37 }
        ],
        rowCount: 3
      };
    }
    return { rows: [], rowCount: 0 };
  }
}

class FakeRedis {
  constructor() {
    this.store = new Map();
  }

  async get(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }

  async set(key, value) {
    this.store.set(key, value);
    return 'OK';
  }
}

async function baselineSummary(pool, tenantId) {
  const r1 = await pool.query('SELECT COUNT(*)::int AS entities FROM entities WHERE tenant_id = $1', [tenantId]);
  const r2 = await pool.query('SELECT COUNT(*)::int AS relationships FROM relationships WHERE tenant_id = $1', [tenantId]);
  const r3 = await pool.query('SELECT COUNT(*)::int AS investigations FROM investigations WHERE tenant_id = $1', [tenantId]);
  return {
    entities: r1.rows?.[0]?.entities ?? 0,
    relationships: r2.rows?.[0]?.relationships ?? 0,
    investigations: r3.rows?.[0]?.investigations ?? 0
  };
}

async function optimizedSummary(pool, cache, tenantId) {
  const cacheKey = `summary:${tenantId}`;
  const cached = await cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  const result = await pool.query(
    `SELECT * FROM (
      SELECT 'entities' AS metric, COUNT(*)::int AS value FROM entities WHERE tenant_id = $1
      UNION ALL
      SELECT 'relationships' AS metric, COUNT(*)::int AS value FROM relationships WHERE tenant_id = $1
      UNION ALL
      SELECT 'investigations' AS metric, COUNT(*)::int AS value FROM investigations WHERE tenant_id = $1
    ) AS counts`,
    [tenantId]
  );
  const summary = { entities: 0, relationships: 0, investigations: 0 };
  for (const row of result.rows ?? []) {
    summary[row.metric] = row.value;
  }
  await cache.set(cacheKey, JSON.stringify(summary));
  return summary;
}

async function baselineVerify(pool, tokenCount) {
  for (let i = 0; i < tokenCount; i++) {
    await pool.query('SELECT * FROM users WHERE id = $1 AND is_active = true', ['user-123']);
  }
}

async function optimizedVerify(pool, redis, tokenCount) {
  const cacheKey = 'auth:user:user-123';
  const cached = await redis.get(cacheKey);
  if (!cached) {
    const result = await pool.query('SELECT * FROM users WHERE id = $1 AND is_active = true', ['user-123']);
    await redis.set(cacheKey, JSON.stringify(result.rows?.[0] ?? null));
  }
  for (let i = 1; i < tokenCount; i++) {
    await redis.get(cacheKey);
  }
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function measure(label, iterations, fn) {
  const durations = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    durations.push(performance.now() - start);
  }
  const p95 = percentile(durations, 95);
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  return { label, avg, p95, samples: durations.length };
}

async function run() {
  const pool = new FakePool(40);
  const redis = new FakeRedis();
  const baselineSummaryResult = await measure('baselineSummary', 25, () => baselineSummary(pool, 'tenant-1'));
  const optimizedSummaryResult = await measure('optimizedSummary', 25, () => optimizedSummary(pool, redis, 'tenant-1'));

  // Reset for auth scenarios
  const authPool = new FakePool(35);
  const authRedis = new FakeRedis();
  const baselineAuthResult = await measure('baselineAuthVerify', 25, () => baselineVerify(authPool, 5));
  const optimizedAuthResult = await measure('optimizedAuthVerify', 25, () => optimizedVerify(authPool, authRedis, 5));

  const report = {
    summary: { baseline: baselineSummaryResult, optimized: optimizedSummaryResult },
    authVerify: { baseline: baselineAuthResult, optimized: optimizedAuthResult }
  };

  console.log(JSON.stringify(report, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

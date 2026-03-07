import { createHash } from "crypto";
import { performance } from "node:perf_hooks";
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from "prom-client";
import { Pool, type PoolClient, type PoolConfig, type QueryResult } from "pg";

type QueryMode = "read" | "write";

const tuningEnabled =
  process.env.DB_POOL_TUNING === "1" || process.env.DB_POOL_TUNING?.toLowerCase() === "true";

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const buildPoolConfig = (): PoolConfig => {
  const connectionString = process.env.PG_CONNECTION || process.env.DATABASE_URL || undefined;

  const statementTimeoutMs = parseInt(
    process.env.DB_STATEMENT_TIMEOUT_MS || (tuningEnabled ? "15000" : "0"),
    10
  );

  const idleInTxTimeoutMs = parseInt(
    process.env.DB_IDLE_IN_TX_TIMEOUT_MS || (tuningEnabled ? "5000" : "0"),
    10
  );

  const config: PoolConfig = {
    connectionString,
    max: clamp(parseInt(process.env.DB_POOL_MAX || "20", 10), 2, 100),
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MS || "30000", 10),
    connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS || "2000", 10),
    application_name: "intelgraph-api",
  };

  if (tuningEnabled) {
    config.statement_timeout = statementTimeoutMs || undefined;
    config.idle_in_transaction_session_timeout = idleInTxTimeoutMs || undefined;
    config.maxLifetimeSeconds = parseInt(process.env.DB_POOL_MAX_LIFETIME_SECONDS || "900", 10);
    config.maxUses = parseInt(process.env.DB_POOL_MAX_USES || "5000", 10);
    config.allowExitOnIdle = true;
  }

  return config;
};

const registry = new Registry();
collectDefaultMetrics({
  register: registry,
  prefix: "intelgraph_api_",
});

const poolActive = new Gauge({
  name: "intelgraph_api_db_pool_active",
  help: "Active database connections",
  labelNames: ["pool"],
  registers: [registry],
});

const poolWaiting = new Gauge({
  name: "intelgraph_api_db_pool_waiting",
  help: "Clients waiting for a connection",
  labelNames: ["pool"],
  registers: [registry],
});

const poolWaitSeconds = new Histogram({
  name: "intelgraph_api_db_pool_wait_seconds",
  help: "Time spent waiting for a pooled connection",
  labelNames: ["pool"],
  registers: [registry],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});

const transactionDurationSeconds = new Histogram({
  name: "intelgraph_api_db_transaction_seconds",
  help: "Duration of database transactions",
  labelNames: ["mode", "outcome"],
  registers: [registry],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
});

const lockWaits = new Counter({
  name: "intelgraph_api_db_lock_wait_total",
  help: "Lock wait or deadlock errors",
  labelNames: ["code"],
  registers: [registry],
});

let pool: Pool | null = null;

const getPool = (): Pool => {
  if (!pool) {
    pool = new Pool(buildPoolConfig());
    pool.on("connect", () => updatePoolGauges());
    pool.on("error", () => updatePoolGauges());
  }
  return pool;
};

const updatePoolGauges = (): void => {
  if (!pool) return;
  const active = (pool.totalCount ?? 0) - (pool.idleCount ?? 0);
  poolActive.set({ pool: "primary" }, active);
  poolWaiting.set({ pool: "primary" }, pool.waitingCount ?? 0);
};

const acquireClient = async (): Promise<PoolClient> => {
  const start = performance.now();
  const client = await getPool().connect();
  const waitSeconds = (performance.now() - start) / 1000;
  poolWaitSeconds.observe({ pool: "primary" }, waitSeconds);
  updatePoolGauges();
  return client;
};

const getStatementName = (sql: string): string | undefined => {
  if (!tuningEnabled) return undefined;
  const normalized = sql.replace(/\s+/g, " ").trim();
  return `stmt_${createHash("sha1").update(normalized).digest("hex").slice(0, 16)}`;
};

const inferMode = (sql: string): QueryMode => {
  const first = sql.trim().toLowerCase().split(/\s+/)[0] || "";
  return ["select", "show", "describe", "explain", "values"].includes(first) ? "read" : "write";
};

const isLockError = (error: unknown): string | null => {
  const code = (error as { code?: string })?.code;
  if (!code) return null;
  return ["55P03", "40P01"].includes(code) ? code : null;
};

async function runInTransaction<T>(
  mode: QueryMode,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await acquireClient();
  const start = performance.now();
  let outcome: "committed" | "rolled_back" = "committed";

  try {
    await client.query("BEGIN");
    if (mode === "read") {
      await client.query("SET TRANSACTION READ ONLY");
    }
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    outcome = "rolled_back";
    await client.query("ROLLBACK").catch(() => {});
    const lockCode = isLockError(error);
    if (lockCode) {
      lockWaits.inc({ code: lockCode });
    }
    throw error;
  } finally {
    const duration = (performance.now() - start) / 1000;
    transactionDurationSeconds.observe({ mode, outcome }, duration);
    client.release();
    updatePoolGauges();
  }
}

const execute = async (
  sql: string,
  params: any[] = [],
  modeOverride?: QueryMode
): Promise<QueryResult> => {
  const mode = modeOverride ?? inferMode(sql);
  const name = getStatementName(sql);

  if (mode === "read" && tuningEnabled) {
    return runInTransaction(mode, (client) => client.query({ text: sql, values: params, name }));
  }

  const client = await acquireClient();
  try {
    return await client.query({ text: sql, values: params, name });
  } finally {
    client.release();
    updatePoolGauges();
  }
};

export const createDbClient = () => {
  const any = async (sql: string, params: any[] = []) => (await execute(sql, params)).rows;

  const one = async (sql: string, params: any[] = []) => {
    const rows = await any(sql, params);
    if (!rows[0]) {
      throw new Error("Expected row but none returned");
    }
    return rows[0];
  };

  const oneOrNone = async (sql: string, params: any[] = []) => {
    const rows = await any(sql, params);
    return rows[0] ?? null;
  };

  const withTransaction = async <T>(
    fn: (client: PoolClient) => Promise<T>,
    options: { readOnly?: boolean } = {}
  ): Promise<T> => {
    const mode: QueryMode = options.readOnly ? "read" : "write";
    return runInTransaction(mode, fn);
  };

  return { any, one, oneOrNone, withTransaction };
};

export const metricsRegistry = registry;

export const closeDbPool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
  }
  registry.resetMetrics();
};

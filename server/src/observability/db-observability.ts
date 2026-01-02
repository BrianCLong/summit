import { randomUUID } from 'crypto';
import { getPostgresPool } from '../db/postgres.js';
import { getAuditSystem } from '../audit/index.js';
import logger from '../utils/logger.js';

type LockGraphRow = {
  waiting_pid: number;
  blocking_pid: number;
  relation: string | null;
  waiting_mode: string;
  blocking_mode: string;
  waiting_query: string | null;
  blocking_query: string | null;
  waiting_ms: number;
  blocking_ms: number;
};

type SlowQueryRow = {
  queryid?: string;
  query: string;
  calls: number;
  mean_exec_time: number;
  total_exec_time?: number;
  rows?: number;
  source?: string;
};

type ExplainRequest = {
  queryId: string;
  parameters?: Record<string, string | number>;
};

type DbObservabilityContext = {
  userId?: string;
  tenantId?: string;
  correlationId?: string;
  requestId?: string;
};

type WhitelistedQuery = {
  sql: string;
  description: string;
  params: Array<{
    name: string;
    type: 'number' | 'text';
    default?: number | string;
    min?: number;
    max?: number;
  }>;
};

const EXPLAIN_WHITELIST: Record<string, WhitelistedQuery> = {
  activeSessions: {
    sql: `
      SELECT pid, usename, application_name, state, wait_event_type, wait_event, query_start
      FROM pg_stat_activity
      WHERE state != 'idle'
      ORDER BY query_start DESC
      LIMIT $1
    `,
    description: 'List non-idle sessions ordered by start time',
    params: [{ name: 'limit', type: 'number', default: 15, min: 1, max: 50 }],
  },
  blockingActivity: {
    sql: `
      SELECT pid, usename, application_name, state, wait_event, query_start
      FROM pg_stat_activity
      WHERE wait_event IS NOT NULL
      ORDER BY query_start ASC
      LIMIT $1
    `,
    description: 'Surface blocking sessions that are waiting on locks',
    params: [{ name: 'limit', type: 'number', default: 10, min: 1, max: 50 }],
  },
};

export class DbObservabilityService {
  private readonly getPool: () => unknown;
  private readonly getAudit: () => unknown;
  private readonly now: () => Date;

  constructor(deps?: {
    getPool?: () => unknown;
    getAudit?: () => unknown;
    now?: () => Date;
  }) {
    this.getPool = deps?.getPool ?? getPostgresPool;
    this.getAudit = deps?.getAudit ?? getAuditSystem;
    this.now = deps?.now ?? (() => new Date());
  }

  async getLockGraph(limit = 25): Promise<{ locks: LockGraphRow[]; summary: string }> {
    const pool = this.getPool();
    const { rows } = await (pool as any).query(
      `
        SELECT
          waiting.pid AS waiting_pid,
          blocking.pid AS blocking_pid,
          COALESCE(waiting.relation::regclass::text, 'unknown') AS relation,
          waiting.mode AS waiting_mode,
          blocking.mode AS blocking_mode,
          waiting_activity.query AS waiting_query,
          blocking_activity.query AS blocking_query,
          (EXTRACT(EPOCH FROM (now() - waiting_activity.query_start)) * 1000)::bigint AS waiting_ms,
          (EXTRACT(EPOCH FROM (now() - blocking_activity.query_start)) * 1000)::bigint AS blocking_ms
        FROM pg_locks waiting
        JOIN pg_stat_activity waiting_activity ON waiting_activity.pid = waiting.pid
        JOIN pg_locks blocking ON blocking.locktype = waiting.locktype
          AND blocking.database IS NOT DISTINCT FROM waiting.database
          AND blocking.relation IS NOT DISTINCT FROM waiting.relation
          AND blocking.page IS NOT DISTINCT FROM waiting.page
          AND blocking.tuple IS NOT DISTINCT FROM waiting.tuple
          AND blocking.virtualxid IS NOT DISTINCT FROM waiting.virtualxid
          AND blocking.transactionid IS NOT DISTINCT FROM waiting.transactionid
          AND blocking.classid IS NOT DISTINCT FROM waiting.classid
          AND blocking.objid IS NOT DISTINCT FROM waiting.objid
          AND blocking.objsubid IS NOT DISTINCT FROM waiting.objsubid
          AND blocking.pid != waiting.pid
        JOIN pg_stat_activity blocking_activity ON blocking_activity.pid = blocking.pid
        WHERE NOT waiting.granted
          AND blocking.granted
        LIMIT $1
      `,
      [limit],
    );

    const summary =
      rows.length === 0
        ? 'No blocking locks detected.'
        : `Detected ${rows.length} blocked session(s); top blocker PID ${rows[0].blocking_pid} holding ${rows[0].blocking_mode}.`;

    return { locks: rows, summary };
  }

  async listSlowQueries(limit = 20): Promise<{
    source: 'pg_stat_statements' | 'app_slowlog' | 'unavailable';
    entries: SlowQueryRow[];
    summary: string;
  }> {
    const pool = this.getPool();

    try {
      const { rows: extensionRows } = await (pool as any).query(
        `SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') AS enabled`,
      );
      const enabled = Boolean(extensionRows?.[0]?.enabled);

      if (enabled) {
        const { rows } = await (pool as any).query(
          `
            SELECT queryid, query, calls, mean_exec_time, total_exec_time, rows
            FROM pg_stat_statements
            ORDER BY mean_exec_time DESC
            LIMIT $1
          `,
          [limit],
        );

        return {
          source: 'pg_stat_statements',
          entries: rows.map((row: any) => ({
            ...row,
            source: 'pg_stat_statements',
          })),
          summary:
            rows.length === 0
              ? 'pg_stat_statements is enabled but no statements recorded yet.'
              : `Top ${rows.length} statements from pg_stat_statements (ordered by mean_exec_time).`,
        };
      }
    } catch (error: any) {
      logger.warn({ err: error }, 'pg_stat_statements not available, falling back to app slow log');
    }

    if (typeof (pool as any).slowQueryInsights === 'function') {
      const entries = (pool as any).slowQueryInsights().slice(0, limit).map((entry: any) => ({
        query: entry.key,
        calls: entry.executions,
        mean_exec_time: entry.avgDurationMs,
        total_exec_time: entry.avgDurationMs * entry.executions,
        rows: undefined,
        source: 'app_slowlog',
      }));

      return {
        source: 'app_slowlog',
        entries,
        summary:
          entries.length === 0
            ? 'No slow query samples recorded in the application slow log.'
            : `Using application slow log insights (${entries.length} entries).`,
      };
    }

    return {
      source: 'unavailable',
      entries: [],
      summary: 'Slow query insights are unavailable (pg_stat_statements disabled and no app slow log).',
    };
  }

  async explainWhitelistedQuery(
    request: ExplainRequest,
  ): Promise<{ plan: any; summary: string; queryId: string; sql: string; parameters: any[] }> {
    const entry = EXPLAIN_WHITELIST[request.queryId];
    if (!entry) {
      throw new Error('Query is not whitelisted for explain');
    }

    const parameters = entry.params.map((param) => {
      const provided = request.parameters?.[param.name];
      const value = provided ?? param.default;

      if (value === undefined || value === null) {
        throw new Error(`Missing required parameter: ${param.name}`);
      }

      if (param.type === 'number') {
        const num = Number(value);
        if (Number.isNaN(num)) throw new Error(`Parameter ${param.name} must be a number`);
        if (param.min !== undefined && num < param.min) {
          throw new Error(`Parameter ${param.name} must be >= ${param.min}`);
        }
        if (param.max !== undefined && num > param.max) {
          throw new Error(`Parameter ${param.name} must be <= ${param.max}`);
        }
        return num;
      }

      if (typeof value !== 'string') {
        throw new Error(`Parameter ${param.name} must be text`);
      }
      return value;
    });

    const pool = this.getPool();
    const { rows } = await (pool as any).query(
      {
        text: `EXPLAIN (FORMAT JSON) ${entry.sql}`,
        values: parameters,
      },
    );

    const plan = rows?.[0]?.['QUERY PLAN']?.[0] ?? rows?.[0];
    const planSummary = plan?.Plan
      ? `Plan node ${plan.Plan['Node Type']} with estimated ${plan.Plan['Plan Rows']} row(s).`
      : 'Explain plan retrieved.';

    return {
      plan,
      summary: planSummary,
      queryId: request.queryId,
      sql: entry.sql.trim(),
      parameters,
    };
  }

  async snapshot(
    options: { explain?: ExplainRequest } = {},
    context: DbObservabilityContext = {},
  ): Promise<{
    takenAt: string;
    locks: LockGraphRow[];
    slowQueries: { source: string; entries: SlowQueryRow[] };
    explain?: { plan: any; queryId: string; summary: string; sql: string; parameters: any[] };
    summary: { locks: string; slowQueries: string; explain?: string; overall: string };
  }> {
    const started = this.now();
    const [locks, slowQueries, explain] = await Promise.all([
      this.getLockGraph(),
      this.listSlowQueries(),
      options.explain ? this.explainWhitelistedQuery(options.explain) : Promise.resolve(undefined),
    ]);

    const overallSummaryParts = [
      locks.summary,
      slowQueries.summary,
      explain?.summary,
    ].filter(Boolean);

    await this.emitTimelineEvent('db_observability.snapshot', 'success', {
      lockCount: locks.locks.length,
      slowQuerySource: slowQueries.source,
      explainQuery: options.explain?.queryId,
      durationMs: Date.now() - started.getTime(),
    }, context);

    return {
      takenAt: started.toISOString(),
      locks: locks.locks,
      slowQueries: {
        source: slowQueries.source,
        entries: slowQueries.entries,
      },
      explain,
      summary: {
        locks: locks.summary,
        slowQueries: slowQueries.summary,
        explain: explain?.summary,
        overall: overallSummaryParts.join(' '),
      },
    };
  }

  private async emitTimelineEvent(
    action: string,
    outcome: 'success' | 'failure',
    details: Record<string, unknown>,
    context: DbObservabilityContext,
  ) {
    try {
      const audit = this.getAudit?.() as { recordEvent?: (event: unknown) => Promise<void> } | undefined;
      if (!audit?.recordEvent) return;
      await audit.recordEvent({
        eventType: 'db_observability',
        level: outcome === 'success' ? 'info' : 'warn',
        correlationId: context.correlationId || randomUUID(),
        tenantId: context.tenantId || 'system',
        serviceId: 'db-observability',
        action,
        outcome,
        message: 'DB observability snapshot captured',
        details: {
          ...details,
          requestId: context.requestId,
          userId: context.userId,
        },
        complianceRelevant: false,
        complianceFrameworks: [],
      });
    } catch (error: any) {
      logger.warn({ err: error }, 'Failed to emit db observability audit event');
    }
  }
}

export const dbObservabilityService = new DbObservabilityService();
export { EXPLAIN_WHITELIST };

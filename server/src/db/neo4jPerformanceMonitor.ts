import pino from 'pino';
import {
  neo4jQueryErrorsTotal,
  neo4jQueryLatencyMs,
  neo4jQueryTotal,
} from '../metrics/neo4jMetrics.js';

type QueryLabels = {
  operation: string;
  label: string;
  tenant_id?: string;
};

type QueryOutcome = {
  cypher: string;
  params?: Record<string, unknown>;
  durationMs: number;
  labels: QueryLabels;
  error?: string;
};

interface MonitorOptions {
  slowQueryThresholdMs: number;
  maxTrackedQueries: number;
}

interface TrackedQuery extends QueryOutcome {
  timestamp: number;
}

const logger = (pino as any)({ name: 'neo4j-performance-monitor' });

export class Neo4jPerformanceMonitor {
  private readonly slowQueryThresholdMs: number;
  private readonly maxTrackedQueries: number;
  private readonly slowQueries: TrackedQuery[] = [];
  private readonly recentErrors: TrackedQuery[] = [];
  private readonly labelCache = new Map<string, QueryLabels>();

  constructor(options: MonitorOptions) {
    this.slowQueryThresholdMs = options.slowQueryThresholdMs;
    this.maxTrackedQueries = options.maxTrackedQueries;
  }

  recordSuccess(outcome: QueryOutcome): void {
    const { cypher, durationMs } = outcome;
    const labels = this.normalizeLabels(outcome.labels);

    neo4jQueryTotal.inc(labels);
    neo4jQueryLatencyMs.observe(labels, durationMs);

    if (durationMs >= this.slowQueryThresholdMs) {
      // BOLT: Only create the normalized outcome object for slow queries
      // to avoid unnecessary spreads on every successful query.
      const normalizedOutcome: QueryOutcome = { ...outcome, labels };
      this.trackSlowQuery(normalizedOutcome);
    }

    if (durationMs >= this.slowQueryThresholdMs * 2) {
      logger.warn(
        {
          cypher: cypher.slice(0, 240),
          durationMs,
          operation: labels.operation,
          label: labels.label,
        },
        'Neo4j slow query detected',
      );
    }
  }

  recordError(outcome: QueryOutcome): void {
    const { durationMs } = outcome;
    const labels = this.normalizeLabels(outcome.labels);

    neo4jQueryTotal.inc(labels);
    neo4jQueryErrorsTotal.inc(labels);
    neo4jQueryLatencyMs.observe(labels, durationMs);

    // BOLT: Spread directly into the recentErrors array to avoid intermediate object creation.
    this.recentErrors.unshift({ ...outcome, labels, timestamp: Date.now() });
    this.trimTracked(this.recentErrors);
  }

  getSlowQueries(): TrackedQuery[] {
    return [...this.slowQueries];
  }

  getRecentErrors(): TrackedQuery[] {
    return [...this.recentErrors];
  }

  reset(): void {
    this.slowQueries.length = 0;
    this.recentErrors.length = 0;
    neo4jQueryTotal.reset();
    neo4jQueryErrorsTotal.reset();
    neo4jQueryLatencyMs.reset();
  }

  private trackSlowQuery(outcome: QueryOutcome): void {
    this.slowQueries.unshift({ ...outcome, timestamp: Date.now() });
    this.trimTracked(this.slowQueries);
  }

  private trimTracked(buffer: TrackedQuery[]): void {
    if (buffer.length > this.maxTrackedQueries) {
      buffer.length = this.maxTrackedQueries;
    }
  }

  private normalizeLabels(labels?: QueryLabels): QueryLabels {
    const operation = labels?.operation || 'unknown';
    const label = labels?.label || 'unlabeled';
    const tenant_id = labels?.tenant_id || 'unknown';

    // BOLT: Cache label objects to reduce GC pressure and allocation overhead.
    const cacheKey = `${operation}:${label}:${tenant_id}`;
    let cached = this.labelCache.get(cacheKey);

    if (!cached) {
      cached = { operation, label, tenant_id };
      // Limit cache size to prevent memory leaks
      if (this.labelCache.size < 1000) {
        this.labelCache.set(cacheKey, cached);
      }
    }

    return cached;
  }
}

const defaultMonitor = new Neo4jPerformanceMonitor({
  slowQueryThresholdMs: Number(process.env.NEO4J_SLOW_QUERY_THRESHOLD_MS) || 500,
  maxTrackedQueries: Number(process.env.NEO4J_SLOW_QUERY_BUFFER || 50),
});

export const neo4jPerformanceMonitor = defaultMonitor;

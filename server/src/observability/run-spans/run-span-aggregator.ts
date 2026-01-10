import { RunAggregate, RunAggregateFilters, RunAggregateWithTree, RunSpan, RunTreeNode } from './types.js';

const toDuration = (span: RunSpan) => Math.max(0, span.endTimeMs - span.startTimeMs);
const loadPg = async () => (await import('../../db/pg.js')).pg;

function buildTree(spans: RunSpan[]): RunTreeNode[] {
  const nodes = new Map<string, RunTreeNode>();
  const roots: RunTreeNode[] = [];
  const seen = new Set<string>();

  for (const span of spans) {
    if (seen.has(span.spanId)) continue;
    seen.add(span.spanId);
    nodes.set(span.spanId, {
      spanId: span.spanId,
      parentSpanId: span.parentSpanId || null,
      runId: span.runId,
      stage: span.stage,
      kind: span.kind,
      status: span.status,
      startTimeMs: span.startTimeMs,
      endTimeMs: span.endTimeMs,
      retryCount: span.retryCount || 0,
      attributes: span.attributes || {},
      durationMs: toDuration(span),
      children: [],
    });
  }

  for (const node of nodes.values()) {
    if (node.parentSpanId && nodes.has(node.parentSpanId)) {
      nodes.get(node.parentSpanId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function markCriticalPath(nodes: RunTreeNode[]): { duration: number; stages: string[] } {
  let best: { duration: number; stages: string[]; nodes: Set<string> } = {
    duration: 0,
    stages: [],
    nodes: new Set<string>(),
  };

  const dfs = (node: RunTreeNode): { duration: number; stages: string[]; path: string[] } => {
    const ownDuration = node.kind === 'queue' ? 0 : node.durationMs;
    if (node.children.length === 0) {
      return { duration: ownDuration, stages: [node.stage], path: [node.spanId] };
    }

    let maxChild = { duration: 0, stages: [] as string[], path: [] as string[] };
    for (const child of node.children) {
      const result = dfs(child);
      if (result.duration > maxChild.duration) {
        maxChild = result;
      }
    }

    return {
      duration: ownDuration + maxChild.duration,
      stages: [node.stage, ...maxChild.stages],
      path: [node.spanId, ...maxChild.path],
    };
  };

  for (const root of nodes) {
    const result = dfs(root);
    if (result.duration > best.duration) {
      best = { duration: result.duration, stages: result.stages, nodes: new Set(result.path) };
    }
  }

  for (const root of nodes) {
    const stack = [root];
    while (stack.length) {
      const node = stack.pop()!;
      if (best.nodes.has(node.spanId)) {
        node.onCriticalPath = true;
      }
      for (const child of node.children) {
        stack.push(child);
      }
    }
  }

  return { duration: best.duration, stages: best.stages };
}

export function calculateRunAggregate(spans: RunSpan[]): RunAggregateWithTree | null {
  if (spans.length === 0) return null;

  const ordered = [...spans].sort((a, b) => a.startTimeMs - b.startTimeMs);
  const startedAt = new Date(ordered[0].startTimeMs);
  const finishedAt = new Date(Math.max(...ordered.map((s) => s.endTimeMs)));
  const totalDurationMs = finishedAt.getTime() - startedAt.getTime();

  const queueWaitMs = spans
    .filter((s) => s.kind === 'queue')
    .reduce((sum, span) => sum + toDuration(span), 0);
  const execMs = spans
    .filter((s) => s.kind === 'exec' || s.kind === 'compute' || s.kind === 'io')
    .reduce((sum, span) => sum + toDuration(span), 0);

  const roots = buildTree(spans);
  const critical = markCriticalPath(roots);
  const bestCaseDurationMs = critical.duration || totalDurationMs;
  const wastedQueueMs = Math.max(0, totalDurationMs - bestCaseDurationMs);
  const errorCount = spans.filter((s) => s.status === 'error').length;
  const retryCount = spans.reduce((sum, s) => sum + (s.retryCount || 0), 0);
  const status = errorCount > 0 ? 'error' : 'ok';

  const aggregate: RunAggregate = {
    runId: spans[0].runId,
    traceId: spans[0].traceId,
    tenantId: spans[0].tenantId,
    totalDurationMs,
    queueWaitMs,
    execMs,
    bestCaseDurationMs,
    wastedQueueMs,
    criticalPathStages: critical.stages,
    errorCount,
    retryCount,
    startedAt,
    finishedAt,
    status,
  };

  return { aggregate, tree: roots };
}

export class RunSpanAggregator {
  async loadSpans(runId: string): Promise<RunSpan[]> {
    const pg = await loadPg();
    const rows = await pg.readMany(
      `SELECT run_id, trace_id, tenant_id, span_id, parent_span_id, stage, kind, status, start_time, end_time, retry_count, attributes, resources
       FROM obs_raw_spans WHERE run_id = $1`,
      [runId],
    );

    return rows.map((row: any) => ({
      runId: row.run_id,
      traceId: row.trace_id,
      tenantId: row.tenant_id || undefined,
      spanId: row.span_id,
      parentSpanId: row.parent_span_id,
      stage: row.stage,
      kind: row.kind,
      status: row.status,
      startTimeMs: new Date(row.start_time).getTime(),
      endTimeMs: new Date(row.end_time).getTime(),
      retryCount: Number(row.retry_count || 0),
      attributes: row.attributes || {},
      resources: row.resources || {},
    }));
  }

  async persistAggregate(result: RunAggregateWithTree): Promise<void> {
    const { aggregate, tree } = result;
    const pg = await loadPg();

    await pg.write(
      `INSERT INTO obs_run_aggregates (
        run_id, trace_id, tenant_id, total_duration_ms, queue_wait_ms, exec_ms, best_case_duration_ms,
        wasted_queue_ms, critical_path_stages, error_count, retry_count, started_at, finished_at, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (run_id) DO UPDATE SET
        trace_id = EXCLUDED.trace_id,
        tenant_id = EXCLUDED.tenant_id,
        total_duration_ms = EXCLUDED.total_duration_ms,
        queue_wait_ms = EXCLUDED.queue_wait_ms,
        exec_ms = EXCLUDED.exec_ms,
        best_case_duration_ms = EXCLUDED.best_case_duration_ms,
        wasted_queue_ms = EXCLUDED.wasted_queue_ms,
        critical_path_stages = EXCLUDED.critical_path_stages,
        error_count = EXCLUDED.error_count,
        retry_count = EXCLUDED.retry_count,
        started_at = EXCLUDED.started_at,
        finished_at = EXCLUDED.finished_at,
        status = EXCLUDED.status,
        updated_at = NOW()`,
      [
        aggregate.runId,
        aggregate.traceId,
        aggregate.tenantId || null,
        aggregate.totalDurationMs,
        aggregate.queueWaitMs,
        aggregate.execMs,
        aggregate.bestCaseDurationMs,
        aggregate.wastedQueueMs,
        aggregate.criticalPathStages,
        aggregate.errorCount,
        aggregate.retryCount,
        aggregate.startedAt,
        aggregate.finishedAt,
        aggregate.status,
      ],
    );

    await pg.write(
      `INSERT INTO obs_run_tree (run_id, tenant_id, tree)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (run_id) DO UPDATE SET tree = EXCLUDED.tree, tenant_id = EXCLUDED.tenant_id, updated_at = NOW()`,
      [aggregate.runId, aggregate.tenantId || null, JSON.stringify({ nodes: tree })],
    );
  }

  async aggregateAndStore(runId: string): Promise<RunAggregateWithTree | null> {
    const spans = await this.loadSpans(runId);
    const result = calculateRunAggregate(spans);
    if (!result) return null;
    await this.persistAggregate(result);
    return result;
  }

  async listAggregates(filters: RunAggregateFilters = {}): Promise<RunAggregate[]> {
    const clauses: string[] = [];
    const params: any[] = [];
    const pg = await loadPg();

    if (filters.since) {
      clauses.push(`started_at >= $${params.length + 1}`);
      params.push(filters.since);
    }
    if (filters.until) {
      clauses.push(`finished_at <= $${params.length + 1}`);
      params.push(filters.until);
    }
    if (filters.status) {
      clauses.push(`status = $${params.length + 1}`);
      params.push(filters.status);
    }
    if (typeof filters.minWastedQueueMs === 'number') {
      clauses.push(`wasted_queue_ms >= $${params.length + 1}`);
      params.push(filters.minWastedQueueMs);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 50;
    const offset = filters.offset || 0;

    const rows = await pg.readMany(
      `SELECT run_id, trace_id, tenant_id, total_duration_ms, queue_wait_ms, exec_ms, best_case_duration_ms,
              wasted_queue_ms, critical_path_stages, error_count, retry_count, started_at, finished_at, status
       FROM obs_run_aggregates ${where}
       ORDER BY finished_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );

    return rows.map((row: any) => ({
      runId: row.run_id,
      traceId: row.trace_id,
      tenantId: row.tenant_id || undefined,
      totalDurationMs: Number(row.total_duration_ms),
      queueWaitMs: Number(row.queue_wait_ms),
      execMs: Number(row.exec_ms),
      bestCaseDurationMs: Number(row.best_case_duration_ms),
      wastedQueueMs: Number(row.wasted_queue_ms),
      criticalPathStages: row.critical_path_stages || [],
      errorCount: Number(row.error_count || 0),
      retryCount: Number(row.retry_count || 0),
      startedAt: new Date(row.started_at),
      finishedAt: new Date(row.finished_at),
      status: row.status,
    }));
  }

  async getRun(runId: string): Promise<RunAggregateWithTree | null> {
    const pg = await loadPg();
    const aggregateRow = await pg.oneOrNone(
      `SELECT run_id, trace_id, tenant_id, total_duration_ms, queue_wait_ms, exec_ms, best_case_duration_ms,
              wasted_queue_ms, critical_path_stages, error_count, retry_count, started_at, finished_at, status
         FROM obs_run_aggregates WHERE run_id = $1`,
      [runId],
    );

    const treeRow = await pg.oneOrNone(
      `SELECT tree FROM obs_run_tree WHERE run_id = $1`,
      [runId],
    );

    if (aggregateRow && treeRow) {
      return {
        aggregate: {
          runId: aggregateRow.run_id,
          traceId: aggregateRow.trace_id,
          tenantId: aggregateRow.tenant_id || undefined,
          totalDurationMs: Number(aggregateRow.total_duration_ms),
          queueWaitMs: Number(aggregateRow.queue_wait_ms),
          execMs: Number(aggregateRow.exec_ms),
          bestCaseDurationMs: Number(aggregateRow.best_case_duration_ms),
          wastedQueueMs: Number(aggregateRow.wasted_queue_ms),
          criticalPathStages: aggregateRow.critical_path_stages || [],
          errorCount: Number(aggregateRow.error_count || 0),
          retryCount: Number(aggregateRow.retry_count || 0),
          startedAt: new Date(aggregateRow.started_at),
          finishedAt: new Date(aggregateRow.finished_at),
          status: aggregateRow.status,
        },
        tree: (treeRow.tree?.nodes as RunTreeNode[]) || [],
      };
    }

    return this.aggregateAndStore(runId);
  }
}

export const runSpanAggregator = new RunSpanAggregator();

import { getPostgresPool } from '../postgres';
import logger from '../../config/logger.js';

const lineageLogger = logger.child({ module: 'lineage-repository' });

export type LineageDirection = 'UPSTREAM' | 'DOWNSTREAM' | 'BOTH';

export interface LineageEdge {
  runId: string | null;
  stepId: string | null;
  eventTime: string;
  eventType: string;
  sourceDataset?: string;
  targetDataset?: string;
  sourceColumn?: string;
  targetColumn?: string;
  transformation?: string;
  targetSystem?: string;
  metadata?: Record<string, any>;
}

export interface LineageRunSummary {
  runId: string;
  jobName?: string;
  jobType?: string;
  status?: string;
  startedAt?: string;
  completedAt?: string | null;
}

export interface LineageGraph {
  dataset: string;
  upstream: LineageEdge[];
  downstream: LineageEdge[];
  runs: LineageRunSummary[];
  generatedAt: string;
}

const DEFAULT_LIMIT = 400;
const MAX_LIMIT = 1000;

export async function getDatasetLineage(
  dataset: string,
  options: { tenantId?: string; direction?: LineageDirection; limit?: number } = {},
): Promise<LineageGraph> {
  const pool = getPostgresPool();
  const direction = (options.direction || 'BOTH').toUpperCase() as LineageDirection;
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

  const clauses: string[] = ['(payload->>\'source_dataset\' = $1 OR payload->>\'target_dataset\' = $1)'];
  const params: any[] = [dataset];

  if (options.tenantId && options.tenantId.toLowerCase() !== 'all') {
    clauses.push('(payload->>\'tenant_id\' = $2)');
    params.push(options.tenantId);
  }

  const whereClause = clauses.join(' AND ');

  try {
    const eventResult = await pool.query(
      `
        SELECT run_id::text, step_id, event_time, event_type, payload
        FROM openlineage_events
        WHERE ${whereClause}
        ORDER BY event_time DESC
        LIMIT ${limit}
      `,
      params,
    );

    const upstream: LineageEdge[] = [];
    const downstream: LineageEdge[] = [];
    const runIds = new Set<string>();

    for (const row of eventResult.rows) {
      const payload = row.payload || {};
      const edge: LineageEdge = {
        runId: row.run_id || null,
        stepId: row.step_id || null,
        eventTime: row.event_time instanceof Date ? row.event_time.toISOString() : row.event_time,
        eventType: row.event_type,
        sourceDataset: payload.source_dataset || undefined,
        targetDataset: payload.target_dataset || undefined,
        sourceColumn: payload.source_column || undefined,
        targetColumn: payload.target_column || undefined,
        transformation: payload.transformation || undefined,
        targetSystem: payload.target_system || undefined,
        metadata: payload.metadata || {},
      };

      if (edge.runId) {
        runIds.add(edge.runId);
      }

      if (payload.target_dataset === dataset && (direction === 'UPSTREAM' || direction === 'BOTH')) {
        upstream.push(edge);
      }

      if (payload.source_dataset === dataset && (direction === 'DOWNSTREAM' || direction === 'BOTH')) {
        downstream.push(edge);
      }
    }

    const runs = await hydrateRunSummaries(pool, Array.from(runIds));

    return {
      dataset,
      upstream,
      downstream,
      runs,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    lineageLogger.error({ error: (error as Error).message, dataset }, 'failed to query lineage events');
    throw error;
  }
}

async function hydrateRunSummaries(pool: any, runIds: string[]): Promise<LineageRunSummary[]> {
  if (!runIds.length) {
    return [];
  }

  const result = await pool.query(
    `
      SELECT run_id::text, event_time, event_type, payload
      FROM openlineage_events
      WHERE run_id = ANY($1::uuid[])
        AND event_type IN ('RUN_START', 'RUN_COMPLETE')
      ORDER BY event_time ASC
    `,
    [runIds],
  );

  const summaries = new Map<string, LineageRunSummary>();

  for (const row of result.rows) {
    const payload = row.payload || {};
    const runId: string = row.run_id;
    let summary = summaries.get(runId);

    if (!summary) {
      summary = { runId };
      summaries.set(runId, summary);
    }

    if (row.event_type === 'RUN_START') {
      summary.jobName = payload.job_name || payload.job || summary.jobName;
      summary.jobType = payload.job_type || summary.jobType;
      summary.startedAt = row.event_time instanceof Date ? row.event_time.toISOString() : row.event_time;
      summary.status = payload.status || summary.status || 'RUNNING';
    } else if (row.event_type === 'RUN_COMPLETE') {
      summary.status = payload.status || 'COMPLETED';
      summary.completedAt = row.event_time instanceof Date ? row.event_time.toISOString() : row.event_time;
      if (!summary.jobName && payload.job_name) {
        summary.jobName = payload.job_name;
      }
      if (!summary.jobType && payload.job_type) {
        summary.jobType = payload.job_type;
      }
    }
  }

  return Array.from(summaries.values());
}

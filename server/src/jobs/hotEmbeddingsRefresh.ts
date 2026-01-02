// @ts-nocheck
import pino from 'pino';
import { getPostgresPool } from '../db/postgres.js';
import {
  vectorQueriesTotal,
  vectorQueryDurationSeconds,
} from '../monitoring/metrics.js';

const logger = (pino as any)({ name: 'hot-embeddings-refresh' });

let refreshTimer: NodeJS.Timer | null = null;
const DEFAULT_REFRESH_MS = 5 * 60 * 1000;
const DEFAULT_WINDOW = process.env.HOT_EMBEDDINGS_WINDOW ?? '3 days';
const DEFAULT_LIMIT = parseInt(process.env.HOT_EMBEDDINGS_PER_TENANT ?? '500', 10);
const HOT_REFRESH_LIMIT = Number.isFinite(DEFAULT_LIMIT) ? DEFAULT_LIMIT : 500;
const DEFAULT_INTERVAL_MS = parseInt(
  process.env.HOT_EMBEDDINGS_REFRESH_MS ?? `${DEFAULT_REFRESH_MS}`,
  10,
);
const REFRESH_INTERVAL_MS = Number.isFinite(DEFAULT_INTERVAL_MS)
  ? DEFAULT_INTERVAL_MS
  : DEFAULT_REFRESH_MS;
const ALL_TENANTS_LABEL = 'all-tenants';

export async function refreshTenantHotEmbeddings(): Promise<void> {
  const pool = getPostgresPool();
  const start = Date.now();

  const stopTimer = vectorQueryDurationSeconds.startTimer({
    operation: 'hot-embeddings-refresh',
    tenant_id: ALL_TENANTS_LABEL,
  });

  try {
    await pool.query(
      'SELECT refresh_tenant_hot_entity_embeddings($1::interval, $2);',
      [DEFAULT_WINDOW, HOT_REFRESH_LIMIT],
    );
    vectorQueriesTotal
      .labels('hot-embeddings-refresh', ALL_TENANTS_LABEL, 'success')
      .inc();
    logger.debug(
      {
        durationMs: Date.now() - start,
        window: DEFAULT_WINDOW,
        perTenant: HOT_REFRESH_LIMIT,
      },
      'refreshed hot embeddings MV',
    );
  } catch (error: any) {
    vectorQueriesTotal
      .labels('hot-embeddings-refresh', ALL_TENANTS_LABEL, 'error')
      .inc();
    throw error;
  } finally {
    stopTimer();
  }
}

export function startTenantHotEmbeddingsRefresh(intervalMs = REFRESH_INTERVAL_MS): void {
  if (refreshTimer) return;

  const runRefresh = async () => {
    try {
      await refreshTenantHotEmbeddings();
    } catch (error: any) {
      logger.warn(
        { error: error instanceof Error ? error.message : String(error) },
        'failed to refresh hot embeddings MV',
      );
    }
  };

  void runRefresh();
  refreshTimer = setInterval(runRefresh, intervalMs);
  logger.info({ intervalMs }, 'started hot embeddings refresh loop');
}

export function stopTenantHotEmbeddingsRefresh(): void {
  if (!refreshTimer) return;
  clearInterval(refreshTimer);
  refreshTimer = null;
  logger.info('stopped hot embeddings refresh loop');
}

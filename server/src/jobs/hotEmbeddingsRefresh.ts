// @ts-nocheck
import pino from 'pino';
import { getPostgresPool } from '../db/postgres.js';

const logger = pino({ name: 'hot-embeddings-refresh' });

let refreshTimer: NodeJS.Timer | null = null;

export async function refreshTenantHotEmbeddings(): Promise<void> {
  const pool = getPostgresPool();
  const start = Date.now();
  await pool.query('SELECT refresh_tenant_hot_entity_embeddings();');
  logger.debug({ durationMs: Date.now() - start }, 'refreshed hot embeddings MV');
}

export function startTenantHotEmbeddingsRefresh(intervalMs = 5 * 60 * 1000): void {
  if (refreshTimer) return;

  const runRefresh = async () => {
    try {
      await refreshTenantHotEmbeddings();
    } catch (error) {
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

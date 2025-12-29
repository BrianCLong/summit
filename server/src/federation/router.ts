import { randomUUID } from 'node:crypto';

export interface FederationClusterClient {
  id: string;
  client: {
    search: (query: string, options: { timeoutMs: number }) => Promise<unknown[]>;
  };
}

export interface FederationShardInfo {
  id: string;
  latencyMs: number;
  partial: boolean;
  requestId: string;
}

export interface ProvenancedRow {
  data: unknown;
  shard: FederationShardInfo;
}

export interface FederationSearchOptions {
  budgetMs?: number;
  timeoutMs?: number;
  allowPartial?: boolean;
}

interface FederationContext {
  clusterClients?: FederationClusterClient[];
  logger?: { warn: (message: string, meta?: Record<string, unknown>) => void };
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout: () => void,
): Promise<T> {
  let timeoutId: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      onTimeout();
      reject(new Error('Federated query timeout'));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  }) as Promise<T>;
}

export async function federatedSearch(
  query: string,
  options: FederationSearchOptions,
  ctx: FederationContext,
): Promise<ProvenancedRow[]> {
  const clusters = ctx.clusterClients || [];
  if (clusters.length === 0) return [];

  const budgetMs = options.budgetMs ?? 2000;
  const timeoutMs = Math.min(options.timeoutMs ?? 1500, budgetMs);
  const allowPartial = options.allowPartial ?? true;
  const startedAt = Date.now();

  const promises = clusters.map(async (cluster) => {
    const requestId = randomUUID();
    const started = Date.now();
    let partial = false;

    try {
      const rows = await withTimeout(
        cluster.client.search(query, { timeoutMs }),
        timeoutMs,
        () => {
          partial = true;
        },
      );
      return rows.map((row) => ({
        data: row,
        shard: {
          id: cluster.id,
          latencyMs: Date.now() - started,
          partial,
          requestId,
        },
      }));
    } catch (error) {
      ctx.logger?.warn('federation.search_failed', {
        clusterId: cluster.id,
        error: (error as Error).message,
        requestId,
      });
      if (!allowPartial) {
        throw error;
      }
      return [];
    }
  });

  const results = (await Promise.all(promises)).flat();

  if (Date.now() - startedAt > budgetMs) {
    ctx.logger?.warn('federation.budget_exceeded', {
      budgetMs,
      elapsedMs: Date.now() - startedAt,
    });
  }

  return results;
}

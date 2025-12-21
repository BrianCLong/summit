/**
 * Strategic Plan DataLoader
 *
 * Batch loading for strategic plans to prevent N+1 query problems.
 */

import DataLoader from 'dataloader';
import { getPostgresPool } from '../../config/database.js';
import { getStrategicPlanningService } from '../../services/StrategicPlanningService.js';
import type { StrategicPlan } from '../../types/strategic-planning.js';

interface DataLoaderContext {
  tenantId: string;
}

/**
 * Create a DataLoader for batching strategic plan queries
 */
export function createStrategicPlanLoader(
  context: DataLoaderContext,
): DataLoader<string, StrategicPlan | null> {
  return new DataLoader<string, StrategicPlan | null>(
    async (ids: readonly string[]) => {
      const pool = getPostgresPool();
      const service = getStrategicPlanningService(pool);

      const plans = await service.batchLoadPlans(ids, context.tenantId);

      // DataLoader requires results in same order as input ids
      const planMap = new Map(
        plans
          .filter((p): p is StrategicPlan => p !== null)
          .map((p) => [p.id, p]),
      );

      return ids.map((id) => planMap.get(id) || null);
    },
    {
      // Cache the results for the duration of the request
      cache: true,
      // Batch window in milliseconds
      batchScheduleFn: (callback) => setTimeout(callback, 10),
    },
  );
}

/**
 * Create all strategic planning related loaders
 */
export function createStrategicPlanningLoaders(context: DataLoaderContext) {
  return {
    strategicPlanLoader: createStrategicPlanLoader(context),
  };
}

export type StrategicPlanningLoaders = ReturnType<typeof createStrategicPlanningLoaders>;

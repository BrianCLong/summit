import DataLoader from 'dataloader';
import type { Entity } from '../../repos/EntityRepo.js';
import type { Investigation } from '../../repos/InvestigationRepo.js';
import { entityRepo, investigationRepo } from '../context/repositories.js';
import { observeDataloaderBatch } from '../../metrics/dataloaderMetrics.js';

const DEFAULT_TENANT = '__ALL__';

type EntityKey = { id: string; tenantId?: string | null };
type InvestigationKey = { id: string; tenantId?: string | null };

export interface GraphQLDataLoaders {
  entityById: DataLoader<EntityKey, Entity | null>;
  investigationById: DataLoader<InvestigationKey, Investigation | null>;
}

function compositeKey(id: string, tenantId: string | null | undefined): string {
  return `${tenantId ?? DEFAULT_TENANT}:${id}`;
}

function groupKeys(keys: readonly EntityKey[] | readonly InvestigationKey[]) {
  const map = new Map<string, string[]>();
  for (const key of keys) {
    const bucket = key.tenantId ?? DEFAULT_TENANT;
    if (!map.has(bucket)) {
      map.set(bucket, []);
    }
    map.get(bucket)!.push(key.id);
  }
  return map;
}

export function createLoaders(): GraphQLDataLoaders {
  const entityById = new DataLoader<EntityKey, Entity | null>(
    async (keys) => {
      observeDataloaderBatch('entityById', keys.length);
      const grouped = groupKeys(keys);
      const results = new Map<string, Entity | null>();

      for (const [tenantBucket, ids] of grouped.entries()) {
        const tenantId = tenantBucket === DEFAULT_TENANT ? undefined : tenantBucket;
        const entities = await entityRepo.batchByIds(ids, tenantId);
        ids.forEach((id, index) => {
          results.set(compositeKey(id, tenantBucket), entities[index] ?? null);
        });
      }

      return keys.map((key) => results.get(compositeKey(key.id, key.tenantId)) ?? null);
    },
    {
      cacheKeyFn: (key) => compositeKey(key.id, key.tenantId),
    },
  );

  const investigationById = new DataLoader<InvestigationKey, Investigation | null>(
    async (keys) => {
      observeDataloaderBatch('investigationById', keys.length);
      const grouped = groupKeys(keys);
      const results = new Map<string, Investigation | null>();

      for (const [tenantBucket, ids] of grouped.entries()) {
        const tenantId = tenantBucket === DEFAULT_TENANT ? undefined : tenantBucket;
        const investigations = await investigationRepo.batchByIds(ids, tenantId);
        ids.forEach((id, index) => {
          results.set(compositeKey(id, tenantBucket), investigations[index] ?? null);
        });
      }

      return keys.map((key) => results.get(compositeKey(key.id, key.tenantId)) ?? null);
    },
    {
      cacheKeyFn: (key) => compositeKey(key.id, key.tenantId),
    },
  );

  return { entityById, investigationById };
}

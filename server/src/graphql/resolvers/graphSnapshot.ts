import { createGraphSnapshot, restoreGraphSnapshot } from '../../graph/graphSnapshotService.ts';
import type {
  GraphSnapshotRecord,
  GraphSnapshotStorageMode,
  RestoreGraphSnapshotResult,
} from '../../graph/graphSnapshotService.ts';

const ADMIN_ROLES = new Set(['ADMIN', 'OPERATOR']);

function toGraphSnapshotResponse(record: GraphSnapshotRecord) {
  return {
    ...record,
    storage: record.storage.toUpperCase(),
    createdAt: record.createdAt.toISOString(),
    lastRestoredAt: record.lastRestoredAt ? record.lastRestoredAt.toISOString() : null,
  };
}

function normalizeStorage(storage?: string | null): GraphSnapshotStorageMode | undefined {
  if (!storage) return undefined;
  const normalized = storage.toLowerCase();
  if (normalized === 's3') return 's3';
  if (normalized === 'postgres') return 'postgres';
  return undefined;
}

export const graphSnapshotResolvers = {
  Mutation: {
    async createGraphSnapshot(_: unknown, args: { input: any }, ctx: any) {
      const role = ctx?.user?.role || 'VIEWER';
      if (!ADMIN_ROLES.has(role)) {
        throw new Error('forbidden');
      }

      const { input } = args;
      const tenantId = input?.tenantId ?? ctx?.user?.tenantId ?? null;
      const storage = normalizeStorage(input?.storage);

      const snapshot = await createGraphSnapshot({
        label: input?.label,
        description: input?.description,
        tenantId,
        storage,
      });

      return toGraphSnapshotResponse(snapshot);
    },

    async restoreGraphSnapshot(_: unknown, args: { input: any }, ctx: any) {
      const role = ctx?.user?.role || 'VIEWER';
      if (!ADMIN_ROLES.has(role)) {
        throw new Error('forbidden');
      }

      const { input } = args;
      const tenantId = input?.tenantId ?? ctx?.user?.tenantId ?? null;

      const result: RestoreGraphSnapshotResult = await restoreGraphSnapshot({
        snapshotId: input?.snapshotId,
        tenantId,
        clearExisting: input?.clearExisting ?? true,
      });

      return {
        snapshot: toGraphSnapshotResponse(result.snapshot),
        restoredNodeCount: result.restoredNodeCount,
        restoredRelationshipCount: result.restoredRelationshipCount,
        message: 'Graph snapshot restored successfully.',
      };
    },
  },
};

export default graphSnapshotResolvers;


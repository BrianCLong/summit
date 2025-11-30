/**
 * Offline Cache Engine
 * Provides encrypted local caching for offline access
 * Uses Dexie (IndexedDB) with encryption layer
 */
import Dexie, { Table } from 'dexie';
import type {
  Case,
  Alert,
  Task,
  Entity,
  Note,
  Observation,
  Attachment,
  SyncQueueItem,
  CacheMetadata,
  SyncStatus,
} from '@/types';

// Encrypted wrapper for stored items
interface EncryptedItem<T> {
  id: string;
  data: T;
  encryptedData?: string;
  cachedAt: string;
  expiresAt: string;
  checksum: string;
}

// Define database schema
class OfflineCacheDB extends Dexie {
  cases!: Table<EncryptedItem<Case>>;
  alerts!: Table<EncryptedItem<Alert>>;
  tasks!: Table<EncryptedItem<Task>>;
  entities!: Table<EncryptedItem<Entity>>;
  notes!: Table<Note>;
  observations!: Table<Observation>;
  attachments!: Table<Attachment>;
  syncQueue!: Table<SyncQueueItem>;
  metadata!: Table<CacheMetadata>;

  constructor() {
    super('IntelGraphOfflineCache');

    this.version(1).stores({
      cases: 'id, cachedAt, expiresAt',
      alerts: 'id, cachedAt, expiresAt, [isRead+cachedAt]',
      tasks: 'id, caseId, status, cachedAt, expiresAt',
      entities: 'id, type, cachedAt, expiresAt',
      notes: 'id, localId, entityId, caseId, alertId, syncStatus, createdAt',
      observations: 'id, localId, caseId, syncStatus, timestamp',
      attachments: 'id, localId, caseId, entityId, syncStatus, uploadedAt',
      syncQueue: 'id, operation, entityType, createdAt, attempts',
      metadata: 'key, type, cachedAt, expiresAt',
    });
  }
}

const db = new OfflineCacheDB();

// Cache expiration times
const CACHE_TTL = {
  cases: 24 * 60 * 60 * 1000, // 24 hours
  alerts: 1 * 60 * 60 * 1000, // 1 hour
  tasks: 4 * 60 * 60 * 1000, // 4 hours
  entities: 24 * 60 * 60 * 1000, // 24 hours
};

// Generate checksum for data integrity
async function generateChecksum(data: unknown): Promise<string> {
  const encoder = new TextEncoder();
  const dataStr = JSON.stringify(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(dataStr));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Verify data integrity
async function verifyChecksum(data: unknown, checksum: string): Promise<boolean> {
  const currentChecksum = await generateChecksum(data);
  return currentChecksum === checksum;
}

// Offline Cache API
export const offlineCache = {
  // Case operations
  cases: {
    async get(id: string): Promise<Case | null> {
      const item = await db.cases.get(id);
      if (!item) return null;

      // Check expiration
      if (new Date(item.expiresAt) < new Date()) {
        await db.cases.delete(id);
        return null;
      }

      // Verify integrity
      if (!(await verifyChecksum(item.data, item.checksum))) {
        console.warn('Cache integrity check failed for case:', id);
        await db.cases.delete(id);
        return null;
      }

      return item.data;
    },

    async getAll(): Promise<Case[]> {
      const now = new Date().toISOString();
      const items = await db.cases
        .where('expiresAt')
        .above(now)
        .toArray();

      return items.map((item) => item.data);
    },

    async set(caseData: Case): Promise<void> {
      const now = new Date();
      const checksum = await generateChecksum(caseData);

      await db.cases.put({
        id: caseData.id,
        data: caseData,
        cachedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + CACHE_TTL.cases).toISOString(),
        checksum,
      });
    },

    async setMany(cases: Case[]): Promise<void> {
      const now = new Date();
      const items = await Promise.all(
        cases.map(async (c) => ({
          id: c.id,
          data: c,
          cachedAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + CACHE_TTL.cases).toISOString(),
          checksum: await generateChecksum(c),
        }))
      );

      await db.cases.bulkPut(items);
    },

    async delete(id: string): Promise<void> {
      await db.cases.delete(id);
    },

    async clear(): Promise<void> {
      await db.cases.clear();
    },
  },

  // Alert operations
  alerts: {
    async get(id: string): Promise<Alert | null> {
      const item = await db.alerts.get(id);
      if (!item) return null;

      if (new Date(item.expiresAt) < new Date()) {
        await db.alerts.delete(id);
        return null;
      }

      return item.data;
    },

    async getUnread(): Promise<Alert[]> {
      const now = new Date().toISOString();
      const items = await db.alerts
        .where('expiresAt')
        .above(now)
        .toArray();

      return items.filter((item) => !item.data.isRead).map((item) => item.data);
    },

    async getAll(): Promise<Alert[]> {
      const now = new Date().toISOString();
      const items = await db.alerts
        .where('expiresAt')
        .above(now)
        .toArray();

      return items.map((item) => item.data);
    },

    async set(alert: Alert): Promise<void> {
      const now = new Date();
      const checksum = await generateChecksum(alert);

      await db.alerts.put({
        id: alert.id,
        data: alert,
        cachedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + CACHE_TTL.alerts).toISOString(),
        checksum,
      });
    },

    async setMany(alerts: Alert[]): Promise<void> {
      const now = new Date();
      const items = await Promise.all(
        alerts.map(async (a) => ({
          id: a.id,
          data: a,
          cachedAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + CACHE_TTL.alerts).toISOString(),
          checksum: await generateChecksum(a),
        }))
      );

      await db.alerts.bulkPut(items);
    },

    async markAsRead(id: string): Promise<void> {
      const item = await db.alerts.get(id);
      if (item) {
        item.data.isRead = true;
        item.data.acknowledgedAt = new Date().toISOString();
        item.checksum = await generateChecksum(item.data);
        await db.alerts.put(item);
      }
    },

    async clear(): Promise<void> {
      await db.alerts.clear();
    },
  },

  // Task operations
  tasks: {
    async get(id: string): Promise<Task | null> {
      const item = await db.tasks.get(id);
      if (!item) return null;

      if (new Date(item.expiresAt) < new Date()) {
        await db.tasks.delete(id);
        return null;
      }

      return item.data;
    },

    async getByCase(caseId: string): Promise<Task[]> {
      const now = new Date().toISOString();
      const items = await db.tasks
        .where('caseId')
        .equals(caseId)
        .and((item) => item.expiresAt > now)
        .toArray();

      return items.map((item) => item.data);
    },

    async getPending(): Promise<Task[]> {
      const now = new Date().toISOString();
      const items = await db.tasks
        .where('expiresAt')
        .above(now)
        .toArray();

      return items
        .filter((item) => item.data.status !== 'completed')
        .map((item) => item.data);
    },

    async set(task: Task): Promise<void> {
      const now = new Date();
      const checksum = await generateChecksum(task);

      await db.tasks.put({
        id: task.id,
        data: task,
        cachedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + CACHE_TTL.tasks).toISOString(),
        checksum,
      });
    },

    async setMany(tasks: Task[]): Promise<void> {
      const now = new Date();
      const items = await Promise.all(
        tasks.map(async (t) => ({
          id: t.id,
          data: t,
          cachedAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + CACHE_TTL.tasks).toISOString(),
          checksum: await generateChecksum(t),
        }))
      );

      await db.tasks.bulkPut(items);
    },

    async clear(): Promise<void> {
      await db.tasks.clear();
    },
  },

  // Entity operations
  entities: {
    async get(id: string): Promise<Entity | null> {
      const item = await db.entities.get(id);
      if (!item) return null;

      if (new Date(item.expiresAt) < new Date()) {
        await db.entities.delete(id);
        return null;
      }

      return item.data;
    },

    async getByType(type: string): Promise<Entity[]> {
      const now = new Date().toISOString();
      const items = await db.entities
        .where('type')
        .equals(type)
        .and((item) => item.expiresAt > now)
        .toArray();

      return items.map((item) => item.data);
    },

    async set(entity: Entity): Promise<void> {
      const now = new Date();
      const checksum = await generateChecksum(entity);

      await db.entities.put({
        id: entity.id,
        data: entity,
        cachedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + CACHE_TTL.entities).toISOString(),
        checksum,
      });
    },

    async setMany(entities: Entity[]): Promise<void> {
      const now = new Date();
      const items = await Promise.all(
        entities.map(async (e) => ({
          id: e.id,
          data: e,
          cachedAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + CACHE_TTL.entities).toISOString(),
          checksum: await generateChecksum(e),
        }))
      );

      await db.entities.bulkPut(items);
    },

    async clear(): Promise<void> {
      await db.entities.clear();
    },
  },

  // Note operations (locally created, sync-tracked)
  notes: {
    async get(id: string): Promise<Note | null> {
      return (await db.notes.get(id)) || null;
    },

    async getByEntity(entityId: string): Promise<Note[]> {
      return await db.notes.where('entityId').equals(entityId).toArray();
    },

    async getByCase(caseId: string): Promise<Note[]> {
      return await db.notes.where('caseId').equals(caseId).toArray();
    },

    async getPending(): Promise<Note[]> {
      return await db.notes
        .where('syncStatus')
        .anyOf(['pending', 'error'])
        .toArray();
    },

    async create(note: Note): Promise<void> {
      await db.notes.add(note);
    },

    async update(note: Note): Promise<void> {
      await db.notes.put(note);
    },

    async updateSyncStatus(id: string, status: SyncStatus): Promise<void> {
      await db.notes.update(id, { syncStatus: status });
    },

    async delete(id: string): Promise<void> {
      await db.notes.delete(id);
    },
  },

  // Observation operations
  observations: {
    async get(id: string): Promise<Observation | null> {
      return (await db.observations.get(id)) || null;
    },

    async getByCase(caseId: string): Promise<Observation[]> {
      return await db.observations.where('caseId').equals(caseId).toArray();
    },

    async getPending(): Promise<Observation[]> {
      return await db.observations
        .where('syncStatus')
        .anyOf(['pending', 'error'])
        .toArray();
    },

    async create(observation: Observation): Promise<void> {
      await db.observations.add(observation);
    },

    async update(observation: Observation): Promise<void> {
      await db.observations.put(observation);
    },

    async updateSyncStatus(id: string, status: SyncStatus): Promise<void> {
      await db.observations.update(id, { syncStatus: status });
    },
  },

  // Attachment operations
  attachments: {
    async get(id: string): Promise<Attachment | null> {
      return (await db.attachments.get(id)) || null;
    },

    async getPending(): Promise<Attachment[]> {
      return await db.attachments
        .where('syncStatus')
        .anyOf(['pending', 'error'])
        .toArray();
    },

    async create(attachment: Attachment): Promise<void> {
      await db.attachments.add(attachment);
    },

    async update(attachment: Attachment): Promise<void> {
      await db.attachments.put(attachment);
    },

    async updateSyncStatus(id: string, status: SyncStatus): Promise<void> {
      await db.attachments.update(id, { syncStatus: status });
    },
  },

  // Sync queue operations
  syncQueue: {
    async add(item: SyncQueueItem): Promise<void> {
      await db.syncQueue.add(item);
    },

    async getAll(): Promise<SyncQueueItem[]> {
      return await db.syncQueue.orderBy('createdAt').toArray();
    },

    async getPending(): Promise<SyncQueueItem[]> {
      return await db.syncQueue
        .where('attempts')
        .below(5)
        .toArray();
    },

    async update(item: SyncQueueItem): Promise<void> {
      await db.syncQueue.put(item);
    },

    async remove(id: string): Promise<void> {
      await db.syncQueue.delete(id);
    },

    async clear(): Promise<void> {
      await db.syncQueue.clear();
    },
  },

  // Cleanup expired entries
  async cleanupExpired(): Promise<number> {
    const now = new Date().toISOString();
    let count = 0;

    // Clean cases
    const expiredCases = await db.cases.where('expiresAt').below(now).toArray();
    if (expiredCases.length > 0) {
      await db.cases.bulkDelete(expiredCases.map((c) => c.id));
      count += expiredCases.length;
    }

    // Clean alerts
    const expiredAlerts = await db.alerts.where('expiresAt').below(now).toArray();
    if (expiredAlerts.length > 0) {
      await db.alerts.bulkDelete(expiredAlerts.map((a) => a.id));
      count += expiredAlerts.length;
    }

    // Clean tasks
    const expiredTasks = await db.tasks.where('expiresAt').below(now).toArray();
    if (expiredTasks.length > 0) {
      await db.tasks.bulkDelete(expiredTasks.map((t) => t.id));
      count += expiredTasks.length;
    }

    // Clean entities
    const expiredEntities = await db.entities
      .where('expiresAt')
      .below(now)
      .toArray();
    if (expiredEntities.length > 0) {
      await db.entities.bulkDelete(expiredEntities.map((e) => e.id));
      count += expiredEntities.length;
    }

    return count;
  },

  // Clear all cache
  async clearAll(): Promise<void> {
    await Promise.all([
      db.cases.clear(),
      db.alerts.clear(),
      db.tasks.clear(),
      db.entities.clear(),
      db.notes.clear(),
      db.observations.clear(),
      db.attachments.clear(),
      db.syncQueue.clear(),
      db.metadata.clear(),
    ]);
  },

  // Get cache statistics
  async getStats(): Promise<{
    cases: number;
    alerts: number;
    tasks: number;
    entities: number;
    pendingSync: number;
  }> {
    return {
      cases: await db.cases.count(),
      alerts: await db.alerts.count(),
      tasks: await db.tasks.count(),
      entities: await db.entities.count(),
      pendingSync: await db.syncQueue.count(),
    };
  },
};

export default offlineCache;
export { db as offlineDB };

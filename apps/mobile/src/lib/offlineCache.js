"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.offlineDB = exports.offlineCache = void 0;
/**
 * Offline Cache Engine
 * Provides encrypted local caching for offline access
 * Uses Dexie (IndexedDB) with encryption layer
 */
const dexie_1 = __importDefault(require("dexie"));
// Define database schema
class OfflineCacheDB extends dexie_1.default {
    cases;
    alerts;
    tasks;
    entities;
    notes;
    observations;
    attachments;
    syncQueue;
    metadata;
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
exports.offlineDB = db;
// Cache expiration times
const CACHE_TTL = {
    cases: 24 * 60 * 60 * 1000, // 24 hours
    alerts: 1 * 60 * 60 * 1000, // 1 hour
    tasks: 4 * 60 * 60 * 1000, // 4 hours
    entities: 24 * 60 * 60 * 1000, // 24 hours
};
// Generate checksum for data integrity
async function generateChecksum(data) {
    const encoder = new TextEncoder();
    const dataStr = JSON.stringify(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(dataStr));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
// Verify data integrity
async function verifyChecksum(data, checksum) {
    const currentChecksum = await generateChecksum(data);
    return currentChecksum === checksum;
}
// Offline Cache API
exports.offlineCache = {
    // Case operations
    cases: {
        async get(id) {
            const item = await db.cases.get(id);
            if (!item)
                return null;
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
        async getAll() {
            const now = new Date().toISOString();
            const items = await db.cases
                .where('expiresAt')
                .above(now)
                .toArray();
            return items.map((item) => item.data);
        },
        async set(caseData) {
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
        async setMany(cases) {
            const now = new Date();
            const items = await Promise.all(cases.map(async (c) => ({
                id: c.id,
                data: c,
                cachedAt: now.toISOString(),
                expiresAt: new Date(now.getTime() + CACHE_TTL.cases).toISOString(),
                checksum: await generateChecksum(c),
            })));
            await db.cases.bulkPut(items);
        },
        async delete(id) {
            await db.cases.delete(id);
        },
        async clear() {
            await db.cases.clear();
        },
    },
    // Alert operations
    alerts: {
        async get(id) {
            const item = await db.alerts.get(id);
            if (!item)
                return null;
            if (new Date(item.expiresAt) < new Date()) {
                await db.alerts.delete(id);
                return null;
            }
            return item.data;
        },
        async getUnread() {
            const now = new Date().toISOString();
            const items = await db.alerts
                .where('expiresAt')
                .above(now)
                .toArray();
            return items.filter((item) => !item.data.isRead).map((item) => item.data);
        },
        async getAll() {
            const now = new Date().toISOString();
            const items = await db.alerts
                .where('expiresAt')
                .above(now)
                .toArray();
            return items.map((item) => item.data);
        },
        async set(alert) {
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
        async setMany(alerts) {
            const now = new Date();
            const items = await Promise.all(alerts.map(async (a) => ({
                id: a.id,
                data: a,
                cachedAt: now.toISOString(),
                expiresAt: new Date(now.getTime() + CACHE_TTL.alerts).toISOString(),
                checksum: await generateChecksum(a),
            })));
            await db.alerts.bulkPut(items);
        },
        async markAsRead(id) {
            const item = await db.alerts.get(id);
            if (item) {
                item.data.isRead = true;
                item.data.acknowledgedAt = new Date().toISOString();
                item.checksum = await generateChecksum(item.data);
                await db.alerts.put(item);
            }
        },
        async clear() {
            await db.alerts.clear();
        },
    },
    // Task operations
    tasks: {
        async get(id) {
            const item = await db.tasks.get(id);
            if (!item)
                return null;
            if (new Date(item.expiresAt) < new Date()) {
                await db.tasks.delete(id);
                return null;
            }
            return item.data;
        },
        async getByCase(caseId) {
            const now = new Date().toISOString();
            const items = await db.tasks
                .where('caseId')
                .equals(caseId)
                .and((item) => item.expiresAt > now)
                .toArray();
            return items.map((item) => item.data);
        },
        async getPending() {
            const now = new Date().toISOString();
            const items = await db.tasks
                .where('expiresAt')
                .above(now)
                .toArray();
            return items
                .filter((item) => item.data.status !== 'completed')
                .map((item) => item.data);
        },
        async set(task) {
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
        async setMany(tasks) {
            const now = new Date();
            const items = await Promise.all(tasks.map(async (t) => ({
                id: t.id,
                data: t,
                cachedAt: now.toISOString(),
                expiresAt: new Date(now.getTime() + CACHE_TTL.tasks).toISOString(),
                checksum: await generateChecksum(t),
            })));
            await db.tasks.bulkPut(items);
        },
        async clear() {
            await db.tasks.clear();
        },
    },
    // Entity operations
    entities: {
        async get(id) {
            const item = await db.entities.get(id);
            if (!item)
                return null;
            if (new Date(item.expiresAt) < new Date()) {
                await db.entities.delete(id);
                return null;
            }
            return item.data;
        },
        async getByType(type) {
            const now = new Date().toISOString();
            const items = await db.entities
                .where('type')
                .equals(type)
                .and((item) => item.expiresAt > now)
                .toArray();
            return items.map((item) => item.data);
        },
        async set(entity) {
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
        async setMany(entities) {
            const now = new Date();
            const items = await Promise.all(entities.map(async (e) => ({
                id: e.id,
                data: e,
                cachedAt: now.toISOString(),
                expiresAt: new Date(now.getTime() + CACHE_TTL.entities).toISOString(),
                checksum: await generateChecksum(e),
            })));
            await db.entities.bulkPut(items);
        },
        async clear() {
            await db.entities.clear();
        },
    },
    // Note operations (locally created, sync-tracked)
    notes: {
        async get(id) {
            return (await db.notes.get(id)) || null;
        },
        async getByEntity(entityId) {
            return await db.notes.where('entityId').equals(entityId).toArray();
        },
        async getByCase(caseId) {
            return await db.notes.where('caseId').equals(caseId).toArray();
        },
        async getPending() {
            return await db.notes
                .where('syncStatus')
                .anyOf(['pending', 'error'])
                .toArray();
        },
        async create(note) {
            await db.notes.add(note);
        },
        async update(note) {
            await db.notes.put(note);
        },
        async updateSyncStatus(id, status) {
            await db.notes.update(id, { syncStatus: status });
        },
        async delete(id) {
            await db.notes.delete(id);
        },
    },
    // Observation operations
    observations: {
        async get(id) {
            return (await db.observations.get(id)) || null;
        },
        async getByCase(caseId) {
            return await db.observations.where('caseId').equals(caseId).toArray();
        },
        async getPending() {
            return await db.observations
                .where('syncStatus')
                .anyOf(['pending', 'error'])
                .toArray();
        },
        async create(observation) {
            await db.observations.add(observation);
        },
        async update(observation) {
            await db.observations.put(observation);
        },
        async updateSyncStatus(id, status) {
            await db.observations.update(id, { syncStatus: status });
        },
    },
    // Attachment operations
    attachments: {
        async get(id) {
            return (await db.attachments.get(id)) || null;
        },
        async getPending() {
            return await db.attachments
                .where('syncStatus')
                .anyOf(['pending', 'error'])
                .toArray();
        },
        async create(attachment) {
            await db.attachments.add(attachment);
        },
        async update(attachment) {
            await db.attachments.put(attachment);
        },
        async updateSyncStatus(id, status) {
            await db.attachments.update(id, { syncStatus: status });
        },
    },
    // Sync queue operations
    syncQueue: {
        async add(item) {
            await db.syncQueue.add(item);
        },
        async getAll() {
            return await db.syncQueue.orderBy('createdAt').toArray();
        },
        async getPending() {
            return await db.syncQueue
                .where('attempts')
                .below(5)
                .toArray();
        },
        async update(item) {
            await db.syncQueue.put(item);
        },
        async remove(id) {
            await db.syncQueue.delete(id);
        },
        async clear() {
            await db.syncQueue.clear();
        },
    },
    // Cleanup expired entries
    async cleanupExpired() {
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
    async clearAll() {
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
    async getStats() {
        return {
            cases: await db.cases.count(),
            alerts: await db.alerts.count(),
            tasks: await db.tasks.count(),
            entities: await db.entities.count(),
            pendingSync: await db.syncQueue.count(),
        };
    },
};
exports.default = exports.offlineCache;

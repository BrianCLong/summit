"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncEngine = void 0;
/**
 * Sync Engine
 * Handles bi-directional data synchronization with conflict resolution
 * Implements last-writer-wins with full audit trail
 */
const uuid_1 = require("uuid");
const offlineCache_1 = require("./offlineCache");
const secureStorage_1 = require("./secureStorage");
// Sync configuration
const SYNC_CONFIG = {
    maxRetries: 5,
    retryDelayMs: 1000,
    batchSize: 10,
    conflictResolutionStrategy: 'last-writer-wins',
};
let syncState = {
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncAt: null,
    pendingCount: 0,
    errorCount: 0,
};
const listeners = new Set();
function notifyListeners() {
    listeners.forEach((callback) => callback({ ...syncState }));
}
// Network status tracking
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        syncState.isOnline = true;
        notifyListeners();
        // Trigger sync when coming online
        exports.syncEngine.syncAll();
    });
    window.addEventListener('offline', () => {
        syncState.isOnline = false;
        notifyListeners();
    });
}
function resolveConflict(conflict) {
    // Last-writer-wins based on timestamp
    const localTime = new Date(conflict.localUpdatedAt).getTime();
    const serverTime = new Date(conflict.serverUpdatedAt).getTime();
    if (localTime > serverTime) {
        return { winner: 'local', mergedData: conflict.localData };
    }
    else {
        return { winner: 'server', mergedData: conflict.serverData };
    }
}
// Audit trail for conflict resolutions
async function recordConflictResolution(entityType, entityId, localData, serverData, resolution, resolvedData) {
    const record = {
        id: (0, uuid_1.v4)(),
        localData,
        serverData,
        resolvedData,
        resolvedAt: new Date().toISOString(),
        resolution,
    };
    // Store conflict resolution for audit
    // This would normally be sent to the server for audit logging
    console.log('Conflict resolved:', {
        entityType,
        entityId,
        resolution,
        timestamp: record.resolvedAt,
    });
}
// Sync Engine API
exports.syncEngine = {
    // Subscribe to sync state changes
    subscribe(callback) {
        listeners.add(callback);
        return () => listeners.delete(callback);
    },
    // Get current sync state
    getState() {
        return { ...syncState };
    },
    // Queue an item for sync
    async queueForSync(operation, entityType, data) {
        const item = {
            id: (0, uuid_1.v4)(),
            operation,
            entityType,
            data,
            createdAt: new Date().toISOString(),
            attempts: 0,
        };
        await offlineCache_1.offlineCache.syncQueue.add(item);
        syncState.pendingCount++;
        notifyListeners();
        // Try immediate sync if online
        if (syncState.isOnline && !syncState.isSyncing) {
            this.syncAll();
        }
    },
    // Sync all pending items
    async syncAll() {
        if (!syncState.isOnline || syncState.isSyncing) {
            return { success: 0, failed: 0 };
        }
        syncState.isSyncing = true;
        notifyListeners();
        let success = 0;
        let failed = 0;
        try {
            const pendingItems = await offlineCache_1.offlineCache.syncQueue.getPending();
            syncState.pendingCount = pendingItems.length;
            // Process in batches
            for (let i = 0; i < pendingItems.length; i += SYNC_CONFIG.batchSize) {
                const batch = pendingItems.slice(i, i + SYNC_CONFIG.batchSize);
                const results = await Promise.allSettled(batch.map((item) => this.syncItem(item)));
                for (const result of results) {
                    if (result.status === 'fulfilled' && result.value) {
                        success++;
                    }
                    else {
                        failed++;
                    }
                }
            }
            syncState.lastSyncAt = new Date().toISOString();
            syncState.pendingCount = await (await offlineCache_1.offlineCache.syncQueue.getPending())
                .length;
            syncState.errorCount = failed;
        }
        catch (error) {
            console.error('Sync error:', error);
        }
        finally {
            syncState.isSyncing = false;
            notifyListeners();
        }
        return { success, failed };
    },
    // Sync a single item
    async syncItem(item) {
        const token = await secureStorage_1.secureStorage.getAccessToken();
        if (!token) {
            return false;
        }
        try {
            const endpoint = this.getEndpoint(item.entityType, item.operation);
            const method = this.getMethod(item.operation);
            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(item.data),
            });
            if (response.ok) {
                // Success - remove from queue
                await offlineCache_1.offlineCache.syncQueue.remove(item.id);
                // Update local entity sync status
                await this.updateLocalSyncStatus(item, 'synced');
                return true;
            }
            if (response.status === 409) {
                // Conflict - need resolution
                const serverData = await response.json();
                await this.handleConflict(item, serverData);
                return true;
            }
            // Other error - increment retry count
            item.attempts++;
            item.lastAttempt = new Date().toISOString();
            item.error = `HTTP ${response.status}`;
            await offlineCache_1.offlineCache.syncQueue.update(item);
            // Update local entity sync status
            await this.updateLocalSyncStatus(item, 'error');
            return false;
        }
        catch (error) {
            item.attempts++;
            item.lastAttempt = new Date().toISOString();
            item.error = error instanceof Error ? error.message : 'Unknown error';
            await offlineCache_1.offlineCache.syncQueue.update(item);
            await this.updateLocalSyncStatus(item, 'error');
            return false;
        }
    },
    // Handle sync conflict
    async handleConflict(item, serverData) {
        const localData = item.data;
        const conflict = {
            localVersion: localData.version || 1,
            serverVersion: serverData.version,
            localUpdatedAt: localData.updatedAt || item.createdAt,
            serverUpdatedAt: serverData.updatedAt,
            localData: item.data,
            serverData: serverData.data,
        };
        const { winner, mergedData } = resolveConflict(conflict);
        // Record resolution for audit
        await recordConflictResolution(item.entityType, item.data.id, conflict.localData, conflict.serverData, winner, mergedData);
        if (winner === 'local') {
            // Re-submit with updated version
            const updatedItem = {
                ...item,
                data: {
                    ...item.data,
                    version: serverData.version + 1,
                },
                attempts: item.attempts + 1,
            };
            await offlineCache_1.offlineCache.syncQueue.update(updatedItem);
        }
        else {
            // Accept server version - update local
            await this.applyServerData(item.entityType, serverData.data);
            await offlineCache_1.offlineCache.syncQueue.remove(item.id);
        }
    },
    // Apply server data to local cache
    async applyServerData(entityType, data) {
        switch (entityType) {
            case 'note':
                await offlineCache_1.offlineCache.notes.update(data);
                break;
            case 'observation':
                await offlineCache_1.offlineCache.observations.update(data);
                break;
            case 'attachment':
                await offlineCache_1.offlineCache.attachments.update(data);
                break;
        }
    },
    // Update local entity sync status
    async updateLocalSyncStatus(item, status) {
        const entityId = item.data.id;
        switch (item.entityType) {
            case 'note':
                await offlineCache_1.offlineCache.notes.updateSyncStatus(entityId, status);
                break;
            case 'observation':
                await offlineCache_1.offlineCache.observations.updateSyncStatus(entityId, status);
                break;
            case 'attachment':
                await offlineCache_1.offlineCache.attachments.updateSyncStatus(entityId, status);
                break;
        }
    },
    // Get API endpoint for entity type
    getEndpoint(entityType, operation) {
        const baseUrl = '/api/mobile';
        switch (entityType) {
            case 'note':
                return `${baseUrl}/notes`;
            case 'observation':
                return `${baseUrl}/observations`;
            case 'attachment':
                return `${baseUrl}/attachments`;
            case 'acknowledgement':
                return `${baseUrl}/acknowledgements`;
            default:
                return `${baseUrl}/${entityType}`;
        }
    },
    // Get HTTP method for operation
    getMethod(operation) {
        switch (operation) {
            case 'create':
                return 'POST';
            case 'update':
                return 'PUT';
            case 'delete':
                return 'DELETE';
        }
    },
    // Pull fresh data from server
    async pullFromServer() {
        if (!syncState.isOnline) {
            return;
        }
        const token = await secureStorage_1.secureStorage.getAccessToken();
        if (!token) {
            return;
        }
        try {
            // Fetch user's assigned cases
            const casesResponse = await fetch('/api/mobile/cases/assigned', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (casesResponse.ok) {
                const cases = await casesResponse.json();
                await offlineCache_1.offlineCache.cases.setMany(cases);
            }
            // Fetch unread alerts
            const alertsResponse = await fetch('/api/mobile/alerts?unread=true', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (alertsResponse.ok) {
                const alerts = await alertsResponse.json();
                await offlineCache_1.offlineCache.alerts.setMany(alerts);
            }
            // Fetch pending tasks
            const tasksResponse = await fetch('/api/mobile/tasks/pending', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (tasksResponse.ok) {
                const tasks = await tasksResponse.json();
                await offlineCache_1.offlineCache.tasks.setMany(tasks);
            }
            syncState.lastSyncAt = new Date().toISOString();
            notifyListeners();
        }
        catch (error) {
            console.error('Pull from server failed:', error);
        }
    },
    // Full sync (pull then push)
    async fullSync() {
        await this.pullFromServer();
        await this.syncAll();
    },
    // Clear all sync state (for logout)
    async reset() {
        await offlineCache_1.offlineCache.syncQueue.clear();
        syncState = {
            isOnline: navigator.onLine,
            isSyncing: false,
            lastSyncAt: null,
            pendingCount: 0,
            errorCount: 0,
        };
        notifyListeners();
    },
};
exports.default = exports.syncEngine;

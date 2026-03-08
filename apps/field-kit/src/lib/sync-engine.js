"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncEngine = void 0;
const storage_1 = require("./storage");
class SyncEngine {
    isSyncing = false;
    online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    constructor() {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                this.online = true;
                this.processQueue();
            });
            window.addEventListener('offline', () => {
                this.online = false;
            });
        }
    }
    async enqueue(item) {
        await storage_1.storage.queueSyncItem(item);
        if (this.online) {
            this.processQueue();
        }
    }
    async processQueue() {
        if (this.isSyncing || !this.online) {
            return;
        }
        this.isSyncing = true;
        try {
            let item = await storage_1.storage.getNextSyncItem();
            while (item && this.online) {
                try {
                    await this.syncItem(item);
                    await storage_1.storage.removeSyncItem(item.id);
                }
                catch (_error) {
                    // Implement retry logic or backoff here
                    break;
                }
                item = await storage_1.storage.getNextSyncItem();
            }
        }
        finally {
            this.isSyncing = false;
        }
    }
    async syncItem(_item) {
        // Mock API call
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        // In a real implementation, this would use fetch/axios to call the IntelGraph API
        // e.g., await api.post(`/api/v1/ingest/${item.type}`, item.payload);
        return true;
    }
}
exports.syncEngine = new SyncEngine();

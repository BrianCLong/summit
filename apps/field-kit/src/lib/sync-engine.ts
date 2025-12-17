import { storage } from './storage';
import { SyncQueueItem } from '../types';

class SyncEngine {
  private isSyncing = false;
  private online = typeof navigator !== 'undefined' ? navigator.onLine : true;

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

  async enqueue(item: SyncQueueItem) {
    await storage.queueSyncItem(item);
    if (this.online) {
      this.processQueue();
    }
  }

  private async processQueue() {
    if (this.isSyncing || !this.online) {
      return;
    }

    this.isSyncing = true;
    try {
      let item = await storage.getNextSyncItem();
      while (item && this.online) {
        try {
          await this.syncItem(item);
          await storage.removeSyncItem(item.id);
        } catch (_error) {
          // Implement retry logic or backoff here
          break;
        }
        item = await storage.getNextSyncItem();
      }
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncItem(_item: SyncQueueItem) {
    // Mock API call

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // In a real implementation, this would use fetch/axios to call the IntelGraph API
    // e.g., await api.post(`/api/v1/ingest/${item.type}`, item.payload);

    return true;
  }
}

export const syncEngine = new SyncEngine();

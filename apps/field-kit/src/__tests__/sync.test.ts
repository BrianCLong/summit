import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storage } from '../lib/storage';
import { syncEngine } from '../lib/sync-engine';
import { SyncQueueItem } from '../types';

// Mock storage
vi.mock('../lib/storage', () => ({
  storage: {
    queueSyncItem: vi.fn(),
    getNextSyncItem: vi.fn(),
    removeSyncItem: vi.fn(),
    saveCase: vi.fn(),
    getAllCases: vi.fn(),
  }
}));

describe('SyncEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queues an item when offline', async () => {
    const item: SyncQueueItem = {
      id: '123',
      type: 'note',
      action: 'create',
      payload: {},
      timestamp: Date.now(),
      retries: 0
    };

    // Simulate offline
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    await syncEngine.enqueue(item);
    expect(storage.queueSyncItem).toHaveBeenCalledWith(item);
  });

  it('processes queue when online', async () => {
    const item: SyncQueueItem = {
      id: '123',
      type: 'note',
      action: 'create',
      payload: {},
      timestamp: Date.now(),
      retries: 0
    };

    // Simulate online
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

    // Trigger online event to update the syncEngine state
    window.dispatchEvent(new Event('online'));

    // Mock getting items
    (storage.getNextSyncItem as any)
      .mockResolvedValueOnce(item)
      .mockResolvedValueOnce(null);

    await syncEngine.enqueue(item);

    expect(storage.queueSyncItem).toHaveBeenCalledWith(item);
    // Should call getNextSyncItem to process
    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 600));

    expect(storage.getNextSyncItem).toHaveBeenCalled();
    // Should remove after processing
    expect(storage.removeSyncItem).toHaveBeenCalledWith('123');
  });
});

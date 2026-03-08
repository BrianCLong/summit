"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const storage_1 = require("../lib/storage");
const sync_engine_1 = require("../lib/sync-engine");
// Mock storage
vitest_1.vi.mock('../lib/storage', () => ({
    storage: {
        queueSyncItem: vitest_1.vi.fn(),
        getNextSyncItem: vitest_1.vi.fn(),
        removeSyncItem: vitest_1.vi.fn(),
        saveCase: vitest_1.vi.fn(),
        getAllCases: vitest_1.vi.fn(),
    }
}));
(0, vitest_1.describe)('SyncEngine', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.it)('queues an item when offline', async () => {
        const item = {
            id: '123',
            type: 'note',
            action: 'create',
            payload: {},
            timestamp: Date.now(),
            retries: 0
        };
        // Simulate offline
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
        await sync_engine_1.syncEngine.enqueue(item);
        (0, vitest_1.expect)(storage_1.storage.queueSyncItem).toHaveBeenCalledWith(item);
    });
    (0, vitest_1.it)('processes queue when online', async () => {
        const item = {
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
        storage_1.storage.getNextSyncItem
            .mockResolvedValueOnce(item)
            .mockResolvedValueOnce(null);
        await sync_engine_1.syncEngine.enqueue(item);
        (0, vitest_1.expect)(storage_1.storage.queueSyncItem).toHaveBeenCalledWith(item);
        // Should call getNextSyncItem to process
        // Wait for async processing
        await new Promise(resolve => setTimeout(resolve, 600));
        (0, vitest_1.expect)(storage_1.storage.getNextSyncItem).toHaveBeenCalled();
        // Should remove after processing
        (0, vitest_1.expect)(storage_1.storage.removeSyncItem).toHaveBeenCalledWith('123');
    });
});

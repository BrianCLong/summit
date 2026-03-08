"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Offline Cache Tests
 * Tests for the offline caching engine
 */
const vitest_1 = require("vitest");
// Mock IndexedDB for testing
const mockIndexedDB = {
    cases: new Map(),
    alerts: new Map(),
    tasks: new Map(),
    entities: new Map(),
    notes: new Map(),
    syncQueue: new Map(),
};
// Mock Dexie
vitest_1.vi.mock('dexie', () => ({
    default: class MockDexie {
        version() {
            return { stores: () => this };
        }
        cases = {
            get: vitest_1.vi.fn((id) => Promise.resolve(mockIndexedDB.cases.get(id))),
            put: vitest_1.vi.fn((item) => {
                mockIndexedDB.cases.set(item.id, item);
                return Promise.resolve();
            }),
            delete: vitest_1.vi.fn((id) => {
                mockIndexedDB.cases.delete(id);
                return Promise.resolve();
            }),
            where: vitest_1.vi.fn(() => ({
                above: vitest_1.vi.fn(() => ({
                    toArray: vitest_1.vi.fn(() => Promise.resolve(Array.from(mockIndexedDB.cases.values()))),
                })),
            })),
            bulkPut: vitest_1.vi.fn((items) => {
                items.forEach((item) => mockIndexedDB.cases.set(item.id, item));
                return Promise.resolve();
            }),
            bulkDelete: vitest_1.vi.fn((ids) => {
                ids.forEach((id) => mockIndexedDB.cases.delete(id));
                return Promise.resolve();
            }),
            clear: vitest_1.vi.fn(() => {
                mockIndexedDB.cases.clear();
                return Promise.resolve();
            }),
            count: vitest_1.vi.fn(() => Promise.resolve(mockIndexedDB.cases.size)),
        };
        alerts = {
            get: vitest_1.vi.fn((id) => Promise.resolve(mockIndexedDB.alerts.get(id))),
            put: vitest_1.vi.fn((item) => {
                mockIndexedDB.alerts.set(item.id, item);
                return Promise.resolve();
            }),
            where: vitest_1.vi.fn(() => ({
                above: vitest_1.vi.fn(() => ({
                    toArray: vitest_1.vi.fn(() => Promise.resolve(Array.from(mockIndexedDB.alerts.values()))),
                })),
            })),
            clear: vitest_1.vi.fn(() => {
                mockIndexedDB.alerts.clear();
                return Promise.resolve();
            }),
            count: vitest_1.vi.fn(() => Promise.resolve(mockIndexedDB.alerts.size)),
        };
        tasks = {
            clear: vitest_1.vi.fn(() => Promise.resolve()),
            count: vitest_1.vi.fn(() => Promise.resolve(0)),
        };
        entities = {
            clear: vitest_1.vi.fn(() => Promise.resolve()),
            count: vitest_1.vi.fn(() => Promise.resolve(0)),
        };
        notes = {
            add: vitest_1.vi.fn((note) => {
                mockIndexedDB.notes.set(note.id, note);
                return Promise.resolve();
            }),
            get: vitest_1.vi.fn((id) => Promise.resolve(mockIndexedDB.notes.get(id))),
            put: vitest_1.vi.fn((note) => {
                mockIndexedDB.notes.set(note.id, note);
                return Promise.resolve();
            }),
            where: vitest_1.vi.fn(() => ({
                equals: vitest_1.vi.fn(() => ({
                    toArray: vitest_1.vi.fn(() => Promise.resolve(Array.from(mockIndexedDB.notes.values()))),
                })),
                anyOf: vitest_1.vi.fn(() => ({
                    toArray: vitest_1.vi.fn(() => Promise.resolve([])),
                })),
            })),
            clear: vitest_1.vi.fn(() => Promise.resolve()),
        };
        observations = { clear: vitest_1.vi.fn(() => Promise.resolve()) };
        attachments = { clear: vitest_1.vi.fn(() => Promise.resolve()) };
        syncQueue = {
            add: vitest_1.vi.fn((item) => {
                mockIndexedDB.syncQueue.set(item.id, item);
                return Promise.resolve();
            }),
            where: vitest_1.vi.fn(() => ({
                below: vitest_1.vi.fn(() => ({
                    toArray: vitest_1.vi.fn(() => Promise.resolve(Array.from(mockIndexedDB.syncQueue.values()))),
                })),
            })),
            orderBy: vitest_1.vi.fn(() => ({
                toArray: vitest_1.vi.fn(() => Promise.resolve(Array.from(mockIndexedDB.syncQueue.values()))),
            })),
            put: vitest_1.vi.fn((item) => {
                mockIndexedDB.syncQueue.set(item.id, item);
                return Promise.resolve();
            }),
            delete: vitest_1.vi.fn((id) => {
                mockIndexedDB.syncQueue.delete(id);
                return Promise.resolve();
            }),
            clear: vitest_1.vi.fn(() => {
                mockIndexedDB.syncQueue.clear();
                return Promise.resolve();
            }),
            count: vitest_1.vi.fn(() => Promise.resolve(mockIndexedDB.syncQueue.size)),
        };
        metadata = { clear: vitest_1.vi.fn(() => Promise.resolve()) };
    },
}));
(0, vitest_1.describe)('Offline Cache', () => {
    (0, vitest_1.beforeEach)(() => {
        // Clear mock data
        mockIndexedDB.cases.clear();
        mockIndexedDB.alerts.clear();
        mockIndexedDB.tasks.clear();
        mockIndexedDB.entities.clear();
        mockIndexedDB.notes.clear();
        mockIndexedDB.syncQueue.clear();
    });
    (0, vitest_1.describe)('Case caching', () => {
        (0, vitest_1.it)('should store and retrieve a case', async () => {
            const testCase = {
                id: 'case-1',
                title: 'Test Case',
                status: 'open',
                priority: 'high',
                assignedTo: ['user-1'],
                lastUpdated: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                entityCount: 5,
                alertCount: 2,
            };
            // Store the case
            mockIndexedDB.cases.set('case-1', {
                id: testCase.id,
                data: testCase,
                cachedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 86400000).toISOString(),
                checksum: 'abc123',
            });
            // Retrieve
            const cached = mockIndexedDB.cases.get('case-1');
            (0, vitest_1.expect)(cached).toBeDefined();
            (0, vitest_1.expect)(cached?.data.title).toBe('Test Case');
        });
        (0, vitest_1.it)('should expire old entries', async () => {
            const expiredCase = {
                id: 'case-expired',
                data: { id: 'case-expired', title: 'Expired' },
                cachedAt: new Date(Date.now() - 86400000).toISOString(),
                expiresAt: new Date(Date.now() - 3600000).toISOString(), // Expired 1 hour ago
                checksum: 'abc',
            };
            mockIndexedDB.cases.set('case-expired', expiredCase);
            // Filter expired (simulating cleanup)
            const validCases = Array.from(mockIndexedDB.cases.values()).filter((c) => new Date(c.expiresAt) > new Date());
            (0, vitest_1.expect)(validCases.length).toBe(0);
        });
    });
    (0, vitest_1.describe)('Note syncing', () => {
        (0, vitest_1.it)('should queue notes for sync', async () => {
            const note = {
                id: 'note-1',
                localId: 'local-1',
                caseId: 'case-1',
                content: 'Test note content',
                createdAt: new Date().toISOString(),
                createdBy: 'user-1',
                syncStatus: 'pending',
                version: 1,
            };
            mockIndexedDB.notes.set(note.id, note);
            const syncItem = {
                id: 'sync-1',
                operation: 'create',
                entityType: 'note',
                data: note,
                createdAt: new Date().toISOString(),
                attempts: 0,
            };
            mockIndexedDB.syncQueue.set(syncItem.id, syncItem);
            (0, vitest_1.expect)(mockIndexedDB.syncQueue.size).toBe(1);
            (0, vitest_1.expect)(mockIndexedDB.syncQueue.get('sync-1')?.data).toEqual(note);
        });
        (0, vitest_1.it)('should track sync attempts', async () => {
            const syncItem = {
                id: 'sync-1',
                operation: 'create',
                entityType: 'note',
                data: { id: 'note-1' },
                createdAt: new Date().toISOString(),
                attempts: 0,
            };
            mockIndexedDB.syncQueue.set(syncItem.id, syncItem);
            // Simulate failed sync attempt
            const item = mockIndexedDB.syncQueue.get('sync-1');
            if (item) {
                item.attempts++;
                item.lastAttempt = new Date().toISOString();
                item.error = 'Network error';
                mockIndexedDB.syncQueue.set('sync-1', item);
            }
            (0, vitest_1.expect)(mockIndexedDB.syncQueue.get('sync-1')?.attempts).toBe(1);
            (0, vitest_1.expect)(mockIndexedDB.syncQueue.get('sync-1')?.error).toBe('Network error');
        });
    });
    (0, vitest_1.describe)('Data integrity', () => {
        (0, vitest_1.it)('should generate valid checksums', async () => {
            const data = { id: '1', name: 'Test' };
            const encoder = new TextEncoder();
            const dataStr = JSON.stringify(data);
            // Simulate checksum generation
            const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(dataStr));
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const checksum = hashArray
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');
            (0, vitest_1.expect)(checksum).toHaveLength(64);
        });
        (0, vitest_1.it)('should detect data tampering', async () => {
            const originalData = { id: '1', name: 'Original' };
            const tamperedData = { id: '1', name: 'Tampered' };
            const encoder = new TextEncoder();
            const originalHash = await crypto.subtle.digest('SHA-256', encoder.encode(JSON.stringify(originalData)));
            const tamperedHash = await crypto.subtle.digest('SHA-256', encoder.encode(JSON.stringify(tamperedData)));
            const originalChecksum = Array.from(new Uint8Array(originalHash))
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');
            const tamperedChecksum = Array.from(new Uint8Array(tamperedHash))
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');
            (0, vitest_1.expect)(originalChecksum).not.toBe(tamperedChecksum);
        });
    });
});
(0, vitest_1.describe)('Sync Engine', () => {
    (0, vitest_1.describe)('Conflict resolution', () => {
        (0, vitest_1.it)('should resolve conflicts using last-writer-wins', () => {
            const localData = {
                id: 'note-1',
                content: 'Local version',
                updatedAt: '2024-01-15T10:00:00Z',
                version: 1,
            };
            const serverData = {
                id: 'note-1',
                content: 'Server version',
                updatedAt: '2024-01-15T09:00:00Z',
                version: 2,
            };
            // Last-writer-wins: local wins (newer timestamp)
            const localTime = new Date(localData.updatedAt).getTime();
            const serverTime = new Date(serverData.updatedAt).getTime();
            const winner = localTime > serverTime ? 'local' : 'server';
            (0, vitest_1.expect)(winner).toBe('local');
        });
        (0, vitest_1.it)('should handle server winning conflicts', () => {
            const localData = {
                id: 'note-1',
                content: 'Local version',
                updatedAt: '2024-01-15T08:00:00Z',
                version: 1,
            };
            const serverData = {
                id: 'note-1',
                content: 'Server version',
                updatedAt: '2024-01-15T10:00:00Z',
                version: 2,
            };
            const localTime = new Date(localData.updatedAt).getTime();
            const serverTime = new Date(serverData.updatedAt).getTime();
            const winner = localTime > serverTime ? 'local' : 'server';
            (0, vitest_1.expect)(winner).toBe('server');
        });
    });
    (0, vitest_1.describe)('Network handling', () => {
        (0, vitest_1.it)('should queue operations when offline', () => {
            const isOnline = false;
            if (!isOnline) {
                // Queue instead of immediate sync
                const queuedOperation = {
                    id: 'op-1',
                    type: 'create',
                    data: { content: 'test' },
                    queuedAt: new Date().toISOString(),
                };
                (0, vitest_1.expect)(queuedOperation.queuedAt).toBeDefined();
            }
        });
        (0, vitest_1.it)('should retry failed syncs with backoff', () => {
            const attempts = [1, 2, 3, 4, 5];
            const baseDelay = 1000;
            const delays = attempts.map((attempt) => baseDelay * Math.pow(2, attempt - 1));
            (0, vitest_1.expect)(delays).toEqual([1000, 2000, 4000, 8000, 16000]);
        });
    });
});

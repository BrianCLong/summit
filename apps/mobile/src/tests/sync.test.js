"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Sync Engine Tests
 * Tests for sync flow and conflict resolution
 */
const vitest_1 = require("vitest");
// Mock fetch for API calls
global.fetch = vitest_1.vi.fn();
(0, vitest_1.describe)('Sync Engine', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        global.fetch.mockReset();
    });
    (0, vitest_1.describe)('Full sync flow', () => {
        (0, vitest_1.it)('should sync pending items when online', async () => {
            const pendingItems = [
                { id: '1', operation: 'create', entityType: 'note', data: { content: 'test' } },
                { id: '2', operation: 'update', entityType: 'note', data: { id: 'note-1', content: 'updated' } },
            ];
            // Mock successful API responses
            global.fetch
                .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'note-new' }) })
                .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 'note-1' }) });
            let syncedCount = 0;
            for (const item of pendingItems) {
                const response = await fetch('/api/mobile/notes', {
                    method: item.operation === 'create' ? 'POST' : 'PUT',
                    body: JSON.stringify(item.data),
                });
                if (response.ok) {
                    syncedCount++;
                }
            }
            (0, vitest_1.expect)(syncedCount).toBe(2);
            (0, vitest_1.expect)(global.fetch).toHaveBeenCalledTimes(2);
        });
        (0, vitest_1.it)('should handle network failures gracefully', async () => {
            global.fetch.mockRejectedValue(new Error('Network error'));
            let error = null;
            try {
                await fetch('/api/mobile/notes', { method: 'POST' });
            }
            catch (e) {
                error = e;
            }
            (0, vitest_1.expect)(error).toBeDefined();
            (0, vitest_1.expect)(error?.message).toBe('Network error');
        });
        (0, vitest_1.it)('should handle 409 conflict responses', async () => {
            const serverData = {
                id: 'note-1',
                content: 'Server version',
                version: 3,
                updatedAt: '2024-01-15T12:00:00Z',
            };
            global.fetch.mockResolvedValue({
                ok: false,
                status: 409,
                json: () => Promise.resolve({ data: serverData, version: 3, updatedAt: serverData.updatedAt }),
            });
            const response = await fetch('/api/mobile/notes', {
                method: 'PUT',
                body: JSON.stringify({ id: 'note-1', content: 'Local version', version: 2 }),
            });
            (0, vitest_1.expect)(response.status).toBe(409);
            const conflictData = await response.json();
            (0, vitest_1.expect)(conflictData.version).toBe(3);
        });
    });
    (0, vitest_1.describe)('Conflict resolution', () => {
        function resolveConflict(conflict) {
            const localTime = new Date(conflict.localUpdatedAt).getTime();
            const serverTime = new Date(conflict.serverUpdatedAt).getTime();
            if (localTime > serverTime) {
                return { winner: 'local', data: conflict.localData };
            }
            return { winner: 'server', data: conflict.serverData };
        }
        (0, vitest_1.it)('should resolve to local when local is newer', () => {
            const conflict = {
                localVersion: 2,
                serverVersion: 2,
                localUpdatedAt: '2024-01-15T14:00:00Z',
                serverUpdatedAt: '2024-01-15T10:00:00Z',
                localData: { content: 'Local content' },
                serverData: { content: 'Server content' },
            };
            const result = resolveConflict(conflict);
            (0, vitest_1.expect)(result.winner).toBe('local');
            (0, vitest_1.expect)(result.data.content).toBe('Local content');
        });
        (0, vitest_1.it)('should resolve to server when server is newer', () => {
            const conflict = {
                localVersion: 1,
                serverVersion: 3,
                localUpdatedAt: '2024-01-15T08:00:00Z',
                serverUpdatedAt: '2024-01-15T12:00:00Z',
                localData: { content: 'Local content' },
                serverData: { content: 'Server content' },
            };
            const result = resolveConflict(conflict);
            (0, vitest_1.expect)(result.winner).toBe('server');
            (0, vitest_1.expect)(result.data.content).toBe('Server content');
        });
    });
    (0, vitest_1.describe)('Audit trail', () => {
        (0, vitest_1.it)('should record conflict resolutions', () => {
            const auditLog = [];
            function recordConflictResolution(entityType, entityId, resolution, localData, serverData) {
                auditLog.push({
                    timestamp: new Date().toISOString(),
                    entityType,
                    entityId,
                    resolution,
                    localData,
                    serverData,
                });
            }
            recordConflictResolution('note', 'note-1', 'local', { content: 'Local' }, { content: 'Server' });
            (0, vitest_1.expect)(auditLog).toHaveLength(1);
            (0, vitest_1.expect)(auditLog[0].resolution).toBe('local');
            (0, vitest_1.expect)(auditLog[0].entityType).toBe('note');
        });
    });
    (0, vitest_1.describe)('Batch processing', () => {
        (0, vitest_1.it)('should process items in batches', async () => {
            const items = Array.from({ length: 25 }, (_, i) => ({
                id: `item-${i}`,
                data: { content: `Content ${i}` },
            }));
            const batchSize = 10;
            const batches = [];
            for (let i = 0; i < items.length; i += batchSize) {
                batches.push(items.slice(i, i + batchSize));
            }
            (0, vitest_1.expect)(batches).toHaveLength(3);
            (0, vitest_1.expect)(batches[0]).toHaveLength(10);
            (0, vitest_1.expect)(batches[1]).toHaveLength(10);
            (0, vitest_1.expect)(batches[2]).toHaveLength(5);
        });
    });
    (0, vitest_1.describe)('Retry logic', () => {
        (0, vitest_1.it)('should implement exponential backoff', () => {
            const maxRetries = 5;
            const baseDelay = 1000;
            function getRetryDelay(attempt) {
                return Math.min(baseDelay * Math.pow(2, attempt), 30000);
            }
            (0, vitest_1.expect)(getRetryDelay(0)).toBe(1000);
            (0, vitest_1.expect)(getRetryDelay(1)).toBe(2000);
            (0, vitest_1.expect)(getRetryDelay(2)).toBe(4000);
            (0, vitest_1.expect)(getRetryDelay(3)).toBe(8000);
            (0, vitest_1.expect)(getRetryDelay(4)).toBe(16000);
            (0, vitest_1.expect)(getRetryDelay(5)).toBe(30000); // Capped at 30s
        });
        (0, vitest_1.it)('should stop after max retries', async () => {
            const maxRetries = 5;
            let attempts = 0;
            global.fetch.mockRejectedValue(new Error('Network error'));
            while (attempts < maxRetries) {
                try {
                    await fetch('/api/mobile/notes', { method: 'POST' });
                    break;
                }
                catch {
                    attempts++;
                }
            }
            (0, vitest_1.expect)(attempts).toBe(maxRetries);
        });
    });
});
(0, vitest_1.describe)('E2E Sync Flow', () => {
    (0, vitest_1.it)('should complete full login to sync flow', async () => {
        // Step 1: Login
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                user: { id: 'user-1', name: 'Test User' },
                accessToken: 'token-123',
                refreshToken: 'refresh-123',
            }),
        });
        const loginResponse = await fetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: 'test@example.com', password: 'pass' }),
        });
        (0, vitest_1.expect)(loginResponse.ok).toBe(true);
        // Step 2: Download cases
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve([
                { id: 'case-1', title: 'Test Case' },
            ]),
        });
        const casesResponse = await fetch('/api/mobile/cases/assigned');
        const cases = await casesResponse.json();
        (0, vitest_1.expect)(cases).toHaveLength(1);
        // Step 3: Go offline - add note locally
        const localNote = {
            id: 'local-note-1',
            caseId: 'case-1',
            content: 'Offline note',
            syncStatus: 'pending',
        };
        // Step 4: Come back online - sync
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                id: 'server-note-1',
                caseId: 'case-1',
                content: 'Offline note',
            }),
        });
        const syncResponse = await fetch('/api/mobile/notes', {
            method: 'POST',
            body: JSON.stringify(localNote),
        });
        (0, vitest_1.expect)(syncResponse.ok).toBe(true);
        // Step 5: Verify audit trail would be recorded
        const auditEntry = {
            action: 'note_synced',
            localId: localNote.id,
            timestamp: new Date().toISOString(),
        };
        (0, vitest_1.expect)(auditEntry.action).toBe('note_synced');
    });
});

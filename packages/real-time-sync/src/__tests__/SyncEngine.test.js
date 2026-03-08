"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SyncEngine_1 = require("../SyncEngine");
const types_1 = require("../types");
class InMemoryStore {
    states = new Map();
    ops = new Map();
    sessions = new Map();
    async getDocumentState(documentId) {
        return this.states.get(documentId) ?? null;
    }
    async saveDocumentState(state) {
        this.states.set(state.id, { ...state });
    }
    async appendOperation(documentId, operation) {
        const list = this.ops.get(documentId) ?? [];
        list.push(operation);
        this.ops.set(documentId, list);
    }
    async getOperations(documentId, fromVersion) {
        return (this.ops.get(documentId) ?? []).filter(op => op.version >= fromVersion);
    }
    async createSession(session) {
        this.sessions.set(session.id, session);
    }
    async getSession(sessionId) {
        return this.sessions.get(sessionId) ?? null;
    }
    async updateSession(sessionId, updates) {
        const existing = this.sessions.get(sessionId);
        if (existing) {
            this.sessions.set(sessionId, { ...existing, ...updates });
        }
    }
    async deleteSession(sessionId) {
        this.sessions.delete(sessionId);
    }
    async getActiveSessions(documentId) {
        return Array.from(this.sessions.values()).filter(session => session.documentId === documentId);
    }
    async updatePresence(_presence) {
        return undefined;
    }
    async getPresence(documentId) {
        return [];
    }
    async removePresence(_userId, _documentId) {
        return undefined;
    }
    async acquireLock(_lock) {
        return true;
    }
    async releaseLock(_documentId, _userId) {
        return undefined;
    }
    async getLock(_documentId) {
        return null;
    }
}
const baseState = {
    id: 'doc1',
    content: '',
    version: 0,
    lastModified: new Date(),
    modifiedBy: 'system'
};
const writerSession = {
    id: 'sess1',
    documentId: 'doc1',
    userId: 'alice',
    workspaceId: 'ws',
    permissions: ['write'],
    connectedAt: new Date(),
    lastHeartbeat: new Date()
};
const now = Date.now();
let tsOffset = 0;
const insert = (id, position, content, baseVersion) => ({
    id,
    type: types_1.OperationType.INSERT,
    position,
    length: content.length,
    content,
    attributes: {},
    userId: 'alice',
    timestamp: now + tsOffset++,
    version: baseVersion,
    baseVersion
});
describe('SyncEngine', () => {
    let store;
    let engine;
    beforeEach(async () => {
        store = new InMemoryStore();
        engine = new SyncEngine_1.SyncEngine(store);
        await store.saveDocumentState({ ...baseState });
        await store.createSession(writerSession);
    });
    it('applies operations deterministically based on version, base version, and timestamp', async () => {
        const opA = insert('opA', 0, 'Hello', 0);
        const opB = insert('opB', 5, ' world', 0);
        // Intentionally enqueue out of order
        await engine.handleOperation(writerSession.id, opB);
        await engine.handleOperation(writerSession.id, opA);
        const state = await store.getDocumentState('doc1');
        expect(state?.content).toBe('Hello world');
        expect(state?.version).toBe(2);
    });
    it('rebases against existing history when base version is stale', async () => {
        const initial = insert('opA', 0, 'abc', 0);
        await engine.handleOperation(writerSession.id, initial);
        const stale = insert('opB', 1, 'X', 0);
        await engine.handleOperation(writerSession.id, stale);
        const operations = await store.getOperations('doc1', 0);
        expect(operations[1].position).toBe(2);
        const state = await store.getDocumentState('doc1');
        expect(state?.content).toBe('aXbc');
    });
    it('emits skip when conflict resolution discards an operation', async () => {
        const lww = { strategy: 'last_write_wins' };
        engine = new SyncEngine_1.SyncEngine(store, { conflictResolution: lww });
        await store.createSession(writerSession);
        await store.saveDocumentState({ ...baseState });
        const opA = insert('opA', 0, 'A', 0);
        const opB = { ...insert('opB', 0, 'B', 0), timestamp: now + 10 };
        const skipped = [];
        engine.on('operation:skipped', ({ operation }) => skipped.push(operation));
        await engine.handleOperation(writerSession.id, opA);
        await engine.handleOperation(writerSession.id, opB);
        expect(skipped.some(op => op.id === 'opA')).toBe(true);
    });
});

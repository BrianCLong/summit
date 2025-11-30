import { SyncEngine, SyncStore } from '../SyncEngine';
import {
  Operation,
  OperationType,
  DocumentState,
  SyncSession,
  ConflictResolution,
  DocumentLock,
  Presence
} from '../types';

class InMemoryStore implements SyncStore {
  private states = new Map<string, DocumentState>();
  private ops = new Map<string, Operation[]>();
  private sessions = new Map<string, SyncSession>();

  async getDocumentState(documentId: string): Promise<DocumentState | null> {
    return this.states.get(documentId) ?? null;
  }

  async saveDocumentState(state: DocumentState): Promise<void> {
    this.states.set(state.id, { ...state });
  }

  async appendOperation(documentId: string, operation: Operation): Promise<void> {
    const list = this.ops.get(documentId) ?? [];
    list.push(operation);
    this.ops.set(documentId, list);
  }

  async getOperations(documentId: string, fromVersion: number): Promise<Operation[]> {
    return (this.ops.get(documentId) ?? []).filter(op => op.version >= fromVersion);
  }

  async createSession(session: SyncSession): Promise<void> {
    this.sessions.set(session.id, session);
  }

  async getSession(sessionId: string): Promise<SyncSession | null> {
    return this.sessions.get(sessionId) ?? null;
  }

  async updateSession(sessionId: string, updates: Partial<SyncSession>): Promise<void> {
    const existing = this.sessions.get(sessionId);
    if (existing) {
      this.sessions.set(sessionId, { ...existing, ...updates });
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async getActiveSessions(documentId: string): Promise<SyncSession[]> {
    return Array.from(this.sessions.values()).filter(session => session.documentId === documentId);
  }

  async updatePresence(_presence: Presence): Promise<void> {
    return undefined;
  }

  async getPresence(documentId: string): Promise<Presence[]> {
    return [];
  }

  async removePresence(_userId: string, _documentId: string): Promise<void> {
    return undefined;
  }

  async acquireLock(_lock: DocumentLock): Promise<boolean> {
    return true;
  }

  async releaseLock(_documentId: string, _userId: string): Promise<void> {
    return undefined;
  }

  async getLock(_documentId: string): Promise<any> {
    return null;
  }
}

const baseState: DocumentState = {
  id: 'doc1',
  content: '',
  version: 0,
  lastModified: new Date(),
  modifiedBy: 'system'
};

const writerSession: SyncSession = {
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

const insert = (id: string, position: number, content: string, baseVersion: number): Operation => ({
  id,
  type: OperationType.INSERT,
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
  let store: InMemoryStore;
  let engine: SyncEngine;

  beforeEach(async () => {
    store = new InMemoryStore();
    engine = new SyncEngine(store);
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
    const lww: ConflictResolution = { strategy: 'last_write_wins' };
    engine = new SyncEngine(store, { conflictResolution: lww });
    await store.createSession(writerSession);
    await store.saveDocumentState({ ...baseState });

    const opA = insert('opA', 0, 'A', 0);
    const opB = { ...insert('opB', 0, 'B', 0), timestamp: now + 10 };

    const skipped: Operation[] = [];
    engine.on('operation:skipped', ({ operation }) => skipped.push(operation));

    await engine.handleOperation(writerSession.id, opA);
    await engine.handleOperation(writerSession.id, opB);

    expect(skipped.some(op => op.id === 'opA')).toBe(true);
  });
});

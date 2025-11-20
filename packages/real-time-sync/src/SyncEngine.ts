import { nanoid } from 'nanoid';
import { EventEmitter } from 'events';
import {
  Operation,
  DocumentState,
  Presence,
  SyncMessage,
  SyncSession,
  DocumentLock,
  ConflictResolution
} from './types';
import { OperationalTransform } from './OperationalTransform';

export interface SyncStore {
  // Document operations
  getDocumentState(documentId: string): Promise<DocumentState | null>;
  saveDocumentState(state: DocumentState): Promise<void>;
  appendOperation(documentId: string, operation: Operation): Promise<void>;
  getOperations(documentId: string, fromVersion: number): Promise<Operation[]>;

  // Session management
  createSession(session: SyncSession): Promise<void>;
  getSession(sessionId: string): Promise<SyncSession | null>;
  updateSession(sessionId: string, updates: Partial<SyncSession>): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  getActiveSessions(documentId: string): Promise<SyncSession[]>;

  // Presence
  updatePresence(presence: Presence): Promise<void>;
  getPresence(documentId: string): Promise<Presence[]>;
  removePresence(userId: string, documentId: string): Promise<void>;

  // Locking
  acquireLock(lock: DocumentLock): Promise<boolean>;
  releaseLock(documentId: string, userId: string): Promise<void>;
  getLock(documentId: string): Promise<DocumentLock | null>;
}

export class SyncEngine extends EventEmitter {
  private ot: OperationalTransform;
  private pendingOperations: Map<string, Operation[]> = new Map();
  private processingQueue: Map<string, Promise<void>> = new Map();

  constructor(private store: SyncStore) {
    super();
    this.ot = new OperationalTransform();
  }

  /**
   * Initialize a new sync session
   */
  async createSession(
    documentId: string,
    userId: string,
    workspaceId: string,
    permissions: string[]
  ): Promise<SyncSession> {
    const session: SyncSession = {
      id: nanoid(),
      documentId,
      userId,
      workspaceId,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
      permissions
    };

    await this.store.createSession(session);

    // Get current document state
    const state = await this.store.getDocumentState(documentId);
    if (state) {
      this.emit('session:created', { session, state });
    }

    return session;
  }

  /**
   * Handle incoming operation from client
   */
  async handleOperation(sessionId: string, operation: Operation): Promise<void> {
    const session = await this.store.getSession(sessionId);
    if (!session) {
      throw new Error('Invalid session');
    }

    // Check permissions
    if (!session.permissions.includes('write')) {
      throw new Error('No write permission');
    }

    // Add to pending queue
    const docId = session.documentId;
    if (!this.pendingOperations.has(docId)) {
      this.pendingOperations.set(docId, []);
    }
    this.pendingOperations.get(docId)!.push(operation);

    // Process queue
    await this.processOperationQueue(docId);
  }

  /**
   * Process pending operations for a document
   */
  private async processOperationQueue(documentId: string): Promise<void> {
    // Ensure only one queue is processing at a time per document
    if (this.processingQueue.has(documentId)) {
      return this.processingQueue.get(documentId)!;
    }

    const processingPromise = this.processQueueInternal(documentId);
    this.processingQueue.set(documentId, processingPromise);

    try {
      await processingPromise;
    } finally {
      this.processingQueue.delete(documentId);
    }
  }

  private async processQueueInternal(documentId: string): Promise<void> {
    const pending = this.pendingOperations.get(documentId) || [];
    if (pending.length === 0) return;

    // Get current document state
    const state = await this.store.getDocumentState(documentId);
    if (!state) {
      throw new Error('Document not found');
    }

    // Get all operations since the oldest pending operation's version
    const oldestVersion = Math.min(...pending.map(op => op.version));
    const existingOps = await this.store.getOperations(documentId, oldestVersion);

    // Transform pending operations against existing operations
    const transformedOps: Operation[] = [];
    for (const pendingOp of pending) {
      let transformedOp = pendingOp;

      // Transform against all concurrent operations
      for (const existingOp of existingOps) {
        if (existingOp.version >= pendingOp.version && existingOp.id !== pendingOp.id) {
          const [transformed] = this.ot.transform(transformedOp, existingOp);
          transformedOp = transformed;
        }
      }

      // Update version
      transformedOp = {
        ...transformedOp,
        version: state.version + 1
      };

      // Apply operation to document
      if (typeof state.content === 'string') {
        state.content = this.ot.apply(state.content, transformedOp);
      } else {
        // For non-string content, apply custom logic
        state.content = this.applyOperationToObject(state.content, transformedOp);
      }

      state.version++;
      state.lastModified = new Date();
      state.modifiedBy = transformedOp.userId;

      // Save operation and state
      await this.store.appendOperation(documentId, transformedOp);
      await this.store.saveDocumentState(state);

      transformedOps.push(transformedOp);

      // Emit operation to other clients
      this.emit('operation:applied', {
        documentId,
        operation: transformedOp,
        state
      });
    }

    // Clear processed operations
    this.pendingOperations.set(documentId, []);

    // Check for conflicts
    const conflicts = this.detectConflicts(transformedOps);
    if (conflicts.length > 0) {
      this.emit('conflicts:detected', {
        documentId,
        conflicts
      });
    }
  }

  /**
   * Update presence information
   */
  async updatePresence(presence: Presence): Promise<void> {
    await this.store.updatePresence(presence);

    // Broadcast to other users
    this.emit('presence:updated', { presence });
  }

  /**
   * Get all presence information for a document
   */
  async getPresence(documentId: string): Promise<Presence[]> {
    return this.store.getPresence(documentId);
  }

  /**
   * Sync a client to the latest document state
   */
  async syncClient(documentId: string, clientVersion: number): Promise<{
    state: DocumentState;
    operations: Operation[];
  }> {
    const state = await this.store.getDocumentState(documentId);
    if (!state) {
      throw new Error('Document not found');
    }

    // Get all operations since client's version
    const operations = await this.store.getOperations(documentId, clientVersion);

    return { state, operations };
  }

  /**
   * Acquire a lock on a document
   */
  async acquireLock(
    documentId: string,
    userId: string,
    lockType: 'read' | 'write' | 'exclusive' = 'write',
    duration: number = 30000 // 30 seconds default
  ): Promise<boolean> {
    const lock: DocumentLock = {
      documentId,
      userId,
      lockedAt: new Date(),
      expiresAt: new Date(Date.now() + duration),
      lockType
    };

    const acquired = await this.store.acquireLock(lock);

    if (acquired) {
      this.emit('lock:acquired', { lock });

      // Auto-release after duration
      setTimeout(() => {
        this.releaseLock(documentId, userId).catch(console.error);
      }, duration);
    }

    return acquired;
  }

  /**
   * Release a lock on a document
   */
  async releaseLock(documentId: string, userId: string): Promise<void> {
    await this.store.releaseLock(documentId, userId);
    this.emit('lock:released', { documentId, userId });
  }

  /**
   * Clean up expired sessions
   */
  async cleanupSessions(maxIdleTime: number = 300000): Promise<void> {
    // This would be called periodically
    const cutoff = new Date(Date.now() - maxIdleTime);

    // Implementation would depend on store capabilities
    // For now, emit event for external cleanup
    this.emit('cleanup:sessions', { cutoff });
  }

  /**
   * Apply operation to non-string content (objects, arrays, etc.)
   */
  private applyOperationToObject(content: any, operation: Operation): any {
    // For complex objects, we'd use a JSON OT algorithm
    // This is a simplified version
    const contentCopy = JSON.parse(JSON.stringify(content));

    // Apply operation based on path in attributes
    if (operation.attributes?.path) {
      const path = operation.attributes.path as string[];
      this.setValueAtPath(contentCopy, path, operation.content);
    }

    return contentCopy;
  }

  private setValueAtPath(obj: any, path: string[], value: any): void {
    let current = obj;
    for (let i = 0; i < path.length - 1; i++) {
      if (!(path[i] in current)) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
  }

  /**
   * Detect conflicts in operations
   */
  private detectConflicts(operations: Operation[]): Array<{ ops: Operation[]; reason: string }> {
    const conflicts: Array<{ ops: Operation[]; reason: string }> = [];

    for (let i = 0; i < operations.length; i++) {
      for (let j = i + 1; j < operations.length; j++) {
        if (this.ot.hasConflict(operations[i], operations[j])) {
          conflicts.push({
            ops: [operations[i], operations[j]],
            reason: 'Overlapping operations'
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Resolve conflicts using specified strategy
   */
  async resolveConflict(
    documentId: string,
    conflictingOps: Operation[],
    resolution: ConflictResolution
  ): Promise<Operation> {
    switch (resolution.strategy) {
      case 'last_write_wins':
        return conflictingOps.sort((a, b) => b.timestamp - a.timestamp)[0];

      case 'first_write_wins':
        return conflictingOps.sort((a, b) => a.timestamp - b.timestamp)[0];

      case 'merge':
        // Attempt to merge operations
        return this.mergeOperations(conflictingOps);

      case 'manual':
        if (!resolution.mergedOperation) {
          throw new Error('Manual resolution requires merged operation');
        }
        return resolution.mergedOperation;

      default:
        throw new Error('Unknown resolution strategy');
    }
  }

  private mergeOperations(operations: Operation[]): Operation {
    // Simple merge - combine all operations
    let merged = operations[0];
    for (let i = 1; i < operations.length; i++) {
      merged = this.ot.compose(merged, operations[i]);
    }
    return merged;
  }
}

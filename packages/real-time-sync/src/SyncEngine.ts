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

export interface SyncEngineOptions {
  conflictResolution?: ConflictResolution;
}

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
  private defaultResolution: ConflictResolution;

  constructor(private store: SyncStore, options: SyncEngineOptions = {}) {
    super();
    this.ot = new OperationalTransform();
    this.defaultResolution =
      options.conflictResolution ?? ({ strategy: 'last_write_wins' } as ConflictResolution);
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
    const queuedOperation: Operation = {
      ...operation,
      baseVersion: operation.baseVersion ?? operation.version
    };
    if (!this.pendingOperations.has(docId)) {
      this.pendingOperations.set(docId, []);
    }
    this.pendingOperations.get(docId)!.push(queuedOperation);

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
    while (true) {
      const pending = this.dequeuePendingOperations(documentId);
      if (pending.length === 0) return;

      // Get current document state
      const state = await this.store.getDocumentState(documentId);
      if (!state) {
        throw new Error('Document not found');
      }

      // Get all operations since the oldest pending operation's version
      const oldestVersion = Math.min(...pending.map(op => op.version));
      const existingOps = await this.store.getOperations(documentId, oldestVersion);

      // Ensure deterministic ordering when transforming
      existingOps.sort((a, b) => a.version - b.version || a.timestamp - b.timestamp);

      const appliedOps: Operation[] = [];
      let currentVersion = state.version;

      for (const pendingOp of pending) {
        const transformedOp = this.transformAgainstHistory(
          pendingOp,
          existingOps,
          appliedOps
        );

        const conflictingApplied = this.findConflicts(transformedOp, appliedOps);

        let resolutionWinner = transformedOp;
        if (conflictingApplied.length > 0) {
          resolutionWinner = await this.resolveConflict(
            documentId,
            [transformedOp, ...conflictingApplied],
            this.defaultResolution
          );

          this.emit('conflicts:resolved', {
            documentId,
            winner: resolutionWinner,
            losers: [transformedOp, ...conflictingApplied].filter(
              op => op.id !== resolutionWinner.id
            )
          });
        }

        if (resolutionWinner.id !== transformedOp.id) {
          // Conflict resolution discarded the incoming operation in favor of history
          this.emit('operation:skipped', {
            documentId,
            operation: { ...transformedOp, attributes: { ...transformedOp.attributes, overridden: true } }
          });
          continue;
        }

        const opWithVersion: Operation = {
          ...resolutionWinner,
          version: currentVersion + 1,
          baseVersion: resolutionWinner.baseVersion ?? resolutionWinner.version
        };

        // Apply operation to document
        if (typeof state.content === 'string') {
          state.content = this.ot.apply(state.content, opWithVersion);
        } else {
          // For non-string content, apply custom logic
          state.content = this.applyOperationToObject(state.content, opWithVersion);
        }

        currentVersion = opWithVersion.version;
        state.version = currentVersion;
        state.lastModified = new Date();
        state.modifiedBy = opWithVersion.userId;

        // Save operation and state
        await this.store.appendOperation(documentId, opWithVersion);
        await this.store.saveDocumentState(state);

        appliedOps.push(opWithVersion);

        // Emit operation to other clients
        this.emit('operation:applied', {
          documentId,
          operation: opWithVersion,
          state
        });
      }

      // Check for conflicts in the applied set to surface combined clashes
      const conflicts = this.detectConflicts(appliedOps);
      if (conflicts.length > 0) {
        this.emit('conflicts:detected', {
          documentId,
          conflicts
        });
      }
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
   * Transform an incoming operation against historical and already-applied operations
   * to preserve intent when rebasing onto the latest state.
   */
  private transformAgainstHistory(
    operation: Operation,
    history: Operation[],
    applied: Operation[]
  ): Operation {
    const baseVersion = operation.baseVersion ?? operation.version;
    let transformed = { ...operation };

    for (const historical of history) {
      if (historical.id === transformed.id) continue;
      if (historical.version >= baseVersion) {
        [transformed] = this.ot.transform(transformed, historical);
      }
    }

    for (const committed of applied) {
      if (committed.id === transformed.id) continue;
      [transformed] = this.ot.transform(transformed, committed);
    }

    return transformed;
  }

  /**
   * Locate already-applied operations that conflict with the provided operation.
   */
  private findConflicts(operation: Operation, applied: Operation[]): Operation[] {
    return applied.filter(appliedOp => this.ot.hasConflict(operation, appliedOp));
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

  private dequeuePendingOperations(documentId: string): Operation[] {
    const queue = this.pendingOperations.get(documentId) || [];
    if (queue.length === 0) {
      return [];
    }

    const batch = [...queue];
    this.pendingOperations.set(documentId, []);

    return batch.sort((a, b) => {
      if (a.version !== b.version) return a.version - b.version;
      const aBase = a.baseVersion ?? a.version;
      const bBase = b.baseVersion ?? b.version;
      if (aBase !== bBase) return aBase - bBase;
      if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
      return a.id.localeCompare(b.id);
    });
  }
}

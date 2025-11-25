class OperationLogManager {
  constructor() {
    this.logs = new Map();
  }

  getState(investigationId) {
    if (!this.logs.has(investigationId)) {
      this.logs.set(investigationId, {
        entries: [],
        versionVector: {},
        undoStacks: new Map(),
        redoStacks: new Map(),
        byId: new Map(),
      });
    }
    return this.logs.get(investigationId);
  }

  mergeVector(state, authorId) {
    const next = {
      ...state.versionVector,
      [authorId]: (state.versionVector[authorId] || 0) + 1,
    };
    state.versionVector = next;
    return next;
  }

  recordBatch(investigationId, clientId, authorId, batch = []) {
    const state = this.getState(investigationId);
    const recorded = [];

    batch.forEach((op) => {
      if (!op?.opId || state.byId.has(op.opId)) return;
      const vector = this.mergeVector(state, authorId || clientId || 'unknown');
      const entry = {
        opId: op.opId,
        event: op.event,
        payload: op.payload,
        seq: op.seq,
        investigationId,
        authorId: authorId || clientId || 'unknown',
        timestamp: op.payload?.timestamp || new Date().toISOString(),
        baseVersion:
          typeof op.payload?.baseVersion === 'number'
            ? op.payload.baseVersion
            : state.entries.length,
        version: state.entries.length + 1,
        versionVector: { ...vector },
        status:
          op.payload?.baseVersion != null &&
          op.payload.baseVersion < state.entries.length
            ? 'merged'
            : 'applied',
      };
      state.entries.push(entry);
      state.byId.set(entry.opId, entry);
      this.pushUndo(state, clientId, entry);
      recorded.push(entry);
    });

    return recorded;
  }

  pushUndo(state, clientId, entry) {
    if (!clientId) return;
    const undoStack = state.undoStacks.get(clientId) || [];
    undoStack.push(entry);
    state.undoStacks.set(clientId, undoStack);
    state.redoStacks.set(clientId, []);
  }

  undo(investigationId, clientId, authorId) {
    const state = this.getState(investigationId);
    const undoStack = state.undoStacks.get(clientId) || [];
    const target = undoStack.pop();
    if (!target) return null;

    const vector = this.mergeVector(state, authorId || clientId || 'unknown');
    const revert = {
      opId: `undo-${target.opId}-${Date.now()}`,
      event: 'collab:undo',
      investigationId,
      authorId: authorId || clientId || 'unknown',
      targetOpId: target.opId,
      timestamp: new Date().toISOString(),
      version: state.entries.length + 1,
      versionVector: { ...vector },
      status: 'applied',
      payload: { targetOpId: target.opId },
    };

    state.entries.push(revert);
    state.byId.set(revert.opId, revert);
    state.undoStacks.set(clientId, undoStack);
    const redoStack = state.redoStacks.get(clientId) || [];
    redoStack.push(target);
    state.redoStacks.set(clientId, redoStack);

    return { revert, undone: target };
  }

  redo(investigationId, clientId, authorId) {
    const state = this.getState(investigationId);
    const redoStack = state.redoStacks.get(clientId) || [];
    const target = redoStack.pop();
    if (!target) return null;

    const vector = this.mergeVector(state, authorId || clientId || 'unknown');
    const reapplied = {
      ...target,
      opId: `redo-${target.opId}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      version: state.entries.length + 1,
      versionVector: { ...vector },
      status: 'reapplied',
    };

    state.entries.push(reapplied);
    state.byId.set(reapplied.opId, reapplied);
    state.redoStacks.set(clientId, redoStack);
    this.pushUndo(state, clientId, reapplied);

    return { reapplied, target };
  }

  getHistory(investigationId) {
    const state = this.getState(investigationId);
    return {
      entries: [...state.entries],
      versionVector: { ...state.versionVector },
    };
  }
}

module.exports = {
  OperationLogManager,
  operationLog: new OperationLogManager(),
};

const { OperationLogManager } = require('../src/services/operationLog');

describe('OperationLogManager', () => {
  let manager;

  beforeEach(() => {
    manager = new OperationLogManager();
  });

  it('records operations with version vectors and authorship', () => {
    const entries = manager.recordBatch('inv-1', 'client-1', 'user-1', [
      {
        event: 'graph:node_added',
        payload: { node: { id: 'n1' }, baseVersion: 0 },
        opId: 'op-1',
        seq: 1,
      },
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      opId: 'op-1',
      authorId: 'user-1',
      investigationId: 'inv-1',
      event: 'graph:node_added',
      version: 1,
      status: 'applied',
    });
    expect(entries[0].versionVector['user-1']).toBe(1);

    const history = manager.getHistory('inv-1');
    expect(history.entries).toHaveLength(1);
    expect(history.versionVector['user-1']).toBe(1);
  });

  it('marks concurrent operations as merged', () => {
    manager.recordBatch('inv-1', 'client-1', 'user-1', [
      {
        event: 'graph:node_added',
        payload: { node: { id: 'n1' }, baseVersion: 0 },
        opId: 'op-1',
        seq: 1,
      },
    ]);

    const concurrent = manager.recordBatch('inv-1', 'client-2', 'user-2', [
      {
        event: 'graph:node_added',
        payload: { node: { id: 'n2' }, baseVersion: 0 },
        opId: 'op-2',
        seq: 1,
      },
    ]);

    expect(concurrent[0].status).toBe('merged');
    expect(concurrent[0].versionVector['user-2']).toBe(1);
    const history = manager.getHistory('inv-1');
    expect(history.entries).toHaveLength(2);
  });

  it('supports undo and redo stacks per client', () => {
    manager.recordBatch('inv-1', 'client-1', 'user-1', [
      {
        event: 'graph:node_added',
        payload: { node: { id: 'n1' }, baseVersion: 0 },
        opId: 'op-1',
        seq: 1,
      },
      {
        event: 'graph:edge_added',
        payload: { edge: { id: 'e1' }, baseVersion: 1 },
        opId: 'op-2',
        seq: 2,
      },
    ]);

    const undoResult = manager.undo('inv-1', 'client-1', 'user-1');
    expect(undoResult).toBeTruthy();
    expect(undoResult.undoStack).toBeUndefined();
    expect(undoResult.revert.targetOpId).toBe('op-2');

    const redoResult = manager.redo('inv-1', 'client-1', 'user-1');
    expect(redoResult).toBeTruthy();
    expect(redoResult.reapplied.opId).toMatch(/redo-op-2/);

    const history = manager.getHistory('inv-1');
    expect(history.entries.length).toBe(4);
    expect(history.versionVector['user-1']).toBeGreaterThanOrEqual(3);
  });
});

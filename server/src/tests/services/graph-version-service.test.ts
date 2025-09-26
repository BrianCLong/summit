/* eslint-disable @typescript-eslint/no-var-requires */
const GraphVersionServiceModule = require('../../services/GraphVersionService');

const { GraphVersionControl, computeGraphDiff } = GraphVersionServiceModule;

describe('GraphVersionService - computeGraphDiff', () => {
  it('identifies additions, removals, and updates between snapshots', () => {
    const previous = {
      nodes: [
        {
          id: 'entity-a',
          labels: ['Entity'],
          properties: { id: 'entity-a', tenantId: 'tenant-1', score: 1 },
        },
        {
          id: 'entity-b',
          labels: ['Entity'],
          properties: { id: 'entity-b', tenantId: 'tenant-1' },
        },
      ],
      relationships: [
        {
          id: 'rel-1',
          type: 'CONNECTED',
          sourceId: 'entity-a',
          targetId: 'entity-b',
          properties: { id: 'rel-1', weight: 1 },
        },
      ],
    };

    const next = {
      nodes: [
        {
          id: 'entity-a',
          labels: ['Entity'],
          properties: { id: 'entity-a', tenantId: 'tenant-1', score: 2 },
        },
        {
          id: 'entity-c',
          labels: ['Entity'],
          properties: { id: 'entity-c', tenantId: 'tenant-1' },
        },
      ],
      relationships: [
        {
          id: 'rel-2',
          type: 'CONNECTED',
          sourceId: 'entity-a',
          targetId: 'entity-c',
          properties: { id: 'rel-2', weight: 2 },
        },
      ],
    };

    const diff = computeGraphDiff(next, previous);

    expect(diff.summary).toEqual({
      nodesAdded: 1,
      nodesUpdated: 1,
      nodesRemoved: 1,
      relationshipsAdded: 1,
      relationshipsUpdated: 0,
      relationshipsRemoved: 1,
    });
    expect(diff.operations.nodesToCreate).toHaveLength(1);
    expect(diff.operations.nodesToUpdate).toHaveLength(1);
    expect(diff.operations.nodeIdsToDelete).toEqual(['entity-b']);
    expect(diff.operations.relationshipsToCreate).toHaveLength(1);
    expect(diff.operations.relationshipsToDelete).toHaveLength(1);
    expect(diff.hasChanges).toBe(true);
  });
});

describe('GraphVersionControl', () => {
  const baseSnapshot = {
    nodes: [
      { id: 'root', labels: ['Entity'], properties: { id: 'root', tenantId: 'tenant-1' } },
    ],
    relationships: [],
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a graph version snapshot and stores metadata', async () => {
    const service = new GraphVersionControl({ bucket: 'test-bucket', prefix: 'graph-versions-test' });
    const captureSpy = jest.spyOn(service, '_captureCurrentGraph').mockResolvedValue(baseSnapshot);
    jest.spyOn(service, '_fetchLatestVersionMetadata').mockResolvedValue(null);
    const uploadSpy = jest
      .spyOn(service, '_uploadSnapshot')
      .mockResolvedValue({ bucket: 'test-bucket', key: 'graph-versions-test/tenant-1/__global__/snapshot.json' });

    const insertedRecord = {
      id: 'version-1',
      tenantId: 'tenant-1',
      scope: '__global__',
      tag: 'baseline',
      description: 'Initial snapshot',
      snapshotBucket: 'test-bucket',
      snapshotKey: 'graph-versions-test/tenant-1/__global__/snapshot.json',
      graphHash: 'hash-value',
      nodeCount: 1,
      relationshipCount: 0,
      diffSummary: {
        nodesAdded: 1,
        nodesUpdated: 0,
        nodesRemoved: 0,
        relationshipsAdded: 0,
        relationshipsUpdated: 0,
        relationshipsRemoved: 0,
      },
      metadata: { reason: 'test' },
      createdBy: 'user-1',
      createdAt: new Date().toISOString(),
      lastAppliedAt: null,
      lastAppliedBy: null,
    };

    const insertSpy = jest.spyOn(service, '_insertVersionRecord').mockResolvedValue(insertedRecord);

    const result = await service.createVersion({
      tag: 'baseline',
      description: 'Initial snapshot',
      metadata: { reason: 'test' },
      scope: null,
      tenantId: 'tenant-1',
      userId: 'user-1',
    });

    expect(captureSpy).toHaveBeenCalledWith({ tenantId: 'tenant-1', scope: null });
    expect(uploadSpy).toHaveBeenCalledWith(baseSnapshot, {
      tenantId: 'tenant-1',
      scopeKey: '__global__',
      tag: 'baseline',
    });
    expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({ tag: 'baseline', tenantId: 'tenant-1' }));
    expect(result.version).toEqual(insertedRecord);
    expect(result.diff).toEqual(insertedRecord.diffSummary);
  });

  it('reverts graph state to a stored version and reports diff summary', async () => {
    const service = new GraphVersionControl({ bucket: 'test-bucket', prefix: 'graph-versions-test' });
    const storedSnapshot = {
      nodes: [
        { id: 'root', labels: ['Entity'], properties: { id: 'root', tenantId: 'tenant-1' } },
        { id: 'child', labels: ['Entity'], properties: { id: 'child', tenantId: 'tenant-1' } },
      ],
      relationships: [
        {
          id: 'rel-root-child',
          type: 'CONNECTED',
          sourceId: 'root',
          targetId: 'child',
          properties: { id: 'rel-root-child', strength: 1 },
        },
      ],
    };

    const currentSnapshot = {
      nodes: [
        { id: 'root', labels: ['Entity'], properties: { id: 'root', tenantId: 'tenant-1', stale: true } },
        { id: 'orphan', labels: ['Entity'], properties: { id: 'orphan', tenantId: 'tenant-1' } },
      ],
      relationships: [],
    };

    const versionRecord = {
      id: 'version-2',
      tenantId: 'tenant-1',
      scope: '__global__',
      tag: 'resync',
      description: 'Restore baseline',
      snapshotBucket: 'test-bucket',
      snapshotKey: 'graph-versions-test/tenant-1/__global__/resync.json',
      graphHash: 'hash-2',
      nodeCount: 2,
      relationshipCount: 1,
      diffSummary: {},
      metadata: null,
      createdBy: 'user-1',
      createdAt: new Date().toISOString(),
      lastAppliedAt: null,
      lastAppliedBy: null,
    };

    jest.spyOn(service, '_fetchVersion').mockResolvedValue(versionRecord);
    jest.spyOn(service, '_downloadSnapshot').mockResolvedValue(storedSnapshot);
    jest.spyOn(service, '_captureCurrentGraph').mockResolvedValue(currentSnapshot);
    const applyDiffSpy = jest.spyOn(service, '_applyDiff').mockResolvedValue();
    const updatedRecord = { ...versionRecord, lastAppliedAt: new Date().toISOString(), lastAppliedBy: 'user-2' };
    jest.spyOn(service, '_updateVersionUsage').mockResolvedValue(updatedRecord);

    const result = await service.revertToVersion({
      tag: 'resync',
      tenantId: 'tenant-1',
      scope: null,
      userId: 'user-2',
    });

    expect(applyDiffSpy).toHaveBeenCalledTimes(1);
    const diffArg = applyDiffSpy.mock.calls[0][0];
    expect(diffArg.summary.nodesRemoved).toBe(1);
    expect(diffArg.summary.nodesAdded).toBe(1);
    expect(diffArg.summary.relationshipsAdded).toBe(1);
    expect(result.version).toEqual(updatedRecord);
    expect(result.diff).toEqual(diffArg.summary);
  });
});

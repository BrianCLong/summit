jest.mock('../src/config/database', () => ({
  getNeo4jDriver: jest.fn(),
}));

jest.mock('../src/utils/logger.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const neo4j = require('neo4j-driver');
const { getNeo4jDriver } = require('../src/config/database');
const GraphOpsService = require('../src/services/GraphOpsService');

function makeResultCounters({
  nodesCreated = 0,
  nodesDeleted = 0,
  relationshipsCreated = 0,
  relationshipsDeleted = 0,
} = {}) {
  return {
    summary: {
      counters: {
        nodesCreated: () => nodesCreated,
        nodesDeleted: () => nodesDeleted,
        relationshipsCreated: () => relationshipsCreated,
        relationshipsDeleted: () => relationshipsDeleted,
      },
    },
  };
}

describe('GraphOpsService.applyBatchOperations', () => {
  let runMock;
  let commitMock;
  let rollbackMock;
  let closeMock;
  let beginTransactionMock;
  let sessionMock;
  let driverMock;

  beforeEach(() => {
    runMock = jest.fn();
    commitMock = jest.fn();
    rollbackMock = jest.fn();
    closeMock = jest.fn();
    beginTransactionMock = jest.fn(() => ({
      run: runMock,
      commit: commitMock,
      rollback: rollbackMock,
    }));
    sessionMock = {
      beginTransaction: beginTransactionMock,
      close: closeMock,
    };
    driverMock = {
      session: jest.fn(() => sessionMock),
    };
    getNeo4jDriver.mockReturnValue(driverMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('applies batch operations within a single transaction and sanitizes payloads', async () => {
    runMock.mockImplementation((cypher) => {
      if (cypher.includes('MERGE (n:Entity')) {
        return makeResultCounters({ nodesCreated: 1 });
      }
      if (cypher.includes('MERGE (source)-[rel:RELATIONSHIP')) {
        return makeResultCounters({ relationshipsCreated: 1 });
      }
      if (cypher.includes('DETACH DELETE n')) {
        return makeResultCounters({ nodesDeleted: 1, relationshipsDeleted: 1 });
      }
      if (cypher.includes('DELETE rel')) {
        return makeResultCounters({ relationshipsDeleted: 1 });
      }
      return makeResultCounters();
    });

    const result = await GraphOpsService.applyBatchOperations(
      {
        createNodes: [
          {
            id: 'node-1',
            tenantId: 'tenant',
            type: 'Person',
            label: 'Node One',
            tags: ['alpha', 'alpha', 'beta'],
            properties: {
              score: 0.7,
              tenantId: 'should-strip',
              nested: { keep: true },
              blank: null,
            },
          },
          {
            id: 'node-2',
            tenantId: 'tenant',
            type: 'Person',
            label: 'Node Two',
          },
        ],
        createEdges: [
          {
            tenantId: 'tenant',
            type: 'KNOWS',
            sourceId: 'node-1',
            targetId: 'node-2',
            properties: { weight: 0.4 },
          },
        ],
        deleteNodes: [{ id: 'node-3', tenantId: 'tenant' }],
        deleteEdges: [{ id: 'rel-1', tenantId: 'tenant' }],
      },
      { traceId: 'trace-1' },
    );

    expect(driverMock.session).toHaveBeenCalledWith({ defaultAccessMode: neo4j.session.WRITE });
    expect(beginTransactionMock).toHaveBeenCalled();
    expect(runMock).toHaveBeenCalledTimes(4);

    const createNodesParams = runMock.mock.calls[0][1];
    expect(createNodesParams.nodes).toHaveLength(2);
    expect(createNodesParams.nodes[0]).toMatchObject({
      id: 'node-1',
      tenantId: 'tenant',
      label: 'Node One',
      tags: ['alpha', 'beta'],
      properties: { score: 0.7, nested: { keep: true } },
    });
    expect(createNodesParams.nodes[0].properties).not.toHaveProperty('tenantId');
    expect(createNodesParams.nodes[0].properties).not.toHaveProperty('blank');
    expect(createNodesParams.nodes[1]).toMatchObject({
      id: 'node-2',
      tenantId: 'tenant',
      label: 'Node Two',
      properties: {},
    });

    const createEdgesParams = runMock.mock.calls[1][1];
    expect(createEdgesParams.edges[0]).toMatchObject({
      tenantId: 'tenant',
      type: 'KNOWS',
      sourceId: 'node-1',
      targetId: 'node-2',
      properties: { weight: 0.4 },
    });
    expect(createEdgesParams.edges[0].id).toEqual(expect.any(String));

    const deleteNodesParams = runMock.mock.calls[2][1];
    expect(deleteNodesParams.nodes).toEqual([{ id: 'node-3', tenantId: 'tenant' }]);

    const deleteEdgesParams = runMock.mock.calls[3][1];
    expect(deleteEdgesParams.edges).toEqual([{ id: 'rel-1', tenantId: 'tenant' }]);

    expect(commitMock).toHaveBeenCalled();
    expect(rollbackMock).not.toHaveBeenCalled();
    expect(closeMock).toHaveBeenCalled();

    expect(result).toEqual({
      nodesCreated: 1,
      nodesUpdated: 1,
      edgesCreated: 1,
      edgesUpdated: 0,
      nodesDeleted: 1,
      edgesDeleted: 2,
    });
  });

  it('rolls back the transaction on failure', async () => {
    runMock.mockImplementation(() => {
      throw new Error('cypher failed');
    });

    await expect(
      GraphOpsService.applyBatchOperations(
        {
          createNodes: [{ id: 'node-1', tenantId: 'tenant', type: 'Person', label: 'Node' }],
        },
        { traceId: 'trace-2' },
      ),
    ).rejects.toThrow('cypher failed');

    expect(commitMock).not.toHaveBeenCalled();
    expect(rollbackMock).toHaveBeenCalled();
    expect(closeMock).toHaveBeenCalled();
  });
});

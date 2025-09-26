jest.mock('../src/services/TagService', () => ({
  addTag: jest.fn(),
  deleteTag: jest.fn(),
}));

jest.mock('../src/services/GraphOpsService', () => ({
  applyBatchOperations: jest.fn(),
  expandNeighbors: jest.fn(),
  expandNeighborhood: jest.fn(),
}));

const { graphResolvers } = require('../src/graphql/resolvers.graphops');
const TagService = require('../src/services/TagService');
const GraphOpsService = require('../src/services/GraphOpsService');

describe('GraphOps resolvers', () => {
  const ctx = {
    user: { id: 'u1', role: 'ANALYST' },
    logger: { error: jest.fn(), info: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    ctx.logger.error.mockClear();
    ctx.logger.info.mockClear();
  });

  it('deletes a tag from an entity', async () => {
    const mockEntity = { id: 'e1', tags: [] };
    TagService.deleteTag.mockResolvedValue(mockEntity);

    const result = await graphResolvers.Mutation.deleteTag(
      null,
      { entityId: 'e1', tag: 'ok' },
      ctx,
    );

    expect(TagService.deleteTag).toHaveBeenCalledWith('e1', 'ok', expect.any(Object));
    expect(result).toEqual(mockEntity);
  });

  it('executes batch graph updates with validated payload', async () => {
    const batchResult = {
      nodesCreated: 1,
      nodesUpdated: 0,
      edgesCreated: 2,
      edgesUpdated: 0,
      nodesDeleted: 1,
      edgesDeleted: 1,
    };
    GraphOpsService.applyBatchOperations.mockResolvedValue(batchResult);

    const input = {
      createNodes: [
        {
          id: 'n1',
          tenantId: 'tenant',
          type: 'Person',
          label: 'Node 1',
          tags: ['alpha', 'beta'],
          properties: { score: 0.7, extra: null },
        },
      ],
      createEdges: [
        {
          tenantId: 'tenant',
          type: 'RELATIONSHIP',
          sourceId: 'n1',
          targetId: 'n2',
          properties: { weight: 1 },
        },
      ],
      deleteNodes: [{ id: 'n3', tenantId: 'tenant' }],
      deleteEdges: [{ id: 'r1', tenantId: 'tenant' }],
    };

    const result = await graphResolvers.Mutation.batchGraphUpdate(null, { input }, ctx);

    expect(GraphOpsService.applyBatchOperations).toHaveBeenCalledTimes(1);
    expect(GraphOpsService.applyBatchOperations).toHaveBeenCalledWith(
      {
        createNodes: [
          {
            id: 'n1',
            tenantId: 'tenant',
            type: 'Person',
            label: 'Node 1',
            tags: ['alpha', 'beta'],
            properties: { score: 0.7, extra: null },
          },
        ],
        createEdges: [
          {
            tenantId: 'tenant',
            type: 'RELATIONSHIP',
            sourceId: 'n1',
            targetId: 'n2',
            properties: { weight: 1 },
          },
        ],
        deleteNodes: [{ id: 'n3', tenantId: 'tenant' }],
        deleteEdges: [{ id: 'r1', tenantId: 'tenant' }],
      },
      expect.objectContaining({ traceId: expect.any(String), user: ctx.user }),
    );
    expect(result).toEqual(batchResult);
  });

  it('rejects batch graph update when no operations provided', async () => {
    const input = {
      createNodes: [],
      createEdges: [],
      deleteNodes: [],
      deleteEdges: [],
    };

    await expect(
      graphResolvers.Mutation.batchGraphUpdate(null, { input }, ctx),
    ).rejects.toThrow('At least one batch operation must be provided');
    expect(GraphOpsService.applyBatchOperations).not.toHaveBeenCalled();
  });
});

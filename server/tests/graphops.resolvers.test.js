jest.mock('../src/services/TagService', () => ({
  addTag: jest.fn(),
  deleteTag: jest.fn(),
}));

const { graphResolvers } = require('../src/graphql/resolvers.graphops');
const TagService = require('../src/services/TagService');

describe('GraphOps resolvers', () => {
  const ctx = {
    user: { id: 'u1', role: 'ANALYST' },
    logger: { error: jest.fn(), info: jest.fn() },
  };

  it('deletes a tag from an entity', async () => {
    const mockEntity = { id: 'e1', tags: [] };
    TagService.deleteTag.mockResolvedValue(mockEntity);

    const result = await graphResolvers.Mutation.deleteTag(null, { entityId: 'e1', tag: 'ok' }, ctx);

    expect(TagService.deleteTag).toHaveBeenCalledWith('e1', 'ok', expect.any(Object));
    expect(result).toEqual(mockEntity);
  });
});


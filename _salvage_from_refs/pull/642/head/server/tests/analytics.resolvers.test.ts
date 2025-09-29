jest.mock('../src/ai/analyticsClient', () => ({
  analyticsClient: {
    extractEntities: jest.fn(),
    linkSuggestions: jest.fn(),
  },
}));


const analyticsResolvers = require('../src/graphql/resolvers/analytics').default;
const { analyticsClient } = require('../src/ai/analyticsClient');

describe('analytics resolvers', () => {
  test('extractEntities uses client', async () => {
    analyticsClient.extractEntities.mockResolvedValue({ entities: [{ text: 'A', label: 'X' }] });
    const result = await analyticsResolvers.Mutation.extractEntities(null, { text: 'hi' });
    expect(result).toEqual([{ text: 'A', label: 'X' }]);
  });

  test('linkSuggestions returns list', async () => {
    analyticsClient.linkSuggestions.mockResolvedValue({ suggestions: [] });
    const result = await analyticsResolvers.Query.linkSuggestions(null, { investigationId: 'i1' });
    expect(Array.isArray(result)).toBe(true);
  });
});

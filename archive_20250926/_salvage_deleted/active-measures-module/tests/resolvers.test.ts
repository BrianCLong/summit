import { resolvers } from '../src/graphql/resolvers';

// Mock the driver
const mockDriver = {
  session: () => ({
    run: (query, params) => {
      console.log("Mock run:", query, params);
      return {
        records: [],
      };
    },
    close: () => {},
  }),
};

test('activeMeasuresPortfolio returns tuned measures', async () => {
  const result = await (resolvers.Query.activeMeasuresPortfolio as any)(null, { query: 'disinfo', tuners: { proportionality: 0.7 } }, { driver: mockDriver });
  expect(result).toEqual([]);
});
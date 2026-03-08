import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from '../../src/api/graphql/taskThread/typeDefs';
import { resolvers } from '../../src/api/graphql/taskThread/resolvers';

describe('TaskThread Schema', () => {
  it('should compile correctly', () => {
    expect(() => {
      makeExecutableSchema({
        typeDefs: [typeDefs],
        resolvers: [resolvers],
      });
    }).not.toThrow();
  });
});

import { ApolloServer } from '@apollo/server';
import { typeDefs } from '../../src/graphql/schema';
import { resolvers } from '../../src/graphql/resolvers';

type ExecInput = { query: string; variables?: Record<string, any> };

export async function withLegacyGraphServer<T>(
  run: (exec: (i: ExecInput) => Promise<any>) => Promise<T>,
  context: Record<string, any> = {},
): Promise<T> {
  const server = new ApolloServer({ typeDefs, resolvers, introspection: true });
  await server.start();
  try {
    const exec = async ({ query, variables }: ExecInput) => {
      return server.executeOperation(
        { query, variables },
        { contextValue: context },
      );
    };
    return await run(exec);
  } finally {
    await server.stop();
  }
}

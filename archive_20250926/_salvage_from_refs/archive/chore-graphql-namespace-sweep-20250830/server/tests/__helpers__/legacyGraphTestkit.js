import { ApolloServer } from '@apollo/server';
import { typeDefs } from '../../src/graphql/schema';
import { resolvers } from '../../src/graphql/resolvers';
export async function withLegacyGraphServer(run, context = {}) {
    const server = new ApolloServer({ typeDefs, resolvers, introspection: true });
    await server.start();
    try {
        const exec = async ({ query, variables }) => {
            return server.executeOperation({ query, variables }, { contextValue: context });
        };
        return await run(exec);
    }
    finally {
        await server.stop();
    }
}
//# sourceMappingURL=legacyGraphTestkit.js.map
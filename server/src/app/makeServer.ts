import { ApolloServer } from '@apollo/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from '../graphql/schema/index.js';
import resolvers from '../graphql/resolvers/index.js';
import { authDirective } from '../graphql/authDirective.js';
import { getContext } from '../lib/auth.js';

export interface MakeServerOptions {
  user?: any;
  tenant?: string;
  role?: string;
  scopes?: string[];
  // Provide or augment context for unit tests (in-memory stubs, tenant, etc.)
  context?:
    | Record<string, any>
    | ((base: any) => Promise<Record<string, any>> | Record<string, any>);
}

export async function makeGraphServer(opts: MakeServerOptions = {}) {
  let schema = makeExecutableSchema({ typeDefs, resolvers: resolvers as any });
  const { authDirectiveTransformer } = authDirective();
  schema = authDirectiveTransformer(schema);

  const server = new ApolloServer({
    schema,
    introspection: true,
  });
  await server.start();

  return {
    server,
    createContext: async (_reqRes?: any) => {
      // Base context via application auth
      const base = await getContext({ req: { headers: {} } as any });
      // Inject test user if provided
      const injectedUser =
        opts.user ??
        (opts.tenant || opts.role || opts.scopes
          ? {
              id: 'test-user',
              email: 'test@intelgraph.local',
              role: opts.role ?? 'ADMIN',
              tenant: opts.tenant ?? 'test-tenant',
              scopes: opts.scopes ?? ['*'],
            }
          : null);

      const withUser = injectedUser
        ? {
            ...base,
            user: injectedUser,
            isAuthenticated: true,
            tenantId: injectedUser.tenant,
          }
        : base;
      // Merge/override additional context
      if (opts.context) {
        const extra =
          typeof opts.context === 'function'
            ? await opts.context(withUser)
            : opts.context;
        return { ...withUser, ...extra };
      }
      return withUser;
    },
    async stop() {
      await server.stop();
    },
  };
}

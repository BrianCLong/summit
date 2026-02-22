import { ApolloServer } from '@apollo/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from '../graphql/schema/index.ts';
import resolvers from '../graphql/resolvers/index.ts';
import { authDirectiveTransformer } from '../graphql/authDirective.ts';
import { getContext, AuthContext } from '../lib/auth.ts';

export interface MakeServerOptions {
  user?: {
    id: string;
    email: string;
    role: string;
    tenant: string;
    scopes: string[];
  };
  tenant?: string;
  role?: string;
  scopes?: string[];
  // Provide or augment context for unit tests (in-memory stubs, tenant, etc.)
  context?:
  | Record<string, unknown>
  | ((
    base: AuthContext,
  ) => Promise<Record<string, unknown>> | Record<string, unknown>);
}

export async function makeGraphServer(opts: MakeServerOptions = {}) {
  let schema = makeExecutableSchema({
    typeDefs,
    resolvers: resolvers as any,
  });
  schema = authDirectiveTransformer(schema);

  const server = new ApolloServer({
    schema,
    introspection: true,
  });
  await server.start();

  return {
    server,
    createContext: async (_reqRes?: unknown) => {
      // Base context via application auth
      const base = await getContext({
        req: { headers: {} } as { headers: Record<string, string> },
      });
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

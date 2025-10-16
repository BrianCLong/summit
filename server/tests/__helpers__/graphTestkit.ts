// server/tests/__helpers__/graphTestkit.ts
import type { DocumentNode } from 'graphql';

type ExecInput = {
  query: string | DocumentNode;
  variables?: Record<string, any>;
};

export async function withGraphServer<T>(
  run: (exec: (i: ExecInput) => Promise<any>) => Promise<T>,
): Promise<T> {
  const { makeGraphServer } = await import('../../src/app/makeServer');
  const { server, createContext, stop } = await makeGraphServer();
  try {
    const exec = async ({ query, variables }: ExecInput) => {
      const contextValue = await createContext({
        req: {} as any,
        res: {} as any,
      });
      return server.executeOperation(
        {
          query:
            typeof query === 'string'
              ? query
              : ((query as any).loc?.source.body ?? (query as any)),
          variables,
        },
        { contextValue },
      );
    };
    return await run(exec);
  } finally {
    await stop?.();
  }
}

export async function withGraphServer(run) {
    const { makeGraphServer } = await import('../../src/app/makeServer');
    const { server, createContext, stop } = await makeGraphServer();
    try {
        const exec = async ({ query, variables }) => {
            const contextValue = await createContext({ req: {}, res: {} });
            return server.executeOperation({
                query: typeof query === 'string' ? query : (query.loc?.source.body ?? query),
                variables,
            }, { contextValue });
        };
        return await run(exec);
    }
    finally {
        await (stop?.());
    }
}
//# sourceMappingURL=graphTestkit.js.map
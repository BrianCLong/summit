import fs from 'fs/promises';
import path from 'path';

describe.skip('PersistedQueriesPlugin enforcement', () => {
  const allowedQuery = `query { _empty }`;
  const tempFile = path.join(process.cwd(), 'persisted-queries.test.json');
  let plugin: any;
  let hash: string;

  beforeAll(async () => {
    const mod: any = await import('../src/graphql/plugins/persistedQueries.js');
    const PersistedQueriesPlugin = mod.default;
    const tmpPlugin = new PersistedQueriesPlugin({
      enabled: false,
      generateOnBuild: false,
    });
    hash = tmpPlugin.generateQueryHash(allowedQuery);
    await fs.writeFile(
      tempFile,
      JSON.stringify({
        [hash]: { query: allowedQuery.trim(), operationName: null },
      })
    );
    plugin = new PersistedQueriesPlugin({
      enabled: true,
      allowNonPersisted: false,
      queriesFilePath: tempFile,
      generateOnBuild: false,
    });
  });

  afterAll(async () => {
    await fs.unlink(tempFile).catch(() => {});
  });

  test('allows persisted query in production', async () => {
    const result = await plugin.processRequest({ query: allowedQuery }, {} as any);
    expect(result).toHaveProperty('persisted', true);
    expect(result).toHaveProperty('hash', hash);
  });

  test('rejects non-persisted query in production', async () => {
    await expect(
      plugin.processRequest({ query: 'query { unknownField }' }, {} as any)
    ).rejects.toThrow('Query not found in persisted queries');
  });
});

import { ContextPrunerClient } from '../context/ContextPrunerClient.js';

describe('ContextPrunerClient', () => {
  it('throws on non-200 responses', async () => {
    const client = new ContextPrunerClient('http://localhost:9999', 10);
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
    })) as unknown as typeof fetch;

    await expect(client.highlight({ query: 'test', context: 'text' })).rejects.toThrow(
      'Context pruner failed: 500',
    );
  });
});

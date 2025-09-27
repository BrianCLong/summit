import nock from 'nock';
import { createContext } from '../../src/connectors/ConnectorSDK';

describe('ConnectorSDK http', () => {
  it('enforces allowlist', async () => {
    const ctx = createContext({ tenantId: 't1', allowlist: ['example.com'] });
    nock('https://example.com').get('/').reply(200, 'ok');
    const res = await ctx.http('https://example.com/');
    expect(res.status).toBe(200);
    await expect(ctx.http('https://bad.com/')).rejects.toThrow('egress blocked');
  });
});

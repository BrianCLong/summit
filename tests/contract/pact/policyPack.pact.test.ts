import { Pact } from '@pact-foundation/pact';
import path from 'node:path';

const provider = new Pact({
  consumer: 'CompanyOS',
  provider: 'MaestroConductor',
  dir: path.resolve('pact/pacts'),
});

describe('Policy Pack contract', () => {
  beforeAll(async () => {
    await provider.setup();
  });
  afterAll(async () => {
    await provider.finalize();
  });

  it('serves tar with Digest/ETag and optional attestation endpoint', async () => {
    await provider.addInteraction({
      state: 'policy pack exists',
      uponReceiving: 'GET policy pack',
      withRequest: { method: 'HEAD', path: '/v1/policy/packs/policy-pack-v0' },
      willRespondWith: {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.intelgraph.policy+tar',
          Digest: 'sha-256=abc123',
          ETag: 'W/"sha-256:abc123"',
        },
      },
    });

    await provider.executeTest(async (mock) => {
      const r = await fetch(`${mock}/v1/policy/packs/policy-pack-v0`, {
        method: 'HEAD',
      });
      expect(r.status).toBe(200);
      expect(r.headers.get('digest')).toMatch(/^sha-256=/);
      expect(r.headers.get('etag')).toMatch(/^W\/"sha-256:/);
    });
  });
});

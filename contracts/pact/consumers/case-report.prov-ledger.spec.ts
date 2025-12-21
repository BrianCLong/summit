import { PactV3 } from '@pact-foundation/pact';

const provider = new PactV3({ consumer: 'case-report', provider: 'prov-ledger' });

provider
  .given('manifest exists for case 123')
  .uponReceiving('get manifest')
  .withRequest({ method: 'GET', path: '/ledger/export/123' })
  .willRespondWith({ status: 200, body: { manifest: 'base64...' } });

test('contract', () =>
  provider.executeTest(async (mock) => {
    const res = await (await fetch(`${mock.url}/ledger/export/123`)).json();
    expect(res.manifest).toBeDefined();
  }),
);

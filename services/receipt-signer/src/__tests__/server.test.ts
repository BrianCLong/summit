import { createSignerApp } from '../server.js';
import { ReceiptSigner } from '../signer.js';

describe('receipt-signer service', () => {
  const signer = new ReceiptSigner('test-key');
  const app = createSignerApp(signer);

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('signs and verifies payloads', async () => {
    const payload = 'abc123';
    const signRes = await app.inject({
      method: 'POST',
      url: '/sign',
      payload: { payload },
    });

    expect(signRes.statusCode).toBe(200);
    const signBody = signRes.json();
    expect(signBody.signature.value).toBeTruthy();
    expect(signBody.signature.keyId).toBe('test-key');

    const verifyRes = await app.inject({
      method: 'POST',
      url: '/verify',
      payload: { payload, signature: signBody.signature },
    });

    expect(verifyRes.statusCode).toBe(200);
    expect(verifyRes.json().valid).toBe(true);
  });

  it('rejects malformed requests', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/sign',
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });
});

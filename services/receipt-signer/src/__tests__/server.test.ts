import request from 'supertest';
import { createSignerApp } from '../server';
import { ReceiptSigner } from '../signer';

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
    const signRes = await request(app.server).post('/sign').send({ payload });

    expect(signRes.status).toBe(200);
    expect(signRes.body.signature.value).toBeTruthy();
    expect(signRes.body.signature.keyId).toBe('test-key');

    const verifyRes = await request(app.server)
      .post('/verify')
      .send({ payload, signature: signRes.body.signature });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.valid).toBe(true);
  });

  it('rejects malformed requests', async () => {
    const res = await request(app.server).post('/sign').send({});
    expect(res.status).toBe(400);
  });
});

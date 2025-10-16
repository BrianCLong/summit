import { KmsSigner } from '../products/Signer';

describe('KmsSigner', () => {
  it('signs and verifies using client', async () => {
    const client = {
      sign: async (id: string, data: Buffer) => data,
      verify: async (id: string, data: Buffer, sig: Buffer) =>
        Buffer.compare(data, sig) === 0,
    };
    const signer = new KmsSigner('kid1', client);
    const payload = Buffer.from('hello');
    const sig = await signer.sign(payload);
    expect(await signer.verify(payload, sig)).toBe(true);
    expect(signer.kid()).toBe('kid1');
  });
});

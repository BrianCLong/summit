import { registerSite, verifySignature } from '../src/sites/register';

test('registers site and rejects bad signatures', async () => {
  const s = await registerSite({
    name: 'edge-paris',
    region: 'eu-west-1',
    residency: 'EU',
    pubkey: '-----BEGIN PUBLIC KEY-----\nMIIB...\n-----END PUBLIC KEY-----\n',
    bandwidth: 'low',
  });
  expect(s.region).toBe('eu-west-1');
  expect(verifySignature('bad', Buffer.from('x'), 'abc=')).toBe(false);
});

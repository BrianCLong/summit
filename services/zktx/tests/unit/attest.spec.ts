import { attest } from '../../src/attest';
import { privateSetIntersect } from '../../src/psi';

test('psi mock intersects', async () => {
  const r = await privateSetIntersect(['a', 'b'], ['b', 'c']);
  expect(r).toEqual(['b']);
});

test('attestation produces digest', () => {
  const a = attest('svc', 'fingerprint');
  expect(a.measurement).toBe('fingerprint');
  const generated = attest('svc');
  expect(generated.measurement).toMatch(/^[a-f0-9]{64}$/);
});

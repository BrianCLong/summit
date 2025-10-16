import { verifySnapshot } from '../src/snapshots/verify';

test('fails on digest mismatch', async () => {
  await expect(async () =>
    verifySnapshot(Buffer.from('x'), 'sha256:dead', 'pub', 'sig'),
  ).rejects.toBeTruthy?.();
});

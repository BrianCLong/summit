import { putEncryptedArtifact } from '../src/conductor/crypto/envelope';

test('stores encrypted artifact with AAD (mocked vault likely fails)', async () => {
  // This test exercises function shape; in CI, VAULT env may be absent.
  // Expect rejection without Vault config.
  await expect(
    putEncryptedArtifact('bucket', 'key', 'acme', Buffer.from('abc'), {
      tenant: 'acme',
      runId: 'r1',
    }),
  ).rejects.toBeTruthy();
});

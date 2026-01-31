import { verifyTrustContract } from '../src/conductor/contracts/trust.js';

test('rejects expired contract', async () => {
  await expect(
    verifyTrustContract({
      providerTenant: 'a',
      consumerTenant: 'b',
      scope: {},
      residency: 'EU',
      expiresAt: '2000-01-01',
      signature: 'x',
    }),
  ).rejects.toBeTruthy();
});

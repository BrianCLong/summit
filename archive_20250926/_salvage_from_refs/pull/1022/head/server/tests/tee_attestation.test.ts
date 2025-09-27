import { AttestationVerifier } from '../src/tee/AttestationVerifier';

describe('AttestationVerifier', () => {
  const policy = { type: 'sgx', mrEnclave: ['abc'], maxSkewMs: 1000 } as const;
  const verifier = new AttestationVerifier(policy);

  it('accepts valid report', async () => {
    const report = { type: 'sgx', quoteOrReport: 'q', nonce: 'n', timestamp: Date.now() };
    const res = await verifier.verify(report);
    expect(res.ok).toBe(true);
  });

  it('rejects stale report', async () => {
    const report = { type: 'sgx', quoteOrReport: 'q', nonce: 'n', timestamp: Date.now() - 5000 };
    await expect(verifier.verify(report)).rejects.toThrow('attestation_stale');
  });

  it('rejects type mismatch', async () => {
    const report = { type: 'tdx', quoteOrReport: 'q', nonce: 'n', timestamp: Date.now() } as any;
    await expect(verifier.verify(report)).rejects.toThrow('attestation_type_mismatch');
  });
});

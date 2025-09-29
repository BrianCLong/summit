export type AttestType = 'sgx' | 'tdx' | 'sev_snp';
export interface AttestReport { type: AttestType; quoteOrReport: string; nonce: string; timestamp: number; }
export interface AttestPolicy { type: AttestType; mrEnclave?: string[]; mrSigner?: string[]; snpMeasurements?: string[]; maxSkewMs?: number; }

export class AttestationVerifier {
  constructor(private readonly policy: AttestPolicy) {}

  async verify(r: AttestReport): Promise<{ ok: boolean; claims: Record<string, string> }> {
    const skew = Math.abs(Date.now() - r.timestamp);
    if (skew > (this.policy.maxSkewMs ?? 300000)) throw new Error('attestation_stale');
    if (r.type !== this.policy.type) throw new Error('attestation_type_mismatch');
    if (r.type === 'sgx') {
      if (!(this.policy.mrEnclave?.length || this.policy.mrSigner?.length)) {
        throw new Error('policy_missing');
      }
    }
    return { ok: true, claims: { type: r.type, nonce: r.nonce, measurement: 'stubbed' } };
  }
}

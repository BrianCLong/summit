import { ContractSpec, Certification, CertificationResult } from './types.js';
import { normalizeSpec } from './spec-utils.js';

const encoder = new TextEncoder();

async function sha256Hex(input: string): Promise<string> {
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export class CertificationWorkflow {
  constructor(private readonly issuer: string) {}

  async issueCertificate(
    spec: ContractSpec,
    secret: string,
    validUntil?: string,
  ): Promise<Certification> {
    const payload = normalizeSpec(spec);
    const signature = await sha256Hex(`${secret}:${payload}`);
    return {
      id: `cert-${crypto.randomUUID()}`,
      contractId: spec.id,
      contractVersion: spec.version,
      issuer: this.issuer,
      issuedAt: new Date().toISOString(),
      validUntil,
      signature,
    };
  }

  async verifyCertificate(
    spec: ContractSpec,
    certificate: Certification,
    secret: string,
  ): Promise<CertificationResult> {
    const payload = normalizeSpec(spec);
    const expected = await sha256Hex(`${secret}:${payload}`);
    const verified =
      certificate.contractId === spec.id &&
      certificate.contractVersion === spec.version &&
      certificate.signature === expected;
    return { certificate, verified };
  }
}

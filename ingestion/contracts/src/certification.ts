import { createHash, createSign, generateKeyPairSync, verify } from 'crypto';
import { ContractSpec, CertificatePayload, ValidationFinding, Certification } from './types.js';
import { ContractSpecification } from './specification.js';

export class CertificateAuthority {
  private readonly privateKey: string;
  private readonly publicKey: string;
  constructor(private readonly signer = 'dpic-ca') {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    this.privateKey = privateKey;
    this.publicKey = publicKey;
  }

  signContract(spec: ContractSpec): CertificatePayload {
    const payload = {
      contractId: spec.id,
      dataset: spec.dataset,
      version: spec.version,
      issuedAt: new Date().toISOString(),
      signedBy: this.signer
    } as CertificatePayload;

    const signer = createSign('RSA-SHA256');
    signer.update(JSON.stringify({ contract: spec, issuedAt: payload.issuedAt }));
    payload.signature = signer.sign(this.privateKey, 'base64');
    return payload;
  }

  verify(payload: CertificatePayload, spec: ContractSpec): boolean {
    const verifier = verify(
      'RSA-SHA256',
      Buffer.from(JSON.stringify({ contract: spec, issuedAt: payload.issuedAt })),
      this.publicKey,
      Buffer.from(payload.signature, 'base64')
    );
    return verifier;
  }

  get publicKeyPem(): string {
    return this.publicKey;
  }
}

export class CertificationWorkflow {
  constructor(private readonly ca: CertificateAuthority) {}

  async certify(spec: ContractSpec): Promise<{ cert: Certification; findings: ValidationFinding[] }> {
    const findings = new ContractSpecification(spec).validate();
    const cert = await this.issueCertificate(spec, 'default-secret');
    return { cert, findings };
  }

  async issueCertificate(spec: ContractSpec, secret: string, validUntil?: string): Promise<Certification> {
    const specification = new ContractSpecification(spec);
    const findings = specification.validate();
    const blockingIssues = findings.filter((finding) => finding.severity === 'error');

    if (blockingIssues.length) {
      throw new Error(`contract ${spec.id} failed validation: ${blockingIssues[0].issue}`);
    }

    const signature = this.ca.signContract(spec);
    const hashedTerms = specification.hashTerms();

    const cert: Certification = {
      id: signature.signature.slice(0, 8),
      contractId: spec.id,
      issuedAt: signature.issuedAt,
      expiresAt: validUntil || new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString(),
      signature: signature.signature
    };

    spec.termsHash = hashedTerms;
    spec.certified = true;
    spec.certifiedAt = cert.issuedAt;
    spec.signature = cert.signature;

    return cert;
  }

  async verifyCertificate(spec: ContractSpec, certificate: Certification, secret: string): Promise<{ verified: boolean }> {
    const payload: CertificatePayload = {
      contractId: certificate.contractId,
      dataset: spec.dataset,
      version: spec.version,
      issuedAt: certificate.issuedAt,
      expiresAt: certificate.expiresAt,
      signedBy: 'dpic-ca',
      signature: certificate.signature
    };
    return { verified: this.ca.verify(payload, spec) };
  }

  enforceProductionGate(spec: ContractSpec): void {
    if (!spec.certified || !spec.signature) {
      throw new Error('production ingest blocked: contract is not certified');
    }

    const tamperHash = createHash('sha256').update(JSON.stringify(spec.fields)).digest('hex');
    if (tamperHash !== spec.termsHash) {
      throw new Error('production ingest blocked: contract hash mismatch');
    }
  }
}

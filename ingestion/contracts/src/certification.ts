import { createHash, createSign, generateKeyPairSync, verify } from 'crypto';
import { ContractSpec, CertificatePayload, ValidationFinding } from './types.js';
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

  certify(spec: ContractSpec): { cert: CertificatePayload; findings: ValidationFinding[] } {
    const specification = new ContractSpecification(spec);
    const findings = specification.validate();
    const blockingIssues = findings.filter((finding) => finding.severity === 'error');

    if (blockingIssues.length) {
      throw new Error(`contract ${spec.id} failed validation: ${blockingIssues[0].issue}`);
    }

    const signature = this.ca.signContract(spec);
    const hashedTerms = specification.hashTerms();

    const cert: CertificatePayload = {
      ...signature,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString(),
      contractId: spec.id,
      dataset: spec.dataset,
      version: spec.version,
      signedBy: signature.signedBy,
      signature: signature.signature,
      issuedAt: signature.issuedAt
    };

    spec.termsHash = hashedTerms;
    spec.certified = true;
    spec.certifiedAt = cert.issuedAt;
    spec.signature = cert.signature;

    return { cert, findings };
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

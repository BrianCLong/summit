import {
  createSign,
  createVerify,
  generateKeyPairSync,
  randomUUID,
} from 'crypto';
import {
  type Certificate,
  type CertificateRecord,
  type CertificateVerification,
  type IdentityMaterial,
  type KeyPair,
  type MtlsValidationResult,
} from './types.js';

function buildKeyPair(): KeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('ec', {
    namedCurve: 'P-256',
  });

  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });

  return {
    privateKey: privateKeyPem.toString(),
    publicKey: publicKeyPem.toString(),
    keyObject: privateKey,
  };
}

export class PkiManager {
  private readonly caId: string;

  private readonly caPrivateKey: KeyPair;

  private readonly certificates = new Map<string, CertificateRecord>();

  constructor(caSubject: string, caId?: string) {
    this.caId = caId ?? `ca-${randomUUID()}`;
    this.caPrivateKey = buildKeyPair();
    const caCertificate = this.issueCertificateInternal(
      caSubject,
      24 * 60,
      { isCa: 'true' },
    );
    this.certificates.set(caCertificate.certificate.id, {
      ...caCertificate,
      revocationReason: undefined,
    });
  }

  listCertificates(): Certificate[] {
    return Array.from(this.certificates.values()).map(
      (record) => record.certificate,
    );
  }

  issueCertificate(
    subject: string,
    ttlMinutes: number,
    metadata?: Record<string, string>,
  ): IdentityMaterial {
    const certificate = this.issueCertificateInternal(subject, ttlMinutes, metadata);
    this.certificates.set(certificate.certificate.id, {
      ...certificate,
      revocationReason: undefined,
    });
    return certificate;
  }

  private issueCertificateInternal(
    subject: string,
    ttlMinutes: number,
    metadata?: Record<string, string>,
  ): IdentityMaterial {
    const keyPair = buildKeyPair();
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + ttlMinutes * 60_000);
    const certificatePayload = JSON.stringify({
      subject,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      publicKey: keyPair.publicKey,
      issuer: this.caId,
      metadata,
    });

    const signer = createSign('SHA256');
    signer.update(certificatePayload);
    const signature = signer.sign(this.caPrivateKey.keyObject, 'base64');

    const certificate: Certificate = {
      id: `cert-${randomUUID()}`,
      subject,
      issuer: this.caId,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      publicKey: keyPair.publicKey,
      signature,
      metadata,
    };

    return { certificate, privateKey: keyPair.privateKey };
  }

  verifyCertificate(certificate: Certificate): CertificateVerification {
    const reasons: string[] = [];
    const verification = createVerify('SHA256');
    verification.update(
      JSON.stringify({
        subject: certificate.subject,
        issuedAt: certificate.issuedAt,
        expiresAt: certificate.expiresAt,
        publicKey: certificate.publicKey,
        issuer: certificate.issuer,
        metadata: certificate.metadata,
      }),
    );

    const now = Date.now();
    if (new Date(certificate.expiresAt).getTime() <= now) {
      reasons.push('certificate expired');
    }

    const record = this.certificates.get(certificate.id);
    if (record?.revocationReason) {
      reasons.push(`revoked: ${record.revocationReason}`);
    }

    if (certificate.issuer !== this.caId) {
      reasons.push('unexpected issuer');
    }

    const signatureValid = verification.verify(
      this.caPrivateKey.publicKey,
      certificate.signature,
      'base64',
    );
    if (!signatureValid) {
      reasons.push('signature invalid');
    }

    return { valid: reasons.length === 0, reasons };
  }

  rotateCertificate(certId: string, ttlMinutes: number): IdentityMaterial {
    const existing = this.certificates.get(certId);
    if (!existing) {
      throw new Error(`certificate ${certId} not found`);
    }

    this.revokeCertificate(certId, 'rotated');
    return this.issueCertificate(existing.certificate.subject, ttlMinutes, {
      ...existing.certificate.metadata,
      rotatedFrom: certId,
    });
  }

  revokeCertificate(certId: string, reason: string): void {
    const record = this.certificates.get(certId);
    if (!record) {
      throw new Error(`certificate ${certId} not found`);
    }
    this.certificates.set(certId, {
      ...record,
      revocationReason: reason,
    });
  }

  mutualTlsHandshake(
    client: Certificate,
    server: Certificate,
  ): MtlsValidationResult {
    const clientVerification = this.verifyCertificate(client);
    const serverVerification = this.verifyCertificate(server);

    const reasons = [
      ...clientVerification.reasons.map((reason) => `client: ${reason}`),
      ...serverVerification.reasons.map((reason) => `server: ${reason}`),
    ];

    const allowed = clientVerification.valid && serverVerification.valid;
    if (!allowed && reasons.length === 0) {
      reasons.push('handshake failed for unknown reasons');
    }

    return {
      clientValid: clientVerification.valid,
      serverValid: serverVerification.valid,
      allowed,
      reasons,
    };
  }

  getRevocationCount(): number {
    return Array.from(this.certificates.values()).filter(
      (record) => Boolean(record.revocationReason),
    ).length;
  }
}

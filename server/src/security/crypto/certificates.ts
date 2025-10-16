import crypto from 'node:crypto';
import type { ChainValidationResult } from './types.js';

function normalizeDn(dn: string): string {
  return dn.trim().replace(/\s+/g, ' ').toLowerCase();
}

export class CertificateValidator {
  private readonly trustAnchors = new Map<string, crypto.X509Certificate>();

  constructor(anchors: string[] = []) {
    anchors.forEach((anchor) => this.addTrustAnchor(anchor));
  }

  addTrustAnchor(pem: string): void {
    const cert = new crypto.X509Certificate(pem);
    this.trustAnchors.set(normalizeDn(cert.subject), cert);
    this.trustAnchors.set(cert.fingerprint256, cert);
  }

  validate(chain: string[] = []): ChainValidationResult {
    if (!chain.length) {
      return {
        valid: this.trustAnchors.size === 0,
        errors:
          this.trustAnchors.size === 0 ? [] : ['No certificates supplied'],
        depth: 0,
      };
    }

    const errors: string[] = [];
    let depth = 0;
    let issuer: crypto.X509Certificate | undefined;

    for (let i = 0; i < chain.length; i += 1) {
      const pem = chain[i];
      let cert: crypto.X509Certificate;
      try {
        cert = new crypto.X509Certificate(pem);
      } catch (error: any) {
        errors.push(`Invalid certificate at position ${i}: ${error.message}`);
        continue;
      }

      depth += 1;

      const now = Date.now();
      if (new Date(cert.validFrom).getTime() > now) {
        errors.push(`Certificate ${cert.subject} not yet valid`);
      }
      if (new Date(cert.validTo).getTime() < now) {
        errors.push(`Certificate ${cert.subject} expired on ${cert.validTo}`);
      }

      if (i + 1 < chain.length) {
        issuer = new crypto.X509Certificate(chain[i + 1]);
      } else {
        const normalizedIssuer = normalizeDn(cert.issuer);
        issuer =
          this.trustAnchors.get(normalizedIssuer) ||
          this.trustAnchors.get(cert.fingerprint256) ||
          undefined;
      }

      if (!issuer) {
        errors.push(`Unable to locate issuer for ${cert.subject}`);
        continue;
      }

      try {
        const verified = cert.verify(issuer.publicKey);
        if (!verified) {
          errors.push(`Signature validation failed for ${cert.subject}`);
        }
      } catch (error: any) {
        errors.push(
          `Certificate verification error for ${cert.subject}: ${error.message}`,
        );
      }
    }

    let leafSubject: string | undefined;
    let rootSubject: string | undefined;

    try {
      leafSubject = new crypto.X509Certificate(chain[0]).subject;
    } catch {
      leafSubject = undefined;
    }

    try {
      rootSubject = (
        issuer ?? new crypto.X509Certificate(chain[chain.length - 1])
      ).subject;
    } catch {
      rootSubject = issuer?.subject;
    }

    return {
      valid: errors.length === 0,
      errors,
      depth,
      leafSubject,
      rootSubject,
    };
  }
}

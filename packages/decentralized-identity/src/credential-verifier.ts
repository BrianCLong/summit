/**
 * Credential Verifier - Verify verifiable credentials and presentations
 */

import crypto from 'crypto';
import type {
  VerifiableCredential,
  VerifiablePresentation,
  DIDDocument,
} from './types.js';
import { DIDManager } from './did-manager.js';

interface VerificationResult {
  valid: boolean;
  checks: {
    signature: boolean;
    expiration: boolean;
    revocation: boolean;
    issuer: boolean;
  };
  errors: string[];
}

export class CredentialVerifier {
  private didManager: DIDManager;
  private revokedCredentials: Set<string> = new Set();
  private trustedIssuers: Set<string> = new Set();

  constructor(didManager: DIDManager) {
    this.didManager = didManager;
  }

  addTrustedIssuer(issuerDid: string): void {
    this.trustedIssuers.add(issuerDid);
  }

  removeTrustedIssuer(issuerDid: string): void {
    this.trustedIssuers.delete(issuerDid);
  }

  async verifyCredential(credential: VerifiableCredential): Promise<VerificationResult> {
    const errors: string[] = [];
    const checks = {
      signature: false,
      expiration: false,
      revocation: false,
      issuer: false,
    };

    // Check issuer trust
    const issuerDid =
      typeof credential.issuer === 'string'
        ? credential.issuer
        : credential.issuer.id;

    if (this.trustedIssuers.size > 0 && !this.trustedIssuers.has(issuerDid)) {
      errors.push(`Issuer ${issuerDid} is not trusted`);
    } else {
      checks.issuer = true;
    }

    // Check expiration
    if (credential.expirationDate) {
      const expDate = new Date(credential.expirationDate);
      if (expDate < new Date()) {
        errors.push('Credential has expired');
      } else {
        checks.expiration = true;
      }
    } else {
      checks.expiration = true;
    }

    // Check revocation
    if (credential.id && this.revokedCredentials.has(credential.id)) {
      errors.push('Credential has been revoked');
    } else {
      checks.revocation = true;
    }

    // Verify signature
    if (credential.proof) {
      const signatureValid = await this.verifySignature(credential, issuerDid);
      if (signatureValid) {
        checks.signature = true;
      } else {
        errors.push('Invalid signature');
      }
    } else {
      errors.push('No proof attached to credential');
    }

    return {
      valid: Object.values(checks).every((c) => c),
      checks,
      errors,
    };
  }

  async verifyPresentation(
    presentation: VerifiablePresentation,
  ): Promise<VerificationResult> {
    const errors: string[] = [];
    const checks = {
      signature: false,
      expiration: true,
      revocation: true,
      issuer: true,
    };

    // Verify all credentials in presentation
    for (const credential of presentation.verifiableCredential) {
      const result = await this.verifyCredential(credential);
      if (!result.valid) {
        errors.push(...result.errors.map((e) => `Credential: ${e}`));
      }
    }

    // Verify presentation proof
    if (presentation.proof) {
      const signatureValid = await this.verifySignature(
        presentation,
        presentation.holder,
      );
      if (signatureValid) {
        checks.signature = true;
      } else {
        errors.push('Invalid presentation signature');
      }
    } else {
      errors.push('No proof attached to presentation');
    }

    return {
      valid: errors.length === 0 && Object.values(checks).every((c) => c),
      checks,
      errors,
    };
  }

  async checkCredentialRequirements(
    credential: VerifiableCredential,
    requirements: {
      types?: string[];
      claims?: { name: string; value?: unknown }[];
    },
  ): Promise<boolean> {
    // Check required types
    if (requirements.types) {
      for (const type of requirements.types) {
        if (!credential.type.includes(type)) {
          return false;
        }
      }
    }

    // Check required claims
    if (requirements.claims) {
      for (const claim of requirements.claims) {
        const value = credential.credentialSubject[claim.name];
        if (value === undefined) return false;
        if (claim.value !== undefined && value !== claim.value) return false;
      }
    }

    return true;
  }

  markRevoked(credentialId: string): void {
    this.revokedCredentials.add(credentialId);
  }

  private async verifySignature(
    data: VerifiableCredential | VerifiablePresentation,
    signerDid: string,
  ): Promise<boolean> {
    // Resolve DID to get public key
    const didDocument = await this.didManager.resolveDID(signerDid);
    if (!didDocument) return false;

    // In production, properly verify JWS signature
    // For now, simplified verification
    return data.proof !== undefined;
  }
}

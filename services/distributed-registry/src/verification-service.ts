/**
 * Verification Service - Automatic peer and contributor verification
 */

import type { Peer } from './index.js';
import crypto from 'crypto';

interface VerificationResult {
  verified: boolean;
  trustScore: number;
  attestations: VerifiedAttestation[];
}

interface VerifiedAttestation {
  issuer: string;
  claim: string;
  verified: boolean;
  expiresAt: Date;
}

export class VerificationService {
  private trustedIssuers: Set<string> = new Set([
    'did:web:intelgraph.io',
    'did:web:summit.gov',
    'did:key:z6Mk...',
  ]);

  async verifyPeer(peer: Peer): Promise<boolean> {
    // Verify public key format
    if (!this.isValidPublicKey(peer.publicKey)) {
      return false;
    }

    // Verify at least one valid endpoint
    if (!peer.endpoints.length) {
      return false;
    }

    // Verify attestations if present
    if (peer.attestations?.length) {
      const validAttestations = await this.verifyAttestations(peer.attestations);
      if (validAttestations < 1) {
        return false;
      }
    }

    return true;
  }

  async verifyContributor(
    contributorId: string,
    poolId: string,
    requiredAttestations: string[],
  ): Promise<VerificationResult> {
    const attestations: VerifiedAttestation[] = [];
    let trustScore = 0.5;

    // Check required attestations (simplified)
    for (const required of requiredAttestations) {
      // In production, query attestation service
      const verified = await this.checkAttestation(contributorId, required);
      attestations.push({
        issuer: required,
        claim: `contributor:${poolId}`,
        verified,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });
      if (verified) trustScore += 0.1;
    }

    return {
      verified: attestations.every((a) => a.verified),
      trustScore: Math.min(trustScore, 1.0),
      attestations,
    };
  }

  async verifyDataAccess(
    userId: string,
    poolId: string,
    accessPolicy: { type: string; requiredAttestations?: string[]; minTrustScore?: number },
  ): Promise<boolean> {
    if (accessPolicy.type === 'public') {
      return true;
    }

    if (accessPolicy.requiredAttestations?.length) {
      const result = await this.verifyContributor(
        userId,
        poolId,
        accessPolicy.requiredAttestations,
      );
      if (!result.verified) return false;
      if (accessPolicy.minTrustScore && result.trustScore < accessPolicy.minTrustScore) {
        return false;
      }
    }

    return true;
  }

  private isValidPublicKey(publicKey: string): boolean {
    try {
      // Check if it's a valid base64-encoded key
      const decoded = Buffer.from(publicKey, 'base64');
      return decoded.length >= 32;
    } catch {
      return false;
    }
  }

  private async verifyAttestations(
    attestations: Array<{ issuer: string; claim: string; signature: string; expiresAt: string }>,
  ): Promise<number> {
    let valid = 0;
    for (const att of attestations) {
      if (!this.trustedIssuers.has(att.issuer)) continue;
      if (new Date(att.expiresAt) < new Date()) continue;
      // In production, verify cryptographic signature
      valid++;
    }
    return valid;
  }

  private async checkAttestation(_contributorId: string, _attestationType: string): Promise<boolean> {
    // In production, query distributed attestation network
    return true;
  }

  generateAttestationChallenge(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

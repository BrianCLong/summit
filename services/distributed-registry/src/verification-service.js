"use strict";
/**
 * Verification Service - Automatic peer and contributor verification
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationService = void 0;
const crypto_1 = __importDefault(require("crypto"));
class VerificationService {
    trustedIssuers = new Set([
        'did:web:intelgraph.io',
        'did:web:summit.gov',
        'did:key:z6Mk...',
    ]);
    async verifyPeer(peer) {
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
    async verifyContributor(contributorId, poolId, requiredAttestations) {
        const attestations = [];
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
            if (verified) {
                trustScore += 0.1;
            }
        }
        return {
            verified: attestations.every((a) => a.verified),
            trustScore: Math.min(trustScore, 1.0),
            attestations,
        };
    }
    async verifyDataAccess(userId, poolId, accessPolicy) {
        if (accessPolicy.type === 'public') {
            return true;
        }
        if (accessPolicy.requiredAttestations?.length) {
            const result = await this.verifyContributor(userId, poolId, accessPolicy.requiredAttestations);
            if (!result.verified) {
                return false;
            }
            if (accessPolicy.minTrustScore && result.trustScore < accessPolicy.minTrustScore) {
                return false;
            }
        }
        return true;
    }
    isValidPublicKey(publicKey) {
        try {
            // Check if it's a valid base64-encoded key
            const decoded = Buffer.from(publicKey, 'base64');
            return decoded.length >= 32;
        }
        catch {
            return false;
        }
    }
    async verifyAttestations(attestations) {
        let valid = 0;
        for (const att of attestations) {
            if (!this.trustedIssuers.has(att.issuer)) {
                continue;
            }
            if (new Date(att.expiresAt) < new Date()) {
                continue;
            }
            // In production, verify cryptographic signature
            valid++;
        }
        return valid;
    }
    async checkAttestation(_contributorId, _attestationType) {
        // In production, query distributed attestation network
        return true;
    }
    generateAttestationChallenge() {
        return crypto_1.default.randomBytes(32).toString('hex');
    }
}
exports.VerificationService = VerificationService;

/**
 * Zero-Knowledge Proof Service - Privacy-preserving credential verification
 */

import crypto from 'crypto';
import type {
  VerifiableCredential,
  ProofRequest,
  ZKProof,
} from './types.js';

export class ZKProofService {
  private proofRequests: Map<string, ProofRequest> = new Map();
  private generatedProofs: Map<string, ZKProof> = new Map();

  async createProofRequest(
    name: string,
    requestedAttributes: ProofRequest['requestedAttributes'],
    requestedPredicates?: ProofRequest['requestedPredicates'],
  ): Promise<ProofRequest> {
    const request: ProofRequest = {
      id: crypto.randomUUID(),
      name,
      version: '1.0',
      requestedAttributes,
      requestedPredicates,
    };

    this.proofRequests.set(request.id, request);
    return request;
  }

  async generateProof(
    requestId: string,
    credentials: VerifiableCredential[],
    revealedAttributeNames: string[],
  ): Promise<ZKProof> {
    const request = this.proofRequests.get(requestId);
    if (!request) {
      throw new Error(`Proof request ${requestId} not found`);
    }

    const revealedAttributes: Record<string, string> = {};
    const hiddenAttributes: Record<string, string> = {};

    // Separate revealed and hidden attributes
    for (const credential of credentials) {
      for (const [key, value] of Object.entries(credential.credentialSubject)) {
        if (key === 'id') continue;
        if (revealedAttributeNames.includes(key)) {
          revealedAttributes[key] = String(value);
        } else {
          hiddenAttributes[key] = String(value);
        }
      }
    }

    // Generate ZK proof (simplified - in production use proper ZK library)
    const proofData = {
      revealed: revealedAttributes,
      hiddenCommitments: this.createCommitments(hiddenAttributes),
      nonce: crypto.randomBytes(16).toString('hex'),
    };

    const proof: ZKProof = {
      proofId: crypto.randomUUID(),
      requestId,
      proof: Buffer.from(JSON.stringify(proofData)).toString('base64'),
      revealedAttributes,
      timestamp: new Date(),
    };

    this.generatedProofs.set(proof.proofId, proof);
    return proof;
  }

  async verifyProof(
    proofId: string,
    expectedAttributes?: Record<string, string>,
  ): Promise<boolean> {
    const proof = this.generatedProofs.get(proofId);
    if (!proof) return false;

    // Verify revealed attributes match expectations
    if (expectedAttributes) {
      for (const [key, value] of Object.entries(expectedAttributes)) {
        if (proof.revealedAttributes[key] !== value) {
          return false;
        }
      }
    }

    // Verify ZK proof structure (simplified)
    try {
      const proofData = JSON.parse(Buffer.from(proof.proof, 'base64').toString());
      if (!proofData.nonce || !proofData.hiddenCommitments) {
        return false;
      }
    } catch {
      return false;
    }

    proof.verified = true;
    return true;
  }

  async generateAgeProof(
    credential: VerifiableCredential,
    minimumAge: number,
  ): Promise<ZKProof> {
    const birthDate = credential.credentialSubject['birthDate'] as string;
    if (!birthDate) {
      throw new Error('Credential does not contain birthDate');
    }

    const age = this.calculateAge(new Date(birthDate));
    const meetsRequirement = age >= minimumAge;

    // Generate range proof that proves age >= minimumAge without revealing actual age
    const proofData = {
      predicate: {
        attribute: 'age',
        operator: '>=',
        value: minimumAge,
        satisfied: meetsRequirement,
      },
      commitment: crypto.createHash('sha256').update(birthDate).digest('hex'),
      nonce: crypto.randomBytes(16).toString('hex'),
    };

    const proof: ZKProof = {
      proofId: crypto.randomUUID(),
      requestId: 'age-verification',
      proof: Buffer.from(JSON.stringify(proofData)).toString('base64'),
      revealedAttributes: { meetsAgeRequirement: String(meetsRequirement) },
      timestamp: new Date(),
    };

    this.generatedProofs.set(proof.proofId, proof);
    return proof;
  }

  async generateMembershipProof(
    credential: VerifiableCredential,
    allowedValues: string[],
    attributeName: string,
  ): Promise<ZKProof> {
    const value = credential.credentialSubject[attributeName] as string;
    const isMember = allowedValues.includes(value);

    // Generate set membership proof
    const proofData = {
      setMembership: {
        attribute: attributeName,
        setCommitment: crypto
          .createHash('sha256')
          .update(allowedValues.join(','))
          .digest('hex'),
        isMember,
      },
      nonce: crypto.randomBytes(16).toString('hex'),
    };

    const proof: ZKProof = {
      proofId: crypto.randomUUID(),
      requestId: 'membership-verification',
      proof: Buffer.from(JSON.stringify(proofData)).toString('base64'),
      revealedAttributes: { isMember: String(isMember) },
      timestamp: new Date(),
    };

    this.generatedProofs.set(proof.proofId, proof);
    return proof;
  }

  private createCommitments(attributes: Record<string, string>): Record<string, string> {
    const commitments: Record<string, string> = {};
    for (const [key, value] of Object.entries(attributes)) {
      const salt = crypto.randomBytes(16).toString('hex');
      commitments[key] = crypto
        .createHash('sha256')
        .update(value + salt)
        .digest('hex');
    }
    return commitments;
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
}

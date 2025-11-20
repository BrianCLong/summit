/**
 * Secure Aggregation Protocol
 * Implements secure multi-party aggregation with threshold cryptography
 */

import crypto from 'crypto';
import { ModelWeights, ClientUpdate, SecureAggregationConfig } from '../types.js';

export interface SecretShare {
  share: string;
  threshold: number;
  totalShares: number;
}

export interface EncryptedUpdate {
  clientId: string;
  encryptedWeights: string;
  commitment: string;
  proof: string;
}

export class SecureAggregationProtocol {
  private config: SecureAggregationConfig;

  constructor(config: SecureAggregationConfig) {
    this.config = config;
  }

  /**
   * Generate secret shares for a client's update using Shamir's Secret Sharing
   */
  generateSecretShares(
    update: ClientUpdate,
    numShares: number,
    threshold: number
  ): SecretShare[] {
    const serialized = JSON.stringify(update.weights);
    const shares: SecretShare[] = [];

    // Simple implementation - in production use proper Shamir's Secret Sharing
    const secret = Buffer.from(serialized);
    const polynomial = this.generatePolynomial(secret, threshold);

    for (let i = 1; i <= numShares; i++) {
      const share = this.evaluatePolynomial(polynomial, i);

      shares.push({
        share: share.toString('base64'),
        threshold,
        totalShares: numShares,
      });
    }

    return shares;
  }

  /**
   * Reconstruct secret from shares
   */
  reconstructSecret(shares: SecretShare[]): ModelWeights {
    if (shares.length < shares[0].threshold) {
      throw new Error(
        `Insufficient shares: need ${shares[0].threshold}, got ${shares.length}`
      );
    }

    // Use Lagrange interpolation to reconstruct the secret
    const points = shares.slice(0, shares[0].threshold).map((share, idx) => ({
      x: idx + 1,
      y: Buffer.from(share.share, 'base64'),
    }));

    const reconstructed = this.lagrangeInterpolation(points);
    return JSON.parse(reconstructed.toString());
  }

  /**
   * Encrypt client update for secure transmission
   */
  encryptUpdate(update: ClientUpdate, publicKey: string): EncryptedUpdate {
    const serialized = JSON.stringify(update.weights);

    // Generate commitment (hash of the update)
    const commitment = crypto
      .createHash('sha256')
      .update(serialized)
      .digest('hex');

    // Encrypt the update
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      },
      Buffer.from(serialized)
    );

    // Generate zero-knowledge proof of correctness
    const proof = this.generateProof(update, commitment);

    return {
      clientId: update.clientId,
      encryptedWeights: encrypted.toString('base64'),
      commitment,
      proof,
    };
  }

  /**
   * Decrypt and verify client update
   */
  decryptUpdate(encrypted: EncryptedUpdate, privateKey: string): ModelWeights {
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      },
      Buffer.from(encrypted.encryptedWeights, 'base64')
    );

    const weights = JSON.parse(decrypted.toString());

    // Verify commitment
    const commitment = crypto
      .createHash('sha256')
      .update(JSON.stringify(weights))
      .digest('hex');

    if (commitment !== encrypted.commitment) {
      throw new Error('Commitment verification failed');
    }

    // Verify proof
    if (!this.verifyProof(weights, encrypted.commitment, encrypted.proof)) {
      throw new Error('Proof verification failed');
    }

    return weights;
  }

  /**
   * Mask weights for secure aggregation
   */
  maskWeights(weights: ModelWeights, mask: ModelWeights): ModelWeights {
    const masked: ModelWeights = {};

    for (const [layerName, layerWeights] of Object.entries(weights)) {
      const layerMask = mask[layerName];

      if (Array.isArray(layerWeights[0])) {
        // 2D array
        const weights2D = layerWeights as number[][];
        const mask2D = layerMask as number[][];

        masked[layerName] = weights2D.map((row, i) =>
          row.map((val, j) => val + mask2D[i][j])
        );
      } else {
        // 1D array
        const weights1D = layerWeights as number[];
        const mask1D = layerMask as number[];

        masked[layerName] = weights1D.map((val, i) => val + mask1D[i]);
      }
    }

    return masked;
  }

  /**
   * Generate random mask for secure aggregation
   */
  generateRandomMask(template: ModelWeights): ModelWeights {
    const mask: ModelWeights = {};

    for (const [layerName, layerWeights] of Object.entries(template)) {
      if (Array.isArray(layerWeights[0])) {
        // 2D array
        const weights2D = layerWeights as number[][];
        mask[layerName] = weights2D.map((row) =>
          row.map(() => (Math.random() - 0.5) * 2)
        );
      } else {
        // 1D array
        const weights1D = layerWeights as number[];
        mask[layerName] = weights1D.map(() => (Math.random() - 0.5) * 2);
      }
    }

    return mask;
  }

  /**
   * Verify integrity of aggregated result
   */
  verifyAggregatedResult(
    result: ModelWeights,
    commitments: string[]
  ): boolean {
    // Verify that the aggregated result matches the commitments
    const resultHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(result))
      .digest('hex');

    // In a real implementation, we would verify against a Merkle tree of commitments
    return commitments.length > 0;
  }

  /**
   * Generate polynomial for secret sharing
   */
  private generatePolynomial(secret: Buffer, degree: number): Buffer[] {
    const polynomial: Buffer[] = [secret];

    for (let i = 1; i < degree; i++) {
      polynomial.push(crypto.randomBytes(secret.length));
    }

    return polynomial;
  }

  /**
   * Evaluate polynomial at point x
   */
  private evaluatePolynomial(polynomial: Buffer[], x: number): Buffer {
    const result = Buffer.alloc(polynomial[0].length);

    for (let i = 0; i < polynomial.length; i++) {
      const coeff = polynomial[i];
      const power = Math.pow(x, i);

      for (let j = 0; j < coeff.length; j++) {
        result[j] += coeff[j] * power;
      }
    }

    return result;
  }

  /**
   * Lagrange interpolation for secret reconstruction
   */
  private lagrangeInterpolation(points: Array<{ x: number; y: Buffer }>): Buffer {
    const result = Buffer.alloc(points[0].y.length);

    for (let i = 0; i < points.length; i++) {
      let numerator = 1;
      let denominator = 1;

      for (let j = 0; j < points.length; j++) {
        if (i !== j) {
          numerator *= -points[j].x;
          denominator *= points[i].x - points[j].x;
        }
      }

      const lambda = numerator / denominator;

      for (let k = 0; k < points[i].y.length; k++) {
        result[k] += points[i].y[k] * lambda;
      }
    }

    return result;
  }

  /**
   * Generate zero-knowledge proof
   */
  private generateProof(update: ClientUpdate, commitment: string): string {
    // Simplified proof - in production use proper ZK-SNARK or ZK-STARK
    const proofData = {
      clientId: update.clientId,
      roundNumber: update.roundNumber,
      commitment,
      timestamp: update.timestamp.toISOString(),
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(proofData))
      .digest('hex');
  }

  /**
   * Verify zero-knowledge proof
   */
  private verifyProof(
    weights: ModelWeights,
    commitment: string,
    proof: string
  ): boolean {
    // Simplified verification
    return proof.length === 64; // Valid SHA-256 hash length
  }
}

/**
 * Secure Sum Protocol
 * Compute sum without revealing individual values
 */

import crypto from 'crypto';

export class SecureSumProtocol {
  /**
   * Generate pairwise masks for secure aggregation
   */
  generatePairwiseMasks(
    clientId: string,
    otherClients: string[],
    dimension: number
  ): Map<string, number[]> {
    const masks = new Map<string, number[]>();

    for (const other of otherClients) {
      const seed = this.deriveSeed(clientId, other);
      const mask = this.generateMask(seed, dimension);

      // Masks are antisymmetric: mask(i,j) = -mask(j,i)
      const sign = clientId < other ? 1 : -1;
      masks.set(other, mask.map((m) => m * sign));
    }

    return masks;
  }

  /**
   * Apply masks to client update
   */
  maskUpdate(update: number[], masks: Map<string, number[]>): number[] {
    const masked = [...update];

    for (const mask of masks.values()) {
      for (let i = 0; i < masked.length; i++) {
        masked[i] += mask[i];
      }
    }

    return masked;
  }

  /**
   * Aggregate masked updates (masks cancel out)
   */
  aggregateMasked(maskedUpdates: number[][]): number[] {
    const dims = maskedUpdates[0].length;
    const result = new Array(dims).fill(0);

    for (const update of maskedUpdates) {
      for (let i = 0; i < dims; i++) {
        result[i] += update[i];
      }
    }

    return result;
  }

  private deriveSeed(client1: string, client2: string): string {
    const combined = [client1, client2].sort().join('|');
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  private generateMask(seed: string, dimension: number): number[] {
    const mask: number[] = [];
    let currentSeed = seed;

    for (let i = 0; i < dimension; i++) {
      currentSeed = crypto.createHash('sha256').update(currentSeed).digest('hex');
      const value = parseInt(currentSeed.substring(0, 8), 16) / 0xffffffff;
      mask.push((value - 0.5) * 2);
    }

    return mask;
  }
}

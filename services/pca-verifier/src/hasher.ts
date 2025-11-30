import crypto from 'crypto';

/**
 * Cryptographic hash utilities for provenance tracking
 */

export class ProvenanceHasher {
  private algorithm: string;

  constructor(algorithm: string = 'sha256') {
    this.algorithm = algorithm;
  }

  /**
   * Hash arbitrary data deterministically
   */
  hash(data: any): string {
    const normalized = this.normalize(data);
    const serialized = JSON.stringify(normalized);
    return crypto.createHash(this.algorithm).update(serialized).digest('hex');
  }

  /**
   * Build a Merkle tree hash from array of hashes
   */
  merkleRoot(hashes: string[]): string {
    if (hashes.length === 0) return this.hash('');
    if (hashes.length === 1) return hashes[0];

    const tree: string[] = [...hashes];
    while (tree.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < tree.length; i += 2) {
        const left = tree[i];
        const right = i + 1 < tree.length ? tree[i + 1] : left;
        const combined = this.hash({ left, right });
        nextLevel.push(combined);
      }
      tree.splice(0, tree.length, ...nextLevel);
    }
    return tree[0];
  }

  /**
   * Hash transform with inputs/outputs/params
   */
  hashTransform(
    transformId: string,
    transformType: string,
    version: string,
    params: Record<string, any>,
    inputHash?: string,
  ): string {
    return this.hash({
      transformId,
      transformType,
      version,
      params: this.normalize(params),
      inputHash,
    });
  }

  /**
   * Normalize data for deterministic hashing
   * Sorts object keys, handles special types
   */
  private normalize(data: any): any {
    if (data === null || data === undefined) return null;
    if (typeof data === 'number' || typeof data === 'boolean' || typeof data === 'string') {
      return data;
    }
    if (Array.isArray(data)) {
      return data.map((item) => this.normalize(item));
    }
    if (typeof data === 'object') {
      const sorted: Record<string, any> = {};
      Object.keys(data)
        .sort()
        .forEach((key) => {
          sorted[key] = this.normalize(data[key]);
        });
      return sorted;
    }
    return String(data);
  }

  /**
   * Verify hash equality with optional tolerance for floating point
   */
  verifyHash(expected: string, actual: string, data?: any, tolerance?: number): boolean {
    if (expected === actual) return true;

    // If tolerance specified and data is numeric array, check approximate equality
    if (tolerance !== undefined && Array.isArray(data)) {
      const recomputed = this.hashWithTolerance(data, tolerance);
      return expected === recomputed;
    }

    return false;
  }

  /**
   * Hash numeric data with tolerance (rounds to significant figures)
   */
  private hashWithTolerance(data: any[], tolerance: number): string {
    const rounded = data.map((item) => {
      if (typeof item === 'number') {
        return Number(item.toFixed(Math.abs(Math.log10(tolerance))));
      }
      return item;
    });
    return this.hash(rounded);
  }
}

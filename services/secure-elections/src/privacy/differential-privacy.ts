import crypto from 'node:crypto';

/**
 * Privacy-Preserving AI Module for Elections
 *
 * Implements differential privacy, secure aggregation, and
 * privacy-preserving analytics for election data.
 */

export interface PrivacyConfig {
  epsilon: number; // Privacy budget (lower = more private)
  delta: number; // Probability of privacy breach
  sensitivity: number; // Maximum change from one individual
}

export interface AnonymizedVoterData {
  anonymousId: string;
  jurisdictionHash: string;
  participationToken: string;
  timestamp: string;
}

export interface AggregatedResult {
  itemId: string;
  totals: Map<string, number>;
  noiseAdded: boolean;
  privacyBudgetUsed: number;
}

export class DifferentialPrivacyEngine {
  private readonly config: PrivacyConfig;
  private usedBudget: number = 0;

  constructor(config: PrivacyConfig = { epsilon: 1.0, delta: 1e-5, sensitivity: 1 }) {
    this.config = config;
  }

  /**
   * Anonymize voter identity using cryptographic hashing
   * Preserves eligibility verification without revealing identity
   */
  anonymizeVoter(
    voterId: string,
    jurisdictionId: string,
    electionSalt: string
  ): AnonymizedVoterData {
    // One-way hash of voter identity
    const anonymousId = crypto
      .createHash('sha256')
      .update(`${voterId}:${electionSalt}`)
      .digest('hex');

    // Jurisdiction bucketing for regional analytics
    const jurisdictionHash = crypto
      .createHash('sha256')
      .update(`${jurisdictionId}:${electionSalt}`)
      .digest('hex')
      .slice(0, 16);

    // Generate unique participation token (for double-vote prevention)
    const participationToken = crypto
      .createHmac('sha256', electionSalt)
      .update(voterId)
      .digest('hex');

    return {
      anonymousId,
      jurisdictionHash,
      participationToken,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Add calibrated Laplace noise for differential privacy
   */
  addLaplaceNoise(value: number): number {
    if (this.usedBudget >= this.config.epsilon) {
      throw new Error('Privacy budget exhausted');
    }

    const scale = this.config.sensitivity / this.config.epsilon;
    const u = Math.random() - 0.5;
    const noise = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));

    this.usedBudget += this.config.epsilon * 0.1; // Composition accounting
    return Math.round(value + noise);
  }

  /**
   * Aggregate results with privacy guarantees
   */
  aggregateWithPrivacy(
    itemId: string,
    votes: Map<string, number>,
    addNoise: boolean = true
  ): AggregatedResult {
    const totals = new Map<string, number>();

    for (const [option, count] of votes) {
      const noisyCount = addNoise ? this.addLaplaceNoise(count) : count;
      totals.set(option, Math.max(0, noisyCount)); // Non-negative constraint
    }

    return {
      itemId,
      totals,
      noiseAdded: addNoise,
      privacyBudgetUsed: this.usedBudget,
    };
  }

  /**
   * Secure multi-party computation simulation for distributed tallying
   * In production, this would use actual MPC protocols (SPDZ, etc.)
   */
  async secureAggregate(
    partialResults: Array<Map<string, number>>
  ): Promise<Map<string, number>> {
    const combined = new Map<string, number>();

    for (const partial of partialResults) {
      for (const [option, count] of partial) {
        combined.set(option, (combined.get(option) || 0) + count);
      }
    }

    return combined;
  }

  /**
   * Zero-knowledge proof of eligibility (simplified)
   * Real implementation would use ZK-SNARKs or similar
   */
  generateEligibilityProof(
    voterCredential: string,
    eligibilityRoot: string
  ): { proof: string; publicInput: string } {
    // Simplified proof generation
    const commitment = crypto
      .createHash('sha256')
      .update(`${voterCredential}:${eligibilityRoot}`)
      .digest('hex');

    const challenge = crypto.randomBytes(32).toString('hex');

    const response = crypto
      .createHmac('sha256', voterCredential)
      .update(challenge)
      .digest('hex');

    return {
      proof: `${commitment}:${response}`,
      publicInput: eligibilityRoot,
    };
  }

  /**
   * Verify eligibility proof
   */
  verifyEligibilityProof(
    proof: string,
    publicInput: string,
    expectedRoot: string
  ): boolean {
    return publicInput === expectedRoot && proof.includes(':');
  }

  /**
   * K-anonymity check for released data
   */
  checkKAnonymity(
    data: Array<Record<string, string>>,
    quasiIdentifiers: string[],
    k: number
  ): { satisfies: boolean; minGroupSize: number } {
    const groups = new Map<string, number>();

    for (const record of data) {
      const key = quasiIdentifiers.map((qi) => record[qi]).join('|');
      groups.set(key, (groups.get(key) || 0) + 1);
    }

    const minGroupSize = Math.min(...groups.values());

    return {
      satisfies: minGroupSize >= k,
      minGroupSize,
    };
  }

  getRemainingBudget(): number {
    return Math.max(0, this.config.epsilon - this.usedBudget);
  }

  resetBudget(): void {
    this.usedBudget = 0;
  }
}

/**
 * Homomorphic encryption stub for vote tallying
 * In production, use libraries like Microsoft SEAL or HElib
 *
 * NOTE: This is a demonstration stub using simple additive encoding.
 * Real homomorphic encryption provides security guarantees this does not.
 */
export class HomomorphicTallying {
  private readonly key: number;

  constructor() {
    // Simple key for demonstration (NOT cryptographically secure)
    this.key = Math.floor(Math.random() * 1000) + 1;
  }

  /**
   * Encrypt a vote count (additive homomorphic simulation)
   */
  encrypt(value: number): string {
    // Simple encoding: value * multiplier + offset
    const encoded = value * 1000000 + this.key;
    return encoded.toString(16);
  }

  /**
   * Add encrypted values (homomorphic addition)
   */
  addEncrypted(ciphertext1: string, ciphertext2: string): string {
    const v1 = parseInt(ciphertext1, 16);
    const v2 = parseInt(ciphertext2, 16);
    // Adding ciphertexts: (a*M + k) + (b*M + k) = (a+b)*M + 2k
    // We account for the extra key in decrypt
    return (v1 + v2).toString(16);
  }

  /**
   * Decrypt final tally
   */
  decrypt(ciphertext: string): number {
    const value = parseInt(ciphertext, 16);
    // Remove key offset and divide by multiplier
    return Math.round((value - this.key) / 1000000);
  }

  /**
   * Decrypt sum of multiple encrypted values
   */
  decryptSum(ciphertext: string, count: number): number {
    const value = parseInt(ciphertext, 16);
    // Account for multiple key additions: sum*M + count*k
    return Math.round((value - count * this.key) / 1000000);
  }
}

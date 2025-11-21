/**
 * Entropy and Random Number Generation
 * High-quality randomness for cryptographic operations
 */

/**
 * Entropy source configuration
 */
export interface EntropySource {
  name: string;
  type: 'hardware' | 'software' | 'qrng';
  quality: 'high' | 'medium' | 'low';
  available: boolean;
}

/**
 * Entropy manager for cryptographic operations
 */
export class EntropyManager {
  private sources: EntropySource[] = [];
  private entropyPool: Uint8Array;
  private poolIndex: number = 0;
  private readonly POOL_SIZE = 4096;

  constructor() {
    this.entropyPool = new Uint8Array(this.POOL_SIZE);
    this.detectSources();
    this.refillPool();
  }

  /**
   * Get random bytes from entropy pool
   */
  getRandomBytes(length: number): Uint8Array {
    if (length <= 0) {
      throw new Error('Length must be positive');
    }

    const result = new Uint8Array(length);

    for (let i = 0; i < length; i++) {
      if (this.poolIndex >= this.POOL_SIZE) {
        this.refillPool();
      }
      result[i] = this.entropyPool[this.poolIndex++];
    }

    return result;
  }

  /**
   * Get random 32-bit integer
   */
  getRandomUint32(): number {
    const bytes = this.getRandomBytes(4);
    return (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
  }

  /**
   * Get random number in range [0, max)
   */
  getRandomInRange(max: number): number {
    if (max <= 0) {
      throw new Error('Max must be positive');
    }

    // Rejection sampling to avoid modulo bias
    const maxValid = Math.floor(0xFFFFFFFF / max) * max;
    let value: number;

    do {
      value = this.getRandomUint32();
    } while (value >= maxValid);

    return value % max;
  }

  /**
   * Get random number in range [0, 1)
   */
  getRandomFloat(): number {
    return this.getRandomUint32() / 0x100000000;
  }

  /**
   * Generate cryptographic seed
   */
  generateSeed(length: number = 32): Uint8Array {
    const seed = this.getRandomBytes(length);

    // Mix with timestamp for additional entropy
    const timestamp = Date.now();
    const timestampBytes = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
      timestampBytes[i] = (timestamp >> (i * 8)) & 0xFF;
    }

    // XOR timestamp with seed
    for (let i = 0; i < Math.min(8, length); i++) {
      seed[i] ^= timestampBytes[i];
    }

    return seed;
  }

  /**
   * Test entropy quality (NIST SP 800-90B inspired)
   */
  async testEntropyQuality(sampleSize: number = 10000): Promise<EntropyTestResult> {
    const samples = this.getRandomBytes(sampleSize);

    // Frequency test
    const frequency = this.frequencyTest(samples);

    // Runs test
    const runs = this.runsTest(samples);

    // Chi-square test
    const chiSquare = this.chiSquareTest(samples);

    // Autocorrelation test
    const autocorrelation = this.autocorrelationTest(samples);

    const overallPass = frequency.pass && runs.pass && chiSquare.pass && autocorrelation.pass;

    return {
      sampleSize,
      tests: {
        frequency,
        runs,
        chiSquare,
        autocorrelation,
      },
      overallPass,
      timestamp: new Date(),
    };
  }

  /**
   * Get available entropy sources
   */
  getSources(): EntropySource[] {
    return [...this.sources];
  }

  private detectSources(): void {
    // Check for crypto.getRandomValues (Web Crypto API)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      this.sources.push({
        name: 'Web Crypto API',
        type: 'software',
        quality: 'high',
        available: true,
      });
    }

    // Check for Node.js crypto module
    try {
      const nodeCrypto = require('crypto');
      if (nodeCrypto.randomBytes) {
        this.sources.push({
          name: 'Node.js Crypto',
          type: 'software',
          quality: 'high',
          available: true,
        });
      }
    } catch {
      // Node.js crypto not available
    }

    // Note: Hardware RNG (QRNG) would require specific hardware/API integration
    this.sources.push({
      name: 'QRNG (placeholder)',
      type: 'qrng',
      quality: 'high',
      available: false, // Would require actual QRNG hardware
    });
  }

  private refillPool(): void {
    // Use the best available source
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(this.entropyPool);
    } else {
      // Fallback to Math.random (NOT cryptographically secure - for dev only)
      console.warn('Using Math.random fallback - NOT cryptographically secure');
      for (let i = 0; i < this.POOL_SIZE; i++) {
        this.entropyPool[i] = Math.floor(Math.random() * 256);
      }
    }
    this.poolIndex = 0;
  }

  private frequencyTest(samples: Uint8Array): TestResult {
    // Count 1 bits
    let ones = 0;
    for (const byte of samples) {
      for (let i = 0; i < 8; i++) {
        if ((byte >> i) & 1) ones++;
      }
    }

    const totalBits = samples.length * 8;
    const proportion = ones / totalBits;
    const expected = 0.5;
    const tolerance = 0.05;

    return {
      name: 'Frequency Test',
      value: proportion,
      expected,
      pass: Math.abs(proportion - expected) < tolerance,
    };
  }

  private runsTest(samples: Uint8Array): TestResult {
    // Count runs of consecutive 1s or 0s
    let runs = 1;
    let prevBit = samples[0] & 1;

    for (let i = 0; i < samples.length; i++) {
      for (let j = (i === 0 ? 1 : 0); j < 8; j++) {
        const bit = (samples[i] >> j) & 1;
        if (bit !== prevBit) {
          runs++;
          prevBit = bit;
        }
      }
    }

    const n = samples.length * 8;
    const expectedRuns = (2 * n - 1) / 3;
    const variance = (16 * n - 29) / 90;
    const tolerance = 3 * Math.sqrt(variance);

    return {
      name: 'Runs Test',
      value: runs,
      expected: expectedRuns,
      pass: Math.abs(runs - expectedRuns) < tolerance,
    };
  }

  private chiSquareTest(samples: Uint8Array): TestResult {
    // Byte frequency distribution
    const frequency = new Array(256).fill(0);
    for (const byte of samples) {
      frequency[byte]++;
    }

    const expected = samples.length / 256;
    let chiSquare = 0;

    for (let i = 0; i < 256; i++) {
      chiSquare += Math.pow(frequency[i] - expected, 2) / expected;
    }

    // Degrees of freedom = 255
    // Critical value at 0.05 significance ~ 293.2
    const criticalValue = 293.2;

    return {
      name: 'Chi-Square Test',
      value: chiSquare,
      expected: 255, // Expected chi-square ~ degrees of freedom
      pass: chiSquare < criticalValue,
    };
  }

  private autocorrelationTest(samples: Uint8Array): TestResult {
    // Test correlation between consecutive bytes
    let correlation = 0;
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;

    for (let i = 0; i < samples.length - 1; i++) {
      correlation += (samples[i] - mean) * (samples[i + 1] - mean);
    }

    correlation /= (samples.length - 1);

    // Normalize
    const variance = samples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / samples.length;
    const normalizedCorrelation = correlation / variance;

    return {
      name: 'Autocorrelation Test',
      value: normalizedCorrelation,
      expected: 0,
      pass: Math.abs(normalizedCorrelation) < 0.1,
    };
  }
}

interface TestResult {
  name: string;
  value: number;
  expected: number;
  pass: boolean;
}

interface EntropyTestResult {
  sampleSize: number;
  tests: {
    frequency: TestResult;
    runs: TestResult;
    chiSquare: TestResult;
    autocorrelation: TestResult;
  };
  overallPass: boolean;
  timestamp: Date;
}

/**
 * Create singleton entropy manager
 */
let entropyManager: EntropyManager | null = null;

export function getEntropyManager(): EntropyManager {
  if (!entropyManager) {
    entropyManager = new EntropyManager();
  }
  return entropyManager;
}

export function getRandomBytes(length: number): Uint8Array {
  return getEntropyManager().getRandomBytes(length);
}

export function generateCryptoSeed(length: number = 32): Uint8Array {
  return getEntropyManager().generateSeed(length);
}

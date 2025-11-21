/**
 * Quantum Random Number Generation (QRNG) Simulation
 * Simulates quantum random number generation using quantum circuits
 */

import { QuantumCircuit, SimulationResult, GateType } from '../types';
import { StatevectorSimulator } from '../simulators/statevector-simulator';

/**
 * QRNG configuration options
 */
export interface QRNGConfig {
  /** Number of qubits to use for random generation */
  numQubits: number;
  /** Number of measurement shots per random number */
  shots: number;
  /** Entropy extraction method */
  extractionMethod: 'raw' | 'vonNeumann' | 'toeplitz';
}

/**
 * QRNG statistics
 */
export interface QRNGStats {
  bitsGenerated: number;
  bytesGenerated: number;
  efficiency: number;
  generationTime: number;
  entropyPerBit: number;
}

/**
 * Quantum Random Number Generator
 * Uses quantum superposition and measurement for true randomness
 */
export class QuantumRandomNumberGenerator {
  private config: QRNGConfig;
  private simulator: StatevectorSimulator;
  private stats: QRNGStats;

  constructor(config: Partial<QRNGConfig> = {}) {
    this.config = {
      numQubits: config.numQubits ?? 8,
      shots: config.shots ?? 1,
      extractionMethod: config.extractionMethod ?? 'raw',
    };

    this.simulator = new StatevectorSimulator();
    this.stats = {
      bitsGenerated: 0,
      bytesGenerated: 0,
      efficiency: 0,
      generationTime: 0,
      entropyPerBit: 1.0, // Theoretical maximum for quantum source
    };
  }

  /**
   * Generate random bits using quantum measurement
   */
  async generateRandomBits(numBits: number): Promise<Uint8Array> {
    const startTime = performance.now();
    const bitsNeeded = this.config.extractionMethod === 'vonNeumann'
      ? numBits * 4 // Von Neumann extraction is ~50% efficient
      : numBits;

    const rawBits: number[] = [];

    // Generate raw quantum random bits
    while (rawBits.length < bitsNeeded) {
      const circuit = this.buildQRNGCircuit();
      const result = await this.simulator.simulate(circuit, this.config.shots);

      // Extract bits from measurement
      const measurementBits = this.extractBitsFromResult(result);
      rawBits.push(...measurementBits);
    }

    // Apply extraction method
    let extractedBits: number[];
    switch (this.config.extractionMethod) {
      case 'vonNeumann':
        extractedBits = this.vonNeumannExtraction(rawBits.slice(0, bitsNeeded));
        break;
      case 'toeplitz':
        extractedBits = this.toeplitzExtraction(rawBits.slice(0, bitsNeeded), numBits);
        break;
      default:
        extractedBits = rawBits.slice(0, numBits);
    }

    // Convert to bytes
    const bytes = this.bitsToBytes(extractedBits.slice(0, numBits));

    // Update stats
    this.stats.bitsGenerated += numBits;
    this.stats.bytesGenerated += bytes.length;
    this.stats.generationTime = performance.now() - startTime;
    this.stats.efficiency = numBits / rawBits.length;

    return bytes;
  }

  /**
   * Generate random bytes
   */
  async generateRandomBytes(numBytes: number): Promise<Uint8Array> {
    return this.generateRandomBits(numBytes * 8);
  }

  /**
   * Generate random 32-bit integer
   */
  async generateRandomUint32(): Promise<number> {
    const bytes = await this.generateRandomBytes(4);
    return (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
  }

  /**
   * Generate random float in [0, 1)
   */
  async generateRandomFloat(): Promise<number> {
    const uint32 = await this.generateRandomUint32();
    return uint32 / 0x100000000;
  }

  /**
   * Generate random integer in range [0, max)
   */
  async generateRandomInRange(max: number): Promise<number> {
    if (max <= 0) throw new Error('Max must be positive');

    // Rejection sampling to avoid modulo bias
    const maxValid = Math.floor(0xFFFFFFFF / max) * max;
    let value: number;

    do {
      value = await this.generateRandomUint32();
    } while (value >= maxValid);

    return value % max;
  }

  /**
   * Get generation statistics
   */
  getStats(): QRNGStats {
    return { ...this.stats };
  }

  /**
   * Build QRNG circuit - puts qubits in superposition then measures
   */
  private buildQRNGCircuit(): QuantumCircuit {
    const gates = [];

    // Apply Hadamard to each qubit to create equal superposition
    for (let i = 0; i < this.config.numQubits; i++) {
      gates.push({ type: GateType.HADAMARD, qubits: [i] });
    }

    return {
      numQubits: this.config.numQubits,
      gates,
      measurements: Array.from({ length: this.config.numQubits }, (_, i) => i),
    };
  }

  /**
   * Extract bits from simulation result
   */
  private extractBitsFromResult(result: SimulationResult): number[] {
    const bits: number[] = [];

    // Get most common measurement outcomes
    const sortedCounts = Object.entries(result.counts)
      .sort((a, b) => b[1] - a[1]);

    for (const [bitstring, count] of sortedCounts) {
      // Add each bit from the measurement
      for (const char of bitstring) {
        bits.push(char === '1' ? 1 : 0);
      }
    }

    return bits;
  }

  /**
   * Von Neumann extraction for bias removal
   * Takes pairs of bits and outputs 1 if (0,1) and 0 if (1,0)
   * Discards (0,0) and (1,1)
   */
  private vonNeumannExtraction(rawBits: number[]): number[] {
    const extracted: number[] = [];

    for (let i = 0; i < rawBits.length - 1; i += 2) {
      const b1 = rawBits[i];
      const b2 = rawBits[i + 1];

      if (b1 !== b2) {
        extracted.push(b1);
      }
      // Discard equal pairs
    }

    return extracted;
  }

  /**
   * Toeplitz extraction for privacy amplification
   * Uses a Toeplitz matrix to compress and randomize output
   */
  private toeplitzExtraction(rawBits: number[], outputBits: number): number[] {
    const n = rawBits.length;
    const m = outputBits;
    const extracted: number[] = [];

    // Generate Toeplitz matrix from first (n + m - 1) random bits
    // For simulation, we use a simple XOR-based extraction
    for (let i = 0; i < m && i < n; i++) {
      let bit = 0;
      for (let j = 0; j < n - i; j++) {
        bit ^= rawBits[i + j];
      }
      extracted.push(bit);
    }

    return extracted;
  }

  /**
   * Convert bits array to bytes
   */
  private bitsToBytes(bits: number[]): Uint8Array {
    const numBytes = Math.ceil(bits.length / 8);
    const bytes = new Uint8Array(numBytes);

    for (let i = 0; i < bits.length; i++) {
      const byteIndex = Math.floor(i / 8);
      const bitIndex = 7 - (i % 8);
      if (bits[i]) {
        bytes[byteIndex] |= (1 << bitIndex);
      }
    }

    return bytes;
  }
}

/**
 * Create QRNG instance with default configuration
 */
export function createQRNG(config?: Partial<QRNGConfig>): QuantumRandomNumberGenerator {
  return new QuantumRandomNumberGenerator(config);
}

/**
 * Generate quantum random bytes (convenience function)
 */
export async function generateQuantumRandomBytes(numBytes: number): Promise<Uint8Array> {
  const qrng = createQRNG();
  return qrng.generateRandomBytes(numBytes);
}

/**
 * PQC Performance Benchmarking
 * Measures performance of post-quantum cryptographic operations
 */

import { PQCAlgorithm, PQCBenchmark, KeyEncapsulationMechanism, DigitalSignatureScheme } from '../types';

export class PQCBenchmarker {
  private iterations: number;

  constructor(iterations: number = 100) {
    this.iterations = iterations;
  }

  async benchmarkKEM(kem: KeyEncapsulationMechanism): Promise<PQCBenchmark[]> {
    const results: PQCBenchmark[] = [];

    // Benchmark key generation
    results.push(await this.benchmarkOperation('keygen', async () => {
      await kem.generateKeyPair();
    }, kem.getAlgorithm()));

    // Generate a key pair for encapsulation/decapsulation benchmarks
    const keyPair = await kem.generateKeyPair();

    // Benchmark encapsulation
    results.push(await this.benchmarkOperation('encapsulate', async () => {
      await kem.encapsulate(keyPair.publicKey);
    }, kem.getAlgorithm()));

    // Benchmark decapsulation
    const { ciphertext } = await kem.encapsulate(keyPair.publicKey);
    results.push(await this.benchmarkOperation('decapsulate', async () => {
      await kem.decapsulate(ciphertext, keyPair.privateKey);
    }, kem.getAlgorithm()));

    return results;
  }

  async benchmarkSignature(dss: DigitalSignatureScheme): Promise<PQCBenchmark[]> {
    const results: PQCBenchmark[] = [];

    // Benchmark key generation
    results.push(await this.benchmarkOperation('keygen', async () => {
      await dss.generateKeyPair();
    }, dss.getAlgorithm()));

    // Generate a key pair for signing/verification benchmarks
    const keyPair = await dss.generateKeyPair();
    const message = crypto.getRandomValues(new Uint8Array(1024));

    // Benchmark signing
    results.push(await this.benchmarkOperation('sign', async () => {
      await dss.sign(message, keyPair.privateKey);
    }, dss.getAlgorithm()));

    // Benchmark verification
    const { signature } = await dss.sign(message, keyPair.privateKey);
    results.push(await this.benchmarkOperation('verify', async () => {
      await dss.verify(message, signature, keyPair.publicKey);
    }, dss.getAlgorithm()));

    return results;
  }

  private async benchmarkOperation(
    operation: 'keygen' | 'encapsulate' | 'decapsulate' | 'sign' | 'verify',
    fn: () => Promise<void>,
    algorithm: PQCAlgorithm
  ): Promise<PQCBenchmark> {
    const times: number[] = [];
    let totalMemory = 0;

    for (let i = 0; i < this.iterations; i++) {
      const startMemory = this.getMemoryUsage();
      const startTime = performance.now();

      await fn();

      const endTime = performance.now();
      const endMemory = this.getMemoryUsage();

      times.push(endTime - startTime);
      totalMemory += endMemory - startMemory;
    }

    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const throughput = 1000 / averageTime; // operations per second
    const avgMemory = totalMemory / this.iterations;

    return {
      algorithm,
      operation,
      iterations: this.iterations,
      averageTime,
      minTime,
      maxTime,
      throughput,
      memoryUsage: avgMemory,
    };
  }

  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  formatResults(benchmarks: PQCBenchmark[]): string {
    let output = '=== PQC Performance Benchmark Results ===\n\n';

    for (const benchmark of benchmarks) {
      output += `Algorithm: ${benchmark.algorithm}\n`;
      output += `Operation: ${benchmark.operation}\n`;
      output += `Iterations: ${benchmark.iterations}\n`;
      output += `Average Time: ${benchmark.averageTime.toFixed(2)}ms\n`;
      output += `Min Time: ${benchmark.minTime.toFixed(2)}ms\n`;
      output += `Max Time: ${benchmark.maxTime.toFixed(2)}ms\n`;
      output += `Throughput: ${benchmark.throughput.toFixed(2)} ops/sec\n`;
      output += `Memory Usage: ${(benchmark.memoryUsage / 1024 / 1024).toFixed(2)}MB\n`;
      output += '---\n\n';
    }

    return output;
  }
}

export function createBenchmarker(iterations: number = 100): PQCBenchmarker {
  return new PQCBenchmarker(iterations);
}

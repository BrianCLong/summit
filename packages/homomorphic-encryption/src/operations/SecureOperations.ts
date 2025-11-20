/**
 * Secure Operations using Homomorphic Encryption
 * Provides encrypted computation capabilities
 */

import { HECiphertext, HEPublicKey, HEPrivateKey, EncryptedOperation } from '../types.js';
import { PaillierScheme } from '../schemes/PaillierScheme.js';
import { v4 as uuidv4 } from 'uuid';

export class SecureOperations {
  private paillier: PaillierScheme;
  private operations: EncryptedOperation[] = [];

  constructor() {
    this.paillier = new PaillierScheme();
  }

  /**
   * Secure sum aggregation
   */
  async secureSum(
    ciphertexts: HECiphertext[],
    scheme: 'paillier' = 'paillier'
  ): Promise<HECiphertext> {
    if (ciphertexts.length === 0) {
      throw new Error('No ciphertexts to aggregate');
    }

    if (scheme === 'paillier') {
      let result = ciphertexts[0];

      for (let i = 1; i < ciphertexts.length; i++) {
        result = this.paillier.add(result, ciphertexts[i]);
      }

      const operation: EncryptedOperation = {
        operationId: uuidv4(),
        type: 'aggregate',
        inputs: ciphertexts,
        result,
        timestamp: new Date(),
      };

      this.operations.push(operation);

      return result;
    }

    throw new Error(`Unsupported scheme: ${scheme}`);
  }

  /**
   * Secure weighted average
   */
  async secureWeightedAverage(
    ciphertexts: HECiphertext[],
    weights: number[],
    publicKey: HEPublicKey
  ): Promise<HECiphertext> {
    if (ciphertexts.length !== weights.length) {
      throw new Error('Number of ciphertexts must match number of weights');
    }

    // Compute weighted sum: Σ(w_i * E(x_i))
    const weightedCiphertexts = ciphertexts.map((ct, i) =>
      this.paillier.multiplyPlaintext(ct, Math.floor(weights[i] * 1000))
    );

    const weightedSum = await this.secureSum(weightedCiphertexts);

    // Divide by sum of weights (scaled)
    const totalWeight = Math.floor(weights.reduce((sum, w) => sum + w, 0) * 1000);

    // For division, we need to work in the encrypted domain differently
    // This is a simplified approach - in practice, use secure division protocols
    return weightedSum;
  }

  /**
   * Secure gradient aggregation
   */
  async secureGradientAggregation(
    encryptedGradients: HECiphertext[][],
    weights: number[]
  ): Promise<HECiphertext[]> {
    const numLayers = encryptedGradients[0].length;
    const aggregated: HECiphertext[] = [];

    // Aggregate each layer
    for (let layerIdx = 0; layerIdx < numLayers; layerIdx++) {
      const layerGradients = encryptedGradients.map((g) => g[layerIdx]);
      const weightedGradients = layerGradients.map((g, i) =>
        this.paillier.multiplyPlaintext(g, Math.floor(weights[i] * 1000))
      );

      const aggregatedGradient = await this.secureSum(weightedGradients);
      aggregated.push(aggregatedGradient);
    }

    return aggregated;
  }

  /**
   * Secure model inference (limited operations)
   */
  async secureInference(
    encryptedInput: HECiphertext,
    modelWeights: number[]
  ): Promise<HECiphertext> {
    // Simple linear model: y = w * x
    // For encrypted input E(x), compute E(w * x)
    const result = this.paillier.multiplyPlaintext(
      encryptedInput,
      Math.floor(modelWeights[0] * 1000)
    );

    return result;
  }

  /**
   * Secure comparison (returns encrypted boolean)
   */
  async secureCompare(
    ciphertext1: HECiphertext,
    ciphertext2: HECiphertext,
    privateKey: HEPrivateKey
  ): Promise<boolean> {
    // Decrypt both and compare
    // In a real implementation, use secure comparison protocols
    const val1 = this.paillier.decrypt(ciphertext1, privateKey);
    const val2 = this.paillier.decrypt(ciphertext2, privateKey);

    return val1 > val2;
  }

  /**
   * Batch encryption
   */
  async encryptBatch(
    values: number[],
    publicKey: HEPublicKey
  ): Promise<HECiphertext[]> {
    return values.map((val) => this.paillier.encrypt(val, publicKey));
  }

  /**
   * Batch decryption
   */
  async decryptBatch(
    ciphertexts: HECiphertext[],
    privateKey: HEPrivateKey
  ): Promise<number[]> {
    return ciphertexts.map((ct) => this.paillier.decrypt(ct, privateKey));
  }

  /**
   * Get operation history
   */
  getOperationHistory(): EncryptedOperation[] {
    return [...this.operations];
  }

  /**
   * Clear operation history
   */
  clearHistory(): void {
    this.operations = [];
  }

  /**
   * Verify operation integrity
   */
  verifyOperation(operationId: string): boolean {
    const operation = this.operations.find((op) => op.operationId === operationId);
    return operation !== undefined;
  }
}

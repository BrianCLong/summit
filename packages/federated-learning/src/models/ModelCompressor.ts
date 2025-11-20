/**
 * Model Compression for Communication Efficiency
 * Implements quantization, pruning, and sparsification
 */

import { ModelWeights, ModelCompression } from '../types.js';

export class ModelCompressor {
  /**
   * Compress model weights for efficient transmission
   */
  compress(weights: ModelWeights, config: ModelCompression): ModelWeights {
    switch (config.method) {
      case 'quantization':
        return this.quantize(weights, config.compressionRatio, config.parameters);
      case 'pruning':
        return this.prune(weights, config.compressionRatio, config.parameters);
      case 'sparsification':
        return this.sparsify(weights, config.compressionRatio, config.parameters);
      case 'sketching':
        return this.sketch(weights, config.compressionRatio, config.parameters);
      default:
        return weights;
    }
  }

  /**
   * Decompress model weights
   */
  decompress(weights: ModelWeights, config: ModelCompression): ModelWeights {
    // Most compression methods are lossy, so decompression is often a no-op
    return weights;
  }

  /**
   * Quantize weights to lower precision
   */
  private quantize(
    weights: ModelWeights,
    ratio: number,
    params?: Record<string, any>
  ): ModelWeights {
    const bits = params?.bits ?? 8;
    const quantized: ModelWeights = {};

    for (const [layerName, layerWeights] of Object.entries(weights)) {
      if (Array.isArray(layerWeights[0])) {
        // 2D array
        const weights2D = layerWeights as number[][];
        quantized[layerName] = weights2D.map((row) =>
          row.map((val) => this.quantizeValue(val, bits))
        );
      } else {
        // 1D array
        const weights1D = layerWeights as number[];
        quantized[layerName] = weights1D.map((val) => this.quantizeValue(val, bits));
      }
    }

    return quantized;
  }

  /**
   * Quantize a single value
   */
  private quantizeValue(value: number, bits: number): number {
    const maxValue = Math.pow(2, bits) - 1;
    const scale = maxValue / 2;

    // Clamp to [-1, 1] range
    const clamped = Math.max(-1, Math.min(1, value));

    // Quantize
    const quantized = Math.round(clamped * scale);

    // Dequantize
    return quantized / scale;
  }

  /**
   * Prune small weights (set to zero)
   */
  private prune(
    weights: ModelWeights,
    ratio: number,
    params?: Record<string, any>
  ): ModelWeights {
    const threshold = params?.threshold ?? this.calculatePruningThreshold(weights, ratio);
    const pruned: ModelWeights = {};

    for (const [layerName, layerWeights] of Object.entries(weights)) {
      if (Array.isArray(layerWeights[0])) {
        // 2D array
        const weights2D = layerWeights as number[][];
        pruned[layerName] = weights2D.map((row) =>
          row.map((val) => (Math.abs(val) < threshold ? 0 : val))
        );
      } else {
        // 1D array
        const weights1D = layerWeights as number[];
        pruned[layerName] = weights1D.map((val) => (Math.abs(val) < threshold ? 0 : val));
      }
    }

    return pruned;
  }

  /**
   * Calculate pruning threshold to achieve target sparsity
   */
  private calculatePruningThreshold(weights: ModelWeights, targetSparsity: number): number {
    const allWeights: number[] = [];

    for (const layerWeights of Object.values(weights)) {
      if (Array.isArray(layerWeights[0])) {
        // 2D array
        const weights2D = layerWeights as number[][];
        allWeights.push(...weights2D.flat());
      } else {
        // 1D array
        allWeights.push(...(layerWeights as number[]));
      }
    }

    // Sort by absolute value
    allWeights.sort((a, b) => Math.abs(a) - Math.abs(b));

    // Find threshold
    const idx = Math.floor(allWeights.length * targetSparsity);
    return Math.abs(allWeights[idx]);
  }

  /**
   * Sparsify weights (top-k selection)
   */
  private sparsify(
    weights: ModelWeights,
    ratio: number,
    params?: Record<string, any>
  ): ModelWeights {
    const k = params?.topK ?? Math.floor(this.countParameters(weights) * (1 - ratio));
    const sparsified: ModelWeights = {};

    // Collect all weights with their positions
    const indexed: Array<{ layer: string; indices: number[]; value: number }> = [];

    for (const [layerName, layerWeights] of Object.entries(weights)) {
      if (Array.isArray(layerWeights[0])) {
        // 2D array
        const weights2D = layerWeights as number[][];
        weights2D.forEach((row, i) =>
          row.forEach((val, j) => indexed.push({ layer: layerName, indices: [i, j], value: val }))
        );
      } else {
        // 1D array
        (layerWeights as number[]).forEach((val, i) =>
          indexed.push({ layer: layerName, indices: [i], value: val })
        );
      }
    }

    // Select top-k by absolute value
    indexed.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    const topK = new Set(indexed.slice(0, k).map((item) => JSON.stringify(item)));

    // Build sparsified weights
    for (const [layerName, layerWeights] of Object.entries(weights)) {
      if (Array.isArray(layerWeights[0])) {
        // 2D array
        const weights2D = layerWeights as number[][];
        sparsified[layerName] = weights2D.map((row, i) =>
          row.map((val, j) =>
            topK.has(JSON.stringify({ layer: layerName, indices: [i, j], value: val })) ? val : 0
          )
        );
      } else {
        // 1D array
        const weights1D = layerWeights as number[];
        sparsified[layerName] = weights1D.map((val, i) =>
          topK.has(JSON.stringify({ layer: layerName, indices: [i], value: val })) ? val : 0
        );
      }
    }

    return sparsified;
  }

  /**
   * Sketch weights using random projection
   */
  private sketch(
    weights: ModelWeights,
    ratio: number,
    params?: Record<string, any>
  ): ModelWeights {
    const targetDim = Math.floor(this.countParameters(weights) * (1 - ratio));
    const sketched: ModelWeights = {};

    // Simple random projection sketching
    for (const [layerName, layerWeights] of Object.entries(weights)) {
      if (Array.isArray(layerWeights[0])) {
        // 2D array - sketch rows
        const weights2D = layerWeights as number[][];
        const numRows = Math.min(targetDim, weights2D.length);
        sketched[layerName] = weights2D.slice(0, numRows);
      } else {
        // 1D array - sketch values
        const weights1D = layerWeights as number[];
        const numValues = Math.min(targetDim, weights1D.length);
        sketched[layerName] = weights1D.slice(0, numValues);
      }
    }

    return sketched;
  }

  /**
   * Count total parameters in model
   */
  private countParameters(weights: ModelWeights): number {
    let count = 0;

    for (const layerWeights of Object.values(weights)) {
      if (Array.isArray(layerWeights[0])) {
        // 2D array
        count += (layerWeights as number[][]).reduce((sum, row) => sum + row.length, 0);
      } else {
        // 1D array
        count += (layerWeights as number[]).length;
      }
    }

    return count;
  }
}

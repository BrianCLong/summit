export type NormalizationStep =
  | { type: 'l2' }
  | { type: 'mean-center' }
  | { type: 'z-score'; epsilon?: number };

export type PoolingMethod = 'mean' | 'max' | 'sum' | 'cls';

export interface DeterministicQuantization {
  method: string;
  bits: number;
  scale: number;
  zeroPoint: number;
}

export interface EmbeddingConfig {
  modelId: string;
  modelHash: string;
  tokenizerHash: string;
  pooling: PoolingMethod;
  quantization?: DeterministicQuantization;
  preNormalization: NormalizationStep[];
  postNormalization: NormalizationStep[];
}

export const canonicalSignature = (config: EmbeddingConfig): string =>
  JSON.stringify(config);

const applyNormalization = (vector: number[], step: NormalizationStep): void => {
  if (!vector.length) return;
  switch (step.type) {
    case 'l2': {
      const norm = Math.sqrt(vector.reduce((acc, value) => acc + value * value, 0));
      if (!norm) return;
      for (let i = 0; i < vector.length; i += 1) {
        vector[i] = vector[i] / norm;
      }
      break;
    }
    case 'mean-center': {
      const mean = vector.reduce((acc, value) => acc + value, 0) / vector.length;
      for (let i = 0; i < vector.length; i += 1) {
        vector[i] = vector[i] - mean;
      }
      break;
    }
    case 'z-score': {
      const epsilon = step.epsilon ?? 0;
      const mean = vector.reduce((acc, value) => acc + value, 0) / vector.length;
      const variance =
        vector.reduce((acc, value) => {
          const centered = value - mean;
          return acc + centered * centered;
        }, 0) / vector.length;
      const std = Math.sqrt(variance + epsilon);
      if (!std) return;
      for (let i = 0; i < vector.length; i += 1) {
        vector[i] = (vector[i] - mean) / std;
      }
      break;
    }
    default:
      step satisfies never;
  }
};

const applyQuantization = (
  vector: number[],
  quantization: DeterministicQuantization,
): void => {
  if (!vector.length) return;
  const levels = 2 ** quantization.bits - 1;
  for (let i = 0; i < vector.length; i += 1) {
    const transformed = vector[i] / quantization.scale + quantization.zeroPoint;
    const clamped = Math.min(Math.max(transformed, 0), levels);
    const quantized = Math.round(clamped);
    vector[i] = (quantized - quantization.zeroPoint) * quantization.scale;
  }
};

export const applyPipeline = (
  vector: number[],
  config: EmbeddingConfig,
): number[] => {
  const result = [...vector];
  for (const step of config.preNormalization) {
    applyNormalization(result, step);
  }
  if (config.quantization) {
    applyQuantization(result, config.quantization);
  }
  for (const step of config.postNormalization) {
    applyNormalization(result, step);
  }
  return result;
};

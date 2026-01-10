import crypto from 'crypto';
import { z } from 'zod';
import type { Embedder } from './types.js';

const embedConfigSchema = z.object({
  dimensions: z.number().int().positive().default(64),
});

export interface EmbedderConfig {
  dimensions?: number;
}

export class DeterministicEmbedder implements Embedder {
  private readonly dimensions: number;

  constructor(config: EmbedderConfig = {}) {
    const parsed = embedConfigSchema.parse(config);
    this.dimensions = parsed.dimensions;
  }

  async embed(text: string): Promise<number[]> {
    const hash = crypto.createHash('sha256').update(text).digest();
    const values: number[] = [];
    for (let i = 0; i < this.dimensions; i++) {
      const byte = hash[i % hash.length];
      values.push((byte / 255) * 2 - 1);
    }
    return values;
  }
}


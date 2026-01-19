import { Canonicalizer } from './canonicalizer.js';

export interface NgramHasherOptions {
  minGram?: number;
  maxGram?: number;
  heads?: number;
  salt?: string;
  canonicalizer?: Canonicalizer;
}

export interface NgramHashResult {
  tokens: string[];
  grams: string[];
  headHashes: number[][];
}

const DEFAULT_MIN_GRAM = 2;
const DEFAULT_MAX_GRAM = 5;
const DEFAULT_HEADS = 3;

const FNV_OFFSET_BASIS = 2166136261;
const FNV_PRIME = 16777619;

function hashString(value: string, seed: number): number {
  let hash = (FNV_OFFSET_BASIS ^ seed) >>> 0;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash >>> 0;
}

function range(start: number, end: number): number[] {
  const values: number[] = [];
  for (let i = start; i <= end; i += 1) {
    values.push(i);
  }
  return values;
}

export class NgramHasher {
  private readonly minGram: number;
  private readonly maxGram: number;
  private readonly heads: number;
  private readonly salt: string;
  private readonly canonicalizer: Canonicalizer;
  private readonly headSeeds: number[];

  constructor(options: NgramHasherOptions = {}) {
    this.minGram = options.minGram ?? DEFAULT_MIN_GRAM;
    this.maxGram = options.maxGram ?? DEFAULT_MAX_GRAM;
    this.heads = options.heads ?? DEFAULT_HEADS;
    this.salt = options.salt ?? 'default';
    this.canonicalizer = options.canonicalizer ?? new Canonicalizer();

    if (this.minGram < 1 || this.maxGram < this.minGram) {
      throw new Error('Invalid N-gram range for NgramHasher');
    }
    if (this.heads < 1) {
      throw new Error('NgramHasher requires at least one hash head');
    }

    this.headSeeds = range(0, this.heads - 1).map((head) =>
      hashString(`${this.salt}:${head}`, head + 1),
    );
  }

  hashText(text: string): NgramHashResult {
    const tokens = this.canonicalizer.tokenize(text);
    return this.hashTokens(tokens);
  }

  hashTokens(tokens: string[]): NgramHashResult {
    const grams: string[] = [];
    for (let i = 0; i < tokens.length; i += 1) {
      for (let size = this.minGram; size <= this.maxGram; size += 1) {
        if (i + size <= tokens.length) {
          grams.push(tokens.slice(i, i + size).join(' '));
        }
      }
    }

    const headHashes = this.headSeeds.map(() => [] as number[]);

    for (const gram of grams) {
      this.headSeeds.forEach((seed, index) => {
        headHashes[index].push(hashString(gram, seed));
      });
    }

    return {
      tokens,
      grams,
      headHashes,
    };
  }
}

import crypto from 'crypto';
import {
  BaseTransformer,
  TransformationContext,
  TransformationResult,
  TransformerMetadata
} from './base.js';

/**
 * Deduplication configuration
 */
export interface DeduplicationConfig {
  strategy: 'hash' | 'key' | 'fuzzy';
  keyFields?: string[]; // Fields to use for deduplication
  hashAlgorithm?: 'md5' | 'sha1' | 'sha256';
  ignoreFields?: string[]; // Fields to ignore when computing hash
  fuzzyThreshold?: number; // Similarity threshold for fuzzy matching (0-1)
  keepFirst?: boolean; // Keep first occurrence (true) or last (false)
}

/**
 * Deduplication Transformer
 * Removes duplicate records based on various strategies
 */
export class DeduplicatorTransformer extends BaseTransformer<unknown, unknown> {
  private dedupeConfig: DeduplicationConfig;
  private seenHashes: Set<string> = new Set();
  private seenKeys: Set<string> = new Set();

  constructor(config: any) {
    super(config);
    this.dedupeConfig = config.config as DeduplicationConfig;
  }

  async transform(
    input: unknown,
    context: TransformationContext
  ): Promise<TransformationResult<unknown>> {
    const isDuplicate = this.checkDuplicate(input);

    if (isDuplicate) {
      return {
        data: null as any,
        metadata: {
          transformationType: 'deduplication',
          isDuplicate: true,
          skipped: true
        }
      };
    }

    return {
      data: input,
      metadata: {
        transformationType: 'deduplication',
        isDuplicate: false
      }
    };
  }

  async validate(input: unknown): Promise<boolean> {
    return input !== null && input !== undefined;
  }

  /**
   * Check if record is a duplicate
   */
  private checkDuplicate(input: unknown): boolean {
    switch (this.dedupeConfig.strategy) {
      case 'hash':
        return this.checkHashDuplicate(input);
      case 'key':
        return this.checkKeyDuplicate(input);
      case 'fuzzy':
        return this.checkFuzzyDuplicate(input);
      default:
        return false;
    }
  }

  /**
   * Check duplicate using hash-based strategy
   */
  private checkHashDuplicate(input: unknown): boolean {
    const hash = this.computeHash(input);

    if (this.seenHashes.has(hash)) {
      return true;
    }

    this.seenHashes.add(hash);
    return false;
  }

  /**
   * Check duplicate using key-based strategy
   */
  private checkKeyDuplicate(input: unknown): boolean {
    if (!this.dedupeConfig.keyFields || this.dedupeConfig.keyFields.length === 0) {
      return false;
    }

    const key = this.computeKey(input as Record<string, unknown>);

    if (this.seenKeys.has(key)) {
      return true;
    }

    this.seenKeys.add(key);
    return false;
  }

  /**
   * Check duplicate using fuzzy matching (simplified implementation)
   */
  private checkFuzzyDuplicate(input: unknown): boolean {
    // Simplified fuzzy matching using hash with threshold
    // In production, use more sophisticated algorithms like Levenshtein distance
    const hash = this.computeHash(input);

    // For now, fallback to exact hash matching
    // TODO: Implement proper fuzzy matching
    if (this.seenHashes.has(hash)) {
      return true;
    }

    this.seenHashes.add(hash);
    return false;
  }

  /**
   * Compute hash of input data
   */
  private computeHash(input: unknown): string {
    const algorithm = this.dedupeConfig.hashAlgorithm || 'sha256';

    // Remove ignored fields if specified
    let data = input;
    if (
      this.dedupeConfig.ignoreFields &&
      typeof input === 'object' &&
      input !== null
    ) {
      data = this.removeFields(
        input as Record<string, unknown>,
        this.dedupeConfig.ignoreFields
      );
    }

    const json = JSON.stringify(data, Object.keys(data as object).sort());
    return crypto.createHash(algorithm).update(json).digest('hex');
  }

  /**
   * Compute key from specified fields
   */
  private computeKey(input: Record<string, unknown>): string {
    if (!this.dedupeConfig.keyFields) {
      return '';
    }

    const keyParts: string[] = [];

    for (const field of this.dedupeConfig.keyFields) {
      const value = this.getNestedValue(input, field);
      keyParts.push(String(value));
    }

    return keyParts.join('||');
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const keys = path.split('.');
    let current: any = obj;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Remove specified fields from object
   */
  private removeFields(
    obj: Record<string, unknown>,
    fields: string[]
  ): Record<string, unknown> {
    const result = { ...obj };

    for (const field of fields) {
      delete result[field];
    }

    return result;
  }

  /**
   * Reset deduplication state
   */
  reset(): void {
    this.seenHashes.clear();
    this.seenKeys.clear();
  }

  getMetadata(): TransformerMetadata {
    return {
      name: 'Deduplicator',
      type: 'DEDUPLICATE',
      version: '1.0.0',
      description: `Removes duplicate records using ${this.dedupeConfig.strategy} strategy`
    };
  }
}

/**
 * Base Matcher Interface
 *
 * Defines the contract for all matchers (deterministic and probabilistic).
 */

import type { FeatureType, FeatureEvidence, EntityType } from '../types/index.js';

export interface MatcherConfig {
  name: string;
  version: string;
  featureTypes: FeatureType[];
  supportedEntityTypes: EntityType[];
  isDeterministic: boolean;
  defaultWeight: number;
  thresholds: {
    match: number;
    noMatch: number;
  };
}

export interface MatchInput {
  entityType: EntityType;
  attributesA: Record<string, unknown>;
  attributesB: Record<string, unknown>;
  normalizedA?: Record<string, string>;
  normalizedB?: Record<string, string>;
}

export interface MatchResult {
  featureType: FeatureType;
  valueA: unknown;
  valueB: unknown;
  similarity: number;
  weight: number;
  isDeterministic: boolean;
  explanation: string;
  metadata?: Record<string, unknown>;
}

export abstract class BaseMatcher {
  protected config: MatcherConfig;

  constructor(config: MatcherConfig) {
    this.config = config;
  }

  get name(): string {
    return this.config.name;
  }

  get version(): string {
    return this.config.version;
  }

  get isDeterministic(): boolean {
    return this.config.isDeterministic;
  }

  get supportedFeatures(): FeatureType[] {
    return this.config.featureTypes;
  }

  abstract match(input: MatchInput): Promise<MatchResult[]>;

  supportsEntityType(entityType: EntityType): boolean {
    return this.config.supportedEntityTypes.includes(entityType);
  }

  protected createEvidence(result: MatchResult): FeatureEvidence {
    return {
      featureType: result.featureType,
      valueA: result.valueA,
      valueB: result.valueB,
      similarity: result.similarity,
      weight: result.weight,
      matcherUsed: this.name,
      isDeterministic: this.isDeterministic,
      explanation: result.explanation,
      metadata: result.metadata,
    };
  }
}

/**
 * Normalize a string for comparison
 */
export function normalizeString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Extract a value from nested object path
 */
export function extractValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === 'object' && current !== null) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Check if two values are equal (case-insensitive for strings)
 */
export function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === 'string' && typeof b === 'string') {
    return normalizeString(a) === normalizeString(b);
  }
  return false;
}

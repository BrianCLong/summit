import { v4 as uuid } from 'uuid';
import {
  FusionResult,
  FusionStrategy,
  DeduplicationResult,
  ConfidenceReport,
} from '../types.js';
import { logger } from '../utils/logger.js';

interface FusionConfig {
  defaultStrategy: FusionStrategy;
  similarityThreshold: number;
  conflictResolution: 'newest' | 'most_complete' | 'highest_confidence' | 'manual';
  enableDeduplication: boolean;
}

interface SourceRecord {
  sourceId: string;
  recordId: string;
  data: Record<string, unknown>;
  timestamp?: Date;
  confidence?: number;
}

/**
 * Fusion Engine
 * Links, deduplicates, and enriches data from multiple sources
 */
export class FusionEngine {
  private config: FusionConfig;
  private fusionResults: Map<string, FusionResult> = new Map();
  private learnedRules: Map<string, FusionRule[]> = new Map();

  constructor(config: Partial<FusionConfig> = {}) {
    this.config = {
      defaultStrategy: config.defaultStrategy ?? 'fuzzy_match',
      similarityThreshold: config.similarityThreshold ?? 0.8,
      conflictResolution: config.conflictResolution ?? 'most_complete',
      enableDeduplication: config.enableDeduplication ?? true,
    };
  }

  /**
   * Fuse records from multiple sources
   */
  async fuse(
    records: SourceRecord[],
    matchFields: string[],
    strategy?: FusionStrategy
  ): Promise<FusionResult[]> {
    const fusionStrategy = strategy ?? this.config.defaultStrategy;
    logger.info('Starting fusion', {
      recordCount: records.length,
      matchFields,
      strategy: fusionStrategy,
    });

    // Group records by similarity
    const clusters = await this.clusterRecords(records, matchFields, fusionStrategy);

    // Fuse each cluster
    const results: FusionResult[] = [];
    for (const cluster of clusters) {
      if (cluster.length === 1) {
        // Single record, no fusion needed
        results.push(this.createSingleRecordResult(cluster[0]));
      } else {
        // Multiple records, fuse them
        const result = await this.fuseCluster(cluster, matchFields, fusionStrategy);
        results.push(result);
        this.fusionResults.set(result.id, result);
      }
    }

    logger.info('Fusion complete', {
      inputRecords: records.length,
      outputRecords: results.length,
      fusedClusters: clusters.filter(c => c.length > 1).length,
    });

    return results;
  }

  /**
   * Deduplicate records within a single source
   */
  async deduplicate(
    records: SourceRecord[],
    matchFields: string[]
  ): Promise<DeduplicationResult[]> {
    logger.info('Starting deduplication', {
      recordCount: records.length,
      matchFields,
    });

    const clusters = await this.clusterRecords(
      records,
      matchFields,
      'fuzzy_match'
    );

    const results: DeduplicationResult[] = [];
    for (const cluster of clusters) {
      if (cluster.length > 1) {
        // Duplicates found
        const canonical = this.selectCanonicalRecord(cluster);
        results.push({
          clusterId: uuid(),
          records: cluster.map(r => ({
            sourceId: r.sourceId,
            recordId: r.recordId,
            similarityScore: this.calculateSimilarity(r.data, canonical.data, matchFields),
          })),
          canonicalRecord: canonical.data,
          duplicatesRemoved: cluster.length - 1,
        });
      }
    }

    logger.info('Deduplication complete', {
      duplicateClusters: results.length,
      totalDuplicatesRemoved: results.reduce((sum, r) => sum + r.duplicatesRemoved, 0),
    });

    return results;
  }

  /**
   * Cluster records by similarity
   */
  private async clusterRecords(
    records: SourceRecord[],
    matchFields: string[],
    strategy: FusionStrategy
  ): Promise<SourceRecord[][]> {
    const clusters: SourceRecord[][] = [];
    const assigned = new Set<string>();

    for (const record of records) {
      if (assigned.has(record.recordId)) continue;

      const cluster: SourceRecord[] = [record];
      assigned.add(record.recordId);

      for (const other of records) {
        if (assigned.has(other.recordId)) continue;

        const similarity = await this.matchRecords(record, other, matchFields, strategy);
        if (similarity >= this.config.similarityThreshold) {
          cluster.push(other);
          assigned.add(other.recordId);
        }
      }

      clusters.push(cluster);
    }

    return clusters;
  }

  /**
   * Match two records and return similarity score
   */
  private async matchRecords(
    a: SourceRecord,
    b: SourceRecord,
    matchFields: string[],
    strategy: FusionStrategy
  ): Promise<number> {
    switch (strategy) {
      case 'exact_match':
        return this.exactMatch(a.data, b.data, matchFields);
      case 'fuzzy_match':
        return this.fuzzyMatch(a.data, b.data, matchFields);
      case 'semantic_similarity':
        return this.semanticSimilarity(a.data, b.data, matchFields);
      case 'rule_based':
        return this.ruleBasedMatch(a.data, b.data, matchFields);
      case 'ml_based':
        return this.mlBasedMatch(a.data, b.data, matchFields);
      default:
        return this.fuzzyMatch(a.data, b.data, matchFields);
    }
  }

  /**
   * Exact string matching
   */
  private exactMatch(
    a: Record<string, unknown>,
    b: Record<string, unknown>,
    fields: string[]
  ): number {
    let matches = 0;
    for (const field of fields) {
      if (a[field] === b[field]) matches++;
    }
    return matches / fields.length;
  }

  /**
   * Fuzzy string matching using Levenshtein distance
   */
  private fuzzyMatch(
    a: Record<string, unknown>,
    b: Record<string, unknown>,
    fields: string[]
  ): number {
    let totalSimilarity = 0;
    for (const field of fields) {
      const valA = String(a[field] ?? '').toLowerCase();
      const valB = String(b[field] ?? '').toLowerCase();
      totalSimilarity += this.stringSimilarity(valA, valB);
    }
    return totalSimilarity / fields.length;
  }

  /**
   * Semantic similarity using embeddings (placeholder)
   */
  private semanticSimilarity(
    a: Record<string, unknown>,
    b: Record<string, unknown>,
    fields: string[]
  ): number {
    // In production, use sentence embeddings (e.g., OpenAI, sentence-transformers)
    // For now, fall back to fuzzy matching
    return this.fuzzyMatch(a, b, fields);
  }

  /**
   * Rule-based matching using learned rules
   */
  private ruleBasedMatch(
    a: Record<string, unknown>,
    b: Record<string, unknown>,
    fields: string[]
  ): number {
    const rules = this.learnedRules.get(fields.join(',')) || [];

    if (rules.length === 0) {
      return this.fuzzyMatch(a, b, fields);
    }

    let score = 0;
    let totalWeight = 0;

    for (const rule of rules) {
      const match = rule.evaluate(a, b);
      score += match * rule.weight;
      totalWeight += rule.weight;
    }

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  /**
   * ML-based matching (placeholder)
   */
  private mlBasedMatch(
    a: Record<string, unknown>,
    b: Record<string, unknown>,
    fields: string[]
  ): number {
    // In production, use trained ML model for entity matching
    return this.fuzzyMatch(a, b, fields);
  }

  /**
   * Calculate string similarity (Jaro-Winkler)
   */
  private stringSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    const matchWindow = Math.floor(Math.max(a.length, b.length) / 2) - 1;
    const aMatches = new Array(a.length).fill(false);
    const bMatches = new Array(b.length).fill(false);

    let matches = 0;
    let transpositions = 0;

    for (let i = 0; i < a.length; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, b.length);

      for (let j = start; j < end; j++) {
        if (bMatches[j] || a[i] !== b[j]) continue;
        aMatches[i] = true;
        bMatches[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0;

    let k = 0;
    for (let i = 0; i < a.length; i++) {
      if (!aMatches[i]) continue;
      while (!bMatches[k]) k++;
      if (a[i] !== b[k]) transpositions++;
      k++;
    }

    const jaro = (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;

    // Winkler modification
    let prefix = 0;
    for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
      if (a[i] === b[i]) prefix++;
      else break;
    }

    return jaro + prefix * 0.1 * (1 - jaro);
  }

  /**
   * Calculate similarity between two records
   */
  private calculateSimilarity(
    a: Record<string, unknown>,
    b: Record<string, unknown>,
    fields: string[]
  ): number {
    return this.fuzzyMatch(a, b, fields);
  }

  /**
   * Fuse a cluster of records into one
   */
  private async fuseCluster(
    cluster: SourceRecord[],
    matchFields: string[],
    strategy: FusionStrategy
  ): Promise<FusionResult> {
    const fusedRecord: Record<string, unknown> = {};
    const conflictsResolved: FusionResult['conflictsResolved'] = [];

    // Get all unique fields
    const allFields = new Set<string>();
    for (const record of cluster) {
      Object.keys(record.data).forEach(k => allFields.add(k));
    }

    // Resolve each field
    for (const field of allFields) {
      const values = cluster
        .map(r => r.data[field])
        .filter(v => v !== null && v !== undefined);

      if (values.length === 0) {
        fusedRecord[field] = null;
      } else if (new Set(values.map(String)).size === 1) {
        // All values are the same
        fusedRecord[field] = values[0];
      } else {
        // Conflict - resolve based on strategy
        const resolved = this.resolveConflict(cluster, field);
        fusedRecord[field] = resolved.value;
        conflictsResolved.push({
          field,
          values,
          resolvedValue: resolved.value,
          resolutionMethod: resolved.method,
        });
      }
    }

    // Calculate confidence score
    const confidenceScore = this.calculateFusionConfidence(cluster, conflictsResolved);

    return {
      id: uuid(),
      sourceRecords: cluster.map(r => ({
        sourceId: r.sourceId,
        recordId: r.recordId,
        data: r.data,
      })),
      fusedRecord,
      confidenceScore,
      strategyUsed: strategy,
      conflictsResolved,
      lineage: {
        createdAt: new Date(),
        sources: [...new Set(cluster.map(r => r.sourceId))],
        transformations: [`fusion:${strategy}`, `conflicts_resolved:${conflictsResolved.length}`],
      },
    };
  }

  /**
   * Resolve a field conflict
   */
  private resolveConflict(
    cluster: SourceRecord[],
    field: string
  ): { value: unknown; method: string } {
    switch (this.config.conflictResolution) {
      case 'newest': {
        const sorted = cluster
          .filter(r => r.data[field] !== null && r.data[field] !== undefined)
          .sort((a, b) => {
            const timeA = a.timestamp?.getTime() ?? 0;
            const timeB = b.timestamp?.getTime() ?? 0;
            return timeB - timeA;
          });
        return { value: sorted[0]?.data[field], method: 'newest' };
      }

      case 'most_complete': {
        const sorted = cluster
          .filter(r => r.data[field] !== null && r.data[field] !== undefined)
          .sort((a, b) => {
            const lenA = String(a.data[field]).length;
            const lenB = String(b.data[field]).length;
            return lenB - lenA;
          });
        return { value: sorted[0]?.data[field], method: 'most_complete' };
      }

      case 'highest_confidence': {
        const sorted = cluster
          .filter(r => r.data[field] !== null && r.data[field] !== undefined)
          .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
        return { value: sorted[0]?.data[field], method: 'highest_confidence' };
      }

      default:
        // Default to most common value
        const valueCounts = new Map<string, { value: unknown; count: number }>();
        for (const record of cluster) {
          const val = record.data[field];
          if (val !== null && val !== undefined) {
            const key = String(val);
            const existing = valueCounts.get(key);
            if (existing) {
              existing.count++;
            } else {
              valueCounts.set(key, { value: val, count: 1 });
            }
          }
        }
        const mostCommon = [...valueCounts.values()].sort((a, b) => b.count - a.count)[0];
        return { value: mostCommon?.value, method: 'most_common' };
    }
  }

  /**
   * Select canonical record from cluster
   */
  private selectCanonicalRecord(cluster: SourceRecord[]): SourceRecord {
    return cluster.reduce((best, current) => {
      const bestCompleteness = Object.values(best.data).filter(v => v !== null).length;
      const currentCompleteness = Object.values(current.data).filter(v => v !== null).length;
      return currentCompleteness > bestCompleteness ? current : best;
    });
  }

  /**
   * Calculate fusion confidence score
   */
  private calculateFusionConfidence(
    cluster: SourceRecord[],
    conflicts: FusionResult['conflictsResolved']
  ): number {
    let score = 1.0;

    // Reduce score based on number of sources (more sources = more uncertainty)
    const uniqueSources = new Set(cluster.map(r => r.sourceId)).size;
    if (uniqueSources > 1) {
      score -= (uniqueSources - 1) * 0.05;
    }

    // Reduce score based on conflicts
    const totalFields = new Set(cluster.flatMap(r => Object.keys(r.data))).size;
    const conflictRatio = conflicts.length / totalFields;
    score -= conflictRatio * 0.3;

    // Boost from source confidence scores
    const avgSourceConfidence = cluster.reduce((sum, r) => sum + (r.confidence ?? 0.8), 0) / cluster.length;
    score = score * 0.7 + avgSourceConfidence * 0.3;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Create result for single record (no fusion needed)
   */
  private createSingleRecordResult(record: SourceRecord): FusionResult {
    return {
      id: uuid(),
      sourceRecords: [{
        sourceId: record.sourceId,
        recordId: record.recordId,
        data: record.data,
      }],
      fusedRecord: { ...record.data },
      confidenceScore: record.confidence ?? 0.9,
      strategyUsed: 'exact_match',
      conflictsResolved: [],
      lineage: {
        createdAt: new Date(),
        sources: [record.sourceId],
        transformations: ['passthrough'],
      },
    };
  }

  /**
   * Add learned fusion rule
   */
  addRule(fields: string[], rule: FusionRule): void {
    const key = fields.join(',');
    const rules = this.learnedRules.get(key) || [];
    rules.push(rule);
    this.learnedRules.set(key, rules);
  }

  /**
   * Get fusion result by ID
   */
  getResult(id: string): FusionResult | undefined {
    return this.fusionResults.get(id);
  }

  /**
   * Get all fusion results
   */
  getAllResults(): FusionResult[] {
    return Array.from(this.fusionResults.values());
  }
}

/**
 * Fusion rule interface
 */
interface FusionRule {
  name: string;
  weight: number;
  evaluate: (a: Record<string, unknown>, b: Record<string, unknown>) => number;
}

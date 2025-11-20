/**
 * Record Merger
 * Merges duplicate records into golden records using configurable survivorship rules.
 * Handles conflict resolution and maintains data lineage.
 */

import { trace } from '@opentelemetry/api';
import { v4 as uuidv4 } from 'uuid';
import type {
  SourceRecord,
  GoldenRecord,
  MergeStrategy,
  SurvivorshipRule,
  SurvivorshipStrategy,
  MergeResult,
  DataConflict,
  ConflictValue,
  ConflictResolutionStrategy,
  RecordStatus,
} from '../types.js';

const tracer = trace.getTracer('master-data-mgmt');

/**
 * Configuration for record merging
 */
export interface RecordMergerConfig {
  preserveSourceRecords?: boolean;
  enableVersionControl?: boolean;
  autoResolveThreshold?: number;
  maxConflicts?: number;
}

/**
 * Record Merger
 * Implements survivorship rules and conflict resolution for merging duplicate records
 */
export class RecordMerger {
  private config: Required<RecordMergerConfig>;

  constructor(config: RecordMergerConfig = {}) {
    this.config = {
      preserveSourceRecords: config.preserveSourceRecords ?? true,
      enableVersionControl: config.enableVersionControl ?? true,
      autoResolveThreshold: config.autoResolveThreshold ?? 0.8,
      maxConflicts: config.maxConflicts ?? 50,
    };
  }

  /**
   * Merge multiple source records into a golden record
   */
  async mergeRecords<T = Record<string, unknown>>(
    sourceRecords: SourceRecord<T>[],
    strategy: MergeStrategy,
    userId?: string
  ): Promise<MergeResult<T>> {
    return tracer.startActiveSpan('RecordMerger.mergeRecords', async (span) => {
      try {
        span.setAttribute('source.records.count', sourceRecords.length);
        span.setAttribute('strategy', strategy.name);

        if (sourceRecords.length === 0) {
          throw new Error('Cannot merge empty record set');
        }

        // Validate all records are from same domain
        const domain = sourceRecords[0].domain;
        if (!sourceRecords.every((r) => r.domain === domain)) {
          throw new Error('All records must be from the same domain');
        }

        // Apply survivorship rules
        const { masterData, conflicts, appliedRules } =
          await this.applySurvivorshipRules(sourceRecords, strategy);

        // Determine if manual review is required
        const requiresReview = this.requiresManualReview(
          conflicts,
          strategy,
          sourceRecords.length
        );

        // Calculate confidence score
        const confidence = this.calculateMergeConfidence(
          conflicts,
          sourceRecords
        );

        // Create golden record
        const goldenRecord: GoldenRecord<T> = {
          goldenId: uuidv4(),
          domain,
          masterData,
          sourceRecords: this.config.preserveSourceRecords
            ? sourceRecords
            : [],
          survivorshipRules: strategy.survivorshipRules,
          version: 1,
          status: this.determineRecordStatus(requiresReview, strategy),
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: userId,
          metadata: {
            mergeStrategy: strategy.strategyId,
            conflictCount: conflicts.length,
            sourceSystemCount: new Set(
              sourceRecords.map((r) => r.sourceSystem.systemId)
            ).size,
          },
        };

        // Create merge result
        const result: MergeResult<T> = {
          goldenRecord,
          sourceRecordIds: sourceRecords.map((r) => r.recordId),
          conflicts,
          appliedRules,
          requiresReview,
          confidence,
          mergedAt: new Date(),
          mergedBy: userId,
          metadata: {
            autoResolved: conflicts.filter((c) => c.resolution === 'automatic')
              .length,
            manualResolution: conflicts.filter((c) => c.resolution === 'manual')
              .length,
            pendingResolution: conflicts.filter((c) => c.resolution === 'pending')
              .length,
          },
        };

        span.setAttribute('conflicts.count', conflicts.length);
        span.setAttribute('requires.review', requiresReview);
        span.setAttribute('confidence', confidence);

        return result;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Apply survivorship rules to determine the surviving values
   */
  private async applySurvivorshipRules<T = Record<string, unknown>>(
    sourceRecords: SourceRecord<T>[],
    strategy: MergeStrategy
  ): Promise<{
    masterData: T;
    conflicts: DataConflict[];
    appliedRules: string[];
  }> {
    const masterData: Record<string, unknown> = {};
    const conflicts: DataConflict[] = [];
    const appliedRules: string[] = [];

    // Get all unique fields across all records
    const allFields = new Set<string>();
    for (const record of sourceRecords) {
      Object.keys(record.data as Record<string, unknown>).forEach((key) =>
        allFields.add(key)
      );
    }

    // Sort rules by priority
    const sortedRules = [...strategy.survivorshipRules].sort(
      (a, b) => a.priority - b.priority
    );

    // Apply survivorship rules for each field
    for (const field of allFields) {
      // Find applicable rule for this field
      const rule = sortedRules.find((r) => r.fieldName === field);

      if (rule) {
        const result = await this.applySurvivorshipRule(
          field,
          sourceRecords,
          rule,
          strategy.conflictResolution
        );

        masterData[field] = result.value;
        if (result.conflict) {
          conflicts.push(result.conflict);
        }
        appliedRules.push(rule.ruleId);
      } else {
        // No rule specified, use default strategy
        const result = await this.applyDefaultStrategy(field, sourceRecords);
        masterData[field] = result.value;
        if (result.conflict) {
          conflicts.push(result.conflict);
        }
      }
    }

    return {
      masterData: masterData as T,
      conflicts,
      appliedRules,
    };
  }

  /**
   * Apply a single survivorship rule
   */
  private async applySurvivorshipRule<T = Record<string, unknown>>(
    fieldName: string,
    sourceRecords: SourceRecord<T>[],
    rule: SurvivorshipRule,
    conflictResolution: ConflictResolutionStrategy
  ): Promise<{ value: unknown; conflict?: DataConflict }> {
    // Get all values for this field
    const values: ConflictValue[] = sourceRecords
      .filter((r) => (r.data as Record<string, unknown>)[fieldName] !== undefined)
      .map((r) => ({
        value: (r.data as Record<string, unknown>)[fieldName],
        sourceRecordId: r.recordId,
        sourceSystem: r.sourceSystem.systemName,
        confidence: r.confidence,
        lastUpdated: r.updatedAt,
      }));

    if (values.length === 0) {
      return { value: undefined };
    }

    if (values.length === 1) {
      return { value: values[0].value };
    }

    // Check if all values are the same
    const uniqueValues = new Set(
      values.map((v) => JSON.stringify(v.value))
    );
    if (uniqueValues.size === 1) {
      return { value: values[0].value };
    }

    // Apply survivorship strategy
    const survivingValue = this.applyStrategy(
      values,
      rule.strategy,
      sourceRecords
    );

    // Determine if this needs manual resolution
    const needsManualResolution =
      conflictResolution === 'manual' ||
      (conflictResolution === 'hybrid' &&
        this.isLowConfidenceConflict(values));

    const conflict: DataConflict = {
      fieldName,
      values,
      resolvedValue: survivingValue,
      resolution: needsManualResolution ? 'manual' : 'automatic',
      reason: this.getResolutionReason(rule.strategy),
    };

    return { value: survivingValue, conflict };
  }

  /**
   * Apply survivorship strategy to select winning value
   */
  private applyStrategy<T = Record<string, unknown>>(
    values: ConflictValue[],
    strategy: SurvivorshipStrategy,
    sourceRecords: SourceRecord<T>[]
  ): unknown {
    switch (strategy) {
      case 'most_recent':
        return this.mostRecentStrategy(values);
      case 'most_complete':
        return this.mostCompleteStrategy(values);
      case 'most_frequent':
        return this.mostFrequentStrategy(values);
      case 'highest_quality':
        return this.highestQualityStrategy(values);
      case 'source_priority':
        return this.sourcePriorityStrategy(values, sourceRecords);
      case 'longest':
        return this.longestStrategy(values);
      case 'highest_value':
        return this.highestValueStrategy(values);
      case 'lowest_value':
        return this.lowestValueStrategy(values);
      case 'concatenate':
        return this.concatenateStrategy(values);
      default:
        return this.mostRecentStrategy(values);
    }
  }

  /**
   * Most recent value strategy
   */
  private mostRecentStrategy(values: ConflictValue[]): unknown {
    const sorted = [...values].sort(
      (a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime()
    );
    return sorted[0].value;
  }

  /**
   * Most complete value strategy (longest string or most properties for objects)
   */
  private mostCompleteStrategy(values: ConflictValue[]): unknown {
    return values.reduce((best, current) => {
      const bestScore = this.completenessScore(best.value);
      const currentScore = this.completenessScore(current.value);
      return currentScore > bestScore ? current : best;
    }).value;
  }

  /**
   * Calculate completeness score
   */
  private completenessScore(value: unknown): number {
    if (value === null || value === undefined) return 0;

    if (typeof value === 'string') {
      return value.trim().length;
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value).filter(
        (k) => (value as Record<string, unknown>)[k] !== undefined
      ).length;
    }

    if (Array.isArray(value)) {
      return value.length;
    }

    return 1;
  }

  /**
   * Most frequent value strategy
   */
  private mostFrequentStrategy(values: ConflictValue[]): unknown {
    const frequency = new Map<string, { count: number; value: unknown }>();

    for (const { value } of values) {
      const key = JSON.stringify(value);
      const current = frequency.get(key);
      if (current) {
        current.count++;
      } else {
        frequency.set(key, { count: 1, value });
      }
    }

    let maxCount = 0;
    let mostFrequent: unknown;

    for (const { count, value } of frequency.values()) {
      if (count > maxCount) {
        maxCount = count;
        mostFrequent = value;
      }
    }

    return mostFrequent;
  }

  /**
   * Highest quality strategy (based on confidence score)
   */
  private highestQualityStrategy(values: ConflictValue[]): unknown {
    const sorted = [...values].sort((a, b) => b.confidence - a.confidence);
    return sorted[0].value;
  }

  /**
   * Source priority strategy
   */
  private sourcePriorityStrategy<T = Record<string, unknown>>(
    values: ConflictValue[],
    sourceRecords: SourceRecord<T>[]
  ): unknown {
    const recordMap = new Map(
      sourceRecords.map((r) => [r.recordId, r])
    );

    const sorted = [...values].sort((a, b) => {
      const recordA = recordMap.get(a.sourceRecordId);
      const recordB = recordMap.get(b.sourceRecordId);
      const priorityA = recordA?.sourceSystem.priority ?? 0;
      const priorityB = recordB?.sourceSystem.priority ?? 0;
      return priorityB - priorityA;
    });

    return sorted[0].value;
  }

  /**
   * Longest value strategy
   */
  private longestStrategy(values: ConflictValue[]): unknown {
    return values.reduce((best, current) => {
      const bestLength = String(best.value).length;
      const currentLength = String(current.value).length;
      return currentLength > bestLength ? current : best;
    }).value;
  }

  /**
   * Highest numeric value strategy
   */
  private highestValueStrategy(values: ConflictValue[]): unknown {
    const numericValues = values.filter(
      (v) => typeof v.value === 'number' || !isNaN(Number(v.value))
    );

    if (numericValues.length === 0) {
      return values[0].value;
    }

    return numericValues.reduce((best, current) => {
      const bestNum = Number(best.value);
      const currentNum = Number(current.value);
      return currentNum > bestNum ? current : best;
    }).value;
  }

  /**
   * Lowest numeric value strategy
   */
  private lowestValueStrategy(values: ConflictValue[]): unknown {
    const numericValues = values.filter(
      (v) => typeof v.value === 'number' || !isNaN(Number(v.value))
    );

    if (numericValues.length === 0) {
      return values[0].value;
    }

    return numericValues.reduce((best, current) => {
      const bestNum = Number(best.value);
      const currentNum = Number(current.value);
      return currentNum < bestNum ? current : best;
    }).value;
  }

  /**
   * Concatenate strategy
   */
  private concatenateStrategy(values: ConflictValue[]): unknown {
    const uniqueValues = Array.from(
      new Set(values.map((v) => String(v.value)))
    );
    return uniqueValues.join('; ');
  }

  /**
   * Apply default strategy when no rule is specified
   */
  private async applyDefaultStrategy<T = Record<string, unknown>>(
    fieldName: string,
    sourceRecords: SourceRecord<T>[]
  ): Promise<{ value: unknown; conflict?: DataConflict }> {
    const values: ConflictValue[] = sourceRecords
      .filter((r) => (r.data as Record<string, unknown>)[fieldName] !== undefined)
      .map((r) => ({
        value: (r.data as Record<string, unknown>)[fieldName],
        sourceRecordId: r.recordId,
        sourceSystem: r.sourceSystem.systemName,
        confidence: r.confidence,
        lastUpdated: r.updatedAt,
      }));

    if (values.length === 0) {
      return { value: undefined };
    }

    if (values.length === 1) {
      return { value: values[0].value };
    }

    // Use most recent as default
    const survivingValue = this.mostRecentStrategy(values);

    const conflict: DataConflict = {
      fieldName,
      values,
      resolvedValue: survivingValue,
      resolution: 'automatic',
      reason: 'Default strategy: most recent',
    };

    return { value: survivingValue, conflict };
  }

  /**
   * Check if conflict has low confidence
   */
  private isLowConfidenceConflict(values: ConflictValue[]): boolean {
    const avgConfidence =
      values.reduce((sum, v) => sum + v.confidence, 0) / values.length;
    return avgConfidence < this.config.autoResolveThreshold;
  }

  /**
   * Get resolution reason for strategy
   */
  private getResolutionReason(strategy: SurvivorshipStrategy): string {
    const reasons: Record<SurvivorshipStrategy, string> = {
      most_recent: 'Selected most recently updated value',
      most_complete: 'Selected most complete value',
      most_frequent: 'Selected most frequently occurring value',
      highest_quality: 'Selected value from highest quality source',
      source_priority: 'Selected value based on source system priority',
      longest: 'Selected longest value',
      highest_value: 'Selected highest numeric value',
      lowest_value: 'Selected lowest numeric value',
      concatenate: 'Concatenated all unique values',
      custom: 'Applied custom survivorship logic',
    };

    return reasons[strategy] || 'Applied survivorship rule';
  }

  /**
   * Determine if manual review is required
   */
  private requiresManualReview(
    conflicts: DataConflict[],
    strategy: MergeStrategy,
    recordCount: number
  ): boolean {
    // Strategy requires approval
    if (strategy.requiresApproval) {
      return true;
    }

    // Too many conflicts
    if (conflicts.length > this.config.maxConflicts) {
      return true;
    }

    // High proportion of manual resolution conflicts
    const manualConflicts = conflicts.filter(
      (c) => c.resolution === 'manual' || c.resolution === 'pending'
    ).length;
    const conflictRatio = manualConflicts / Math.max(conflicts.length, 1);

    if (conflictRatio > 0.3) {
      return true;
    }

    // Too many source records
    if (recordCount > 10) {
      return true;
    }

    return false;
  }

  /**
   * Calculate merge confidence
   */
  private calculateMergeConfidence<T = Record<string, unknown>>(
    conflicts: DataConflict[],
    sourceRecords: SourceRecord<T>[]
  ): number {
    // Base confidence on source record confidence
    const avgSourceConfidence =
      sourceRecords.reduce((sum, r) => sum + r.confidence, 0) /
      sourceRecords.length;

    // Penalize for conflicts
    const totalFields = new Set<string>();
    sourceRecords.forEach((r) => {
      Object.keys(r.data as Record<string, unknown>).forEach((k) =>
        totalFields.add(k)
      );
    });

    const conflictRatio = conflicts.length / Math.max(totalFields.size, 1);
    const conflictPenalty = conflictRatio * 0.3;

    // Penalize for unresolved conflicts
    const unresolvedConflicts = conflicts.filter(
      (c) => c.resolution === 'pending'
    ).length;
    const unresolvedPenalty =
      (unresolvedConflicts / Math.max(conflicts.length, 1)) * 0.2;

    const confidence = Math.max(
      0,
      avgSourceConfidence - conflictPenalty - unresolvedPenalty
    );

    return Math.round(confidence * 100) / 100;
  }

  /**
   * Determine record status
   */
  private determineRecordStatus(
    requiresReview: boolean,
    strategy: MergeStrategy
  ): RecordStatus {
    if (requiresReview || strategy.requiresApproval) {
      return 'pending_review';
    }
    return 'approved';
  }

  /**
   * Update golden record with new source record
   */
  async updateGoldenRecord<T = Record<string, unknown>>(
    goldenRecord: GoldenRecord<T>,
    newSourceRecord: SourceRecord<T>,
    strategy: MergeStrategy,
    userId?: string
  ): Promise<MergeResult<T>> {
    return tracer.startActiveSpan(
      'RecordMerger.updateGoldenRecord',
      async (span) => {
        try {
          const allRecords = [...goldenRecord.sourceRecords, newSourceRecord];

          const result = await this.mergeRecords(allRecords, strategy, userId);

          // Increment version
          result.goldenRecord.version = goldenRecord.version + 1;
          result.goldenRecord.goldenId = goldenRecord.goldenId;

          return result;
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * Split a golden record back into source records
   */
  async splitGoldenRecord<T = Record<string, unknown>>(
    goldenRecord: GoldenRecord<T>,
    userId?: string
  ): Promise<SourceRecord<T>[]> {
    return tracer.startActiveSpan(
      'RecordMerger.splitGoldenRecord',
      async (span) => {
        try {
          span.setAttribute('golden.id', goldenRecord.goldenId);

          // Return source records with updated status
          return goldenRecord.sourceRecords.map((record) => ({
            ...record,
            metadata: {
              ...record.metadata,
              splitFrom: goldenRecord.goldenId,
              splitBy: userId,
              splitAt: new Date().toISOString(),
            },
          }));
        } finally {
          span.end();
        }
      }
    );
  }
}

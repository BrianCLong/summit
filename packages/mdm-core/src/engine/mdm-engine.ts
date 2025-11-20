/**
 * Core MDM Engine
 * Orchestrates master data management operations including golden record creation,
 * matching, merging, and synchronization
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  MasterRecord,
  SourceRecord,
  SurvivorshipRule,
  ConflictResolution,
  MergeEvent,
  LineageOperation,
  CertificationStatus
} from '../types/index.js';

export class MDMEngine {
  private domains: Map<string, any>;
  private masterRecords: Map<string, MasterRecord>;

  constructor() {
    this.domains = new Map();
    this.masterRecords = new Map();
  }

  /**
   * Create or update a golden record from source records
   */
  async createGoldenRecord(
    domain: string,
    sourceRecords: SourceRecord[],
    survivorshipRules: SurvivorshipRule[]
  ): Promise<MasterRecord> {
    // Apply survivorship rules to determine golden record values
    const goldenData = this.applySurvivorshipRules(sourceRecords, survivorshipRules);

    // Calculate quality score
    const qualityScore = this.calculateQualityScore(goldenData, sourceRecords);

    // Create master record
    const masterRecord: MasterRecord = {
      id: {
        id: uuidv4(),
        domain,
        version: 1
      },
      domain,
      data: goldenData,
      sourceRecords,
      crossReferences: this.buildCrossReferences(sourceRecords, domain),
      qualityScore,
      certificationStatus: qualityScore >= 0.9 ? 'certified' : 'pending_review',
      lineage: this.initializeLineage(sourceRecords),
      metadata: {
        tags: [],
        classifications: [],
        sensitivity: 'internal',
        customAttributes: {}
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };

    this.masterRecords.set(masterRecord.id.id, masterRecord);

    return masterRecord;
  }

  /**
   * Merge multiple master records into a single golden record
   */
  async mergeRecords(
    recordIds: string[],
    survivorshipRules: SurvivorshipRule[],
    mergedBy: string
  ): Promise<MasterRecord> {
    const records = recordIds.map(id => this.masterRecords.get(id)).filter(Boolean) as MasterRecord[];

    if (records.length < 2) {
      throw new Error('At least two records required for merge');
    }

    // Combine all source records
    const allSourceRecords = records.flatMap(r => r.sourceRecords);

    // Detect and resolve conflicts
    const conflicts = this.detectConflicts(records);
    const resolvedConflicts = this.resolveConflicts(conflicts, survivorshipRules);

    // Apply survivorship to create merged golden record
    const mergedData = this.applySurvivorshipRules(allSourceRecords, survivorshipRules);

    // Create merge event
    const mergeEvent: MergeEvent = {
      eventId: uuidv4(),
      sourceRecords: recordIds,
      targetRecord: records[0].id.id,
      survivorshipRules,
      conflicts: resolvedConflicts,
      timestamp: new Date(),
      mergedBy
    };

    // Update master record
    const mergedRecord: MasterRecord = {
      ...records[0],
      data: mergedData,
      sourceRecords: allSourceRecords,
      crossReferences: records.flatMap(r => r.crossReferences),
      qualityScore: this.calculateQualityScore(mergedData, allSourceRecords),
      lineage: {
        ...records[0].lineage,
        mergeHistory: [...(records[0].lineage.mergeHistory || []), mergeEvent]
      },
      updatedAt: new Date(),
      version: records[0].version + 1
    };

    this.masterRecords.set(mergedRecord.id.id, mergedRecord);

    // Archive or mark merged records
    recordIds.slice(1).forEach(id => {
      const record = this.masterRecords.get(id);
      if (record) {
        record.certificationStatus = 'archived';
      }
    });

    return mergedRecord;
  }

  /**
   * Apply survivorship rules to determine field values
   */
  private applySurvivorshipRules(
    sourceRecords: SourceRecord[],
    rules: SurvivorshipRule[]
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const rule of rules) {
      const value = this.applyStrategy(rule, sourceRecords);
      if (value !== undefined && value !== null) {
        result[rule.attributeName] = value;
      }
    }

    return result;
  }

  /**
   * Apply individual survivorship strategy
   */
  private applyStrategy(
    rule: SurvivorshipRule,
    sourceRecords: SourceRecord[]
  ): unknown {
    const values = sourceRecords
      .map(sr => ({ value: sr.data[rule.attributeName], record: sr }))
      .filter(v => v.value !== undefined && v.value !== null);

    if (values.length === 0) return undefined;

    switch (rule.strategy) {
      case 'most_recent':
        return values
          .sort((a, b) => b.record.lastModified.getTime() - a.record.lastModified.getTime())[0].value;

      case 'most_trusted_source':
        return values
          .sort((a, b) => b.record.priority - a.record.priority)[0].value;

      case 'most_frequent':
        const frequency = new Map<unknown, number>();
        values.forEach(v => frequency.set(v.value, (frequency.get(v.value) || 0) + 1));
        return Array.from(frequency.entries())
          .sort((a, b) => b[1] - a[1])[0][0];

      case 'longest_value':
        return values
          .sort((a, b) => String(b.value).length - String(a.value).length)[0].value;

      case 'highest_quality_score':
        return values
          .sort((a, b) => b.record.confidence - a.record.confidence)[0].value;

      case 'most_complete':
        return values
          .sort((a, b) => {
            const aComplete = this.getCompleteness(a.value);
            const bComplete = this.getCompleteness(b.value);
            return bComplete - aComplete;
          })[0].value;

      case 'custom':
        if (rule.customLogic) {
          return rule.customLogic(sourceRecords);
        }
        return values[0].value;

      default:
        return values[0].value;
    }
  }

  /**
   * Calculate completeness score for a value
   */
  private getCompleteness(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'string') return value.length > 0 ? 1 : 0;
    if (typeof value === 'object' && !Array.isArray(value)) {
      const keys = Object.keys(value);
      if (keys.length === 0) return 0;
      const nonNullKeys = keys.filter(k => (value as any)[k] !== null && (value as any)[k] !== undefined);
      return nonNullKeys.length / keys.length;
    }
    return 1;
  }

  /**
   * Calculate overall quality score for a master record
   */
  private calculateQualityScore(
    data: Record<string, unknown>,
    sourceRecords: SourceRecord[]
  ): number {
    // Quality dimensions
    const completeness = this.calculateCompleteness(data);
    const consistency = this.calculateConsistency(sourceRecords);
    const recency = this.calculateRecency(sourceRecords);
    const sourceQuality = this.calculateSourceQuality(sourceRecords);

    // Weighted average
    return (
      completeness * 0.3 +
      consistency * 0.25 +
      recency * 0.2 +
      sourceQuality * 0.25
    );
  }

  /**
   * Calculate completeness score
   */
  private calculateCompleteness(data: Record<string, unknown>): number {
    const totalFields = Object.keys(data).length;
    if (totalFields === 0) return 0;

    const populatedFields = Object.values(data).filter(v => v !== null && v !== undefined && v !== '').length;
    return populatedFields / totalFields;
  }

  /**
   * Calculate consistency across source records
   */
  private calculateConsistency(sourceRecords: SourceRecord[]): number {
    if (sourceRecords.length <= 1) return 1;

    const allFields = new Set<string>();
    sourceRecords.forEach(sr => Object.keys(sr.data).forEach(k => allFields.add(k)));

    let consistentFields = 0;

    allFields.forEach(field => {
      const values = sourceRecords
        .map(sr => sr.data[field])
        .filter(v => v !== undefined && v !== null);

      if (values.length === 0) return;

      const uniqueValues = new Set(values.map(v => JSON.stringify(v)));
      if (uniqueValues.size === 1) {
        consistentFields++;
      }
    });

    return allFields.size > 0 ? consistentFields / allFields.size : 1;
  }

  /**
   * Calculate recency score
   */
  private calculateRecency(sourceRecords: SourceRecord[]): number {
    if (sourceRecords.length === 0) return 0;

    const now = Date.now();
    const mostRecent = Math.max(...sourceRecords.map(sr => sr.lastModified.getTime()));
    const daysSinceUpdate = (now - mostRecent) / (1000 * 60 * 60 * 24);

    // Decay function: 1.0 for today, decreasing exponentially
    return Math.exp(-daysSinceUpdate / 30); // 30-day half-life
  }

  /**
   * Calculate source quality score
   */
  private calculateSourceQuality(sourceRecords: SourceRecord[]): number {
    if (sourceRecords.length === 0) return 0;

    const avgConfidence = sourceRecords.reduce((sum, sr) => sum + sr.confidence, 0) / sourceRecords.length;
    return avgConfidence;
  }

  /**
   * Build cross-references for master record
   */
  private buildCrossReferences(sourceRecords: SourceRecord[], domain: string): any[] {
    return sourceRecords.map(sr => ({
      sourceSystem: sr.sourceSystem,
      sourceRecordId: sr.sourceRecordId,
      masterRecordId: '', // Will be set after master record creation
      linkType: 'exact' as const,
      confidence: sr.confidence,
      createdAt: new Date(),
      createdBy: 'system'
    }));
  }

  /**
   * Initialize lineage for new master record
   */
  private initializeLineage(sourceRecords: SourceRecord[]): any {
    return {
      sourceOperations: sourceRecords.map(sr => ({
        operationId: uuidv4(),
        operationType: 'create' as const,
        timestamp: sr.lastModified,
        user: 'system',
        sourceSystem: sr.sourceSystem,
        changes: []
      })),
      transformations: [],
      matchingHistory: [],
      mergeHistory: []
    };
  }

  /**
   * Detect conflicts between records
   */
  private detectConflicts(records: MasterRecord[]): ConflictResolution[] {
    const conflicts: ConflictResolution[] = [];
    const allFields = new Set<string>();

    records.forEach(r => Object.keys(r.data).forEach(k => allFields.add(k)));

    allFields.forEach(field => {
      const values = records
        .map(r => ({
          value: r.data[field],
          source: r.id.id,
          confidence: r.qualityScore
        }))
        .filter(v => v.value !== undefined && v.value !== null);

      if (values.length > 1) {
        const uniqueValues = new Set(values.map(v => JSON.stringify(v.value)));
        if (uniqueValues.size > 1) {
          conflicts.push({
            fieldName: field,
            conflictingValues: values,
            resolvedValue: values[0].value,
            resolutionStrategy: 'pending',
            resolvedBy: 'system',
            timestamp: new Date()
          });
        }
      }
    });

    return conflicts;
  }

  /**
   * Resolve conflicts using survivorship rules
   */
  private resolveConflicts(
    conflicts: ConflictResolution[],
    rules: SurvivorshipRule[]
  ): ConflictResolution[] {
    return conflicts.map(conflict => {
      const rule = rules.find(r => r.attributeName === conflict.fieldName);
      if (rule) {
        conflict.resolutionStrategy = rule.strategy;
      }
      return conflict;
    });
  }

  /**
   * Get master record by ID
   */
  async getMasterRecord(id: string): Promise<MasterRecord | undefined> {
    return this.masterRecords.get(id);
  }

  /**
   * Update master record certification status
   */
  async certifyRecord(
    recordId: string,
    status: CertificationStatus,
    certifiedBy: string
  ): Promise<MasterRecord> {
    const record = this.masterRecords.get(recordId);
    if (!record) {
      throw new Error(`Master record ${recordId} not found`);
    }

    record.certificationStatus = status;
    record.metadata.lastCertifiedAt = new Date();
    record.metadata.lastCertifiedBy = certifiedBy;
    record.updatedAt = new Date();

    return record;
  }
}

/**
 * Golden Record Manager
 * Manages golden record lifecycle including creation, updates, merging, and certification
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  MasterRecord,
  SourceRecord,
  SurvivorshipRule,
  CertificationStatus,
  MergeEvent,
  CrossReference
} from '@summit/mdm-core';

export interface GoldenRecordConfig {
  domain: string;
  survivorshipRules: SurvivorshipRule[];
  autoMergeThreshold?: number;
  qualityCertificationThreshold?: number;
  enableVersioning: boolean;
  enableLineageTracking: boolean;
}

export class GoldenRecordManager {
  private config: GoldenRecordConfig;
  private records: Map<string, MasterRecord>;
  private sourceIndex: Map<string, string>; // sourceSystem:sourceRecordId -> masterRecordId

  constructor(config: GoldenRecordConfig) {
    this.config = config;
    this.records = new Map();
    this.sourceIndex = new Map();
  }

  /**
   * Create a new golden record from source records
   */
  async createGoldenRecord(sourceRecords: SourceRecord[]): Promise<MasterRecord> {
    if (sourceRecords.length === 0) {
      throw new Error('At least one source record required');
    }

    // Check if any source records already linked to golden record
    const existingMasterIds = this.findExistingMasterRecords(sourceRecords);
    if (existingMasterIds.length > 0) {
      throw new Error(`Source records already linked to master records: ${existingMasterIds.join(', ')}`);
    }

    // Apply survivorship rules
    const goldenData = this.applySurvivorshipRules(sourceRecords);

    // Calculate quality score
    const qualityScore = this.calculateQualityScore(goldenData, sourceRecords);

    // Determine certification status
    const certificationStatus = this.determineCertificationStatus(qualityScore);

    // Build cross-references
    const crossReferences = this.buildCrossReferences(sourceRecords);

    // Create master record
    const masterRecord: MasterRecord = {
      id: {
        id: uuidv4(),
        domain: this.config.domain,
        version: 1
      },
      domain: this.config.domain,
      data: goldenData,
      sourceRecords,
      crossReferences,
      qualityScore,
      certificationStatus,
      lineage: {
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
      },
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

    // Store record
    this.records.set(masterRecord.id.id, masterRecord);

    // Index source records
    this.indexSourceRecords(masterRecord);

    return masterRecord;
  }

  /**
   * Update golden record with new source data
   */
  async updateGoldenRecord(
    masterRecordId: string,
    newSourceRecords: SourceRecord[]
  ): Promise<MasterRecord> {
    const existingRecord = this.records.get(masterRecordId);
    if (!existingRecord) {
      throw new Error(`Master record ${masterRecordId} not found`);
    }

    // Merge with existing source records
    const allSourceRecords = [...existingRecord.sourceRecords, ...newSourceRecords];

    // Reapply survivorship rules
    const goldenData = this.applySurvivorshipRules(allSourceRecords);

    // Recalculate quality score
    const qualityScore = this.calculateQualityScore(goldenData, allSourceRecords);

    // Update cross-references
    const newCrossRefs = this.buildCrossReferences(newSourceRecords);
    const allCrossRefs = [...existingRecord.crossReferences, ...newCrossRefs];

    // Update master record
    const updatedRecord: MasterRecord = {
      ...existingRecord,
      data: goldenData,
      sourceRecords: allSourceRecords,
      crossReferences: allCrossRefs,
      qualityScore,
      certificationStatus: this.determineCertificationStatus(qualityScore),
      updatedAt: new Date(),
      version: existingRecord.version + 1
    };

    // Update lineage
    if (this.config.enableLineageTracking) {
      updatedRecord.lineage.sourceOperations.push(
        ...newSourceRecords.map(sr => ({
          operationId: uuidv4(),
          operationType: 'update' as const,
          timestamp: new Date(),
          user: 'system',
          sourceSystem: sr.sourceSystem,
          changes: this.detectChanges(existingRecord.data, goldenData)
        }))
      );
    }

    // Store updated record
    this.records.set(masterRecordId, updatedRecord);

    // Index new source records
    this.indexSourceRecords(updatedRecord);

    return updatedRecord;
  }

  /**
   * Merge multiple golden records
   */
  async mergeGoldenRecords(
    recordIds: string[],
    mergedBy: string
  ): Promise<MasterRecord> {
    if (recordIds.length < 2) {
      throw new Error('At least two records required for merge');
    }

    const records = recordIds
      .map(id => this.records.get(id))
      .filter((r): r is MasterRecord => r !== undefined);

    if (records.length !== recordIds.length) {
      throw new Error('One or more master records not found');
    }

    // Combine all source records
    const allSourceRecords = records.flatMap(r => r.sourceRecords);

    // Combine cross-references
    const allCrossRefs = records.flatMap(r => r.crossReferences);

    // Apply survivorship
    const mergedData = this.applySurvivorshipRules(allSourceRecords);

    // Calculate quality score
    const qualityScore = this.calculateQualityScore(mergedData, allSourceRecords);

    // Create merge event
    const mergeEvent: MergeEvent = {
      eventId: uuidv4(),
      sourceRecords: recordIds,
      targetRecord: records[0].id.id,
      survivorshipRules: this.config.survivorshipRules,
      conflicts: [],
      timestamp: new Date(),
      mergedBy
    };

    // Create merged record (using first record as base)
    const mergedRecord: MasterRecord = {
      ...records[0],
      data: mergedData,
      sourceRecords: allSourceRecords,
      crossReferences: allCrossRefs,
      qualityScore,
      certificationStatus: this.determineCertificationStatus(qualityScore),
      updatedAt: new Date(),
      version: records[0].version + 1
    };

    // Update lineage
    mergedRecord.lineage.mergeHistory.push(mergeEvent);

    // Store merged record
    this.records.set(mergedRecord.id.id, mergedRecord);

    // Archive other records
    recordIds.slice(1).forEach(id => {
      const record = this.records.get(id);
      if (record) {
        record.certificationStatus = 'archived';
        record.updatedAt = new Date();
      }
    });

    // Reindex source records
    this.indexSourceRecords(mergedRecord);

    return mergedRecord;
  }

  /**
   * Certify a golden record
   */
  async certifyRecord(
    recordId: string,
    certifiedBy: string,
    certificationLevel?: CertificationStatus
  ): Promise<MasterRecord> {
    const record = this.records.get(recordId);
    if (!record) {
      throw new Error(`Master record ${recordId} not found`);
    }

    record.certificationStatus = certificationLevel || 'certified';
    record.metadata.lastCertifiedAt = new Date();
    record.metadata.lastCertifiedBy = certifiedBy;
    record.updatedAt = new Date();

    return record;
  }

  /**
   * Apply survivorship rules to determine golden values
   */
  private applySurvivorshipRules(sourceRecords: SourceRecord[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const rule of this.config.survivorshipRules) {
      const value = this.applyRule(rule, sourceRecords);
      if (value !== undefined && value !== null) {
        result[rule.fieldName] = value;
      }
    }

    // Include all fields from highest priority source
    const highestPriority = sourceRecords.reduce((max, sr) =>
      sr.priority > max.priority ? sr : max
    );

    for (const [key, value] of Object.entries(highestPriority.data)) {
      if (!(key in result)) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Apply individual survivorship rule
   */
  private applyRule(rule: SurvivorshipRule, sourceRecords: SourceRecord[]): unknown {
    const values = sourceRecords
      .map(sr => ({ value: sr.data[rule.fieldName], record: sr }))
      .filter(v => v.value !== undefined && v.value !== null);

    if (values.length === 0) return undefined;

    switch (rule.strategy) {
      case 'most_recent':
        return values.sort((a, b) =>
          b.record.lastModified.getTime() - a.record.lastModified.getTime()
        )[0].value;

      case 'most_trusted_source':
        return values.sort((a, b) => b.record.priority - a.record.priority)[0].value;

      case 'highest_quality':
        return values.sort((a, b) => b.record.confidence - a.record.confidence)[0].value;

      case 'most_complete':
        return values.sort((a, b) => {
          const aLen = String(a.value).length;
          const bLen = String(b.value).length;
          return bLen - aLen;
        })[0].value;

      case 'custom':
        if (rule.customLogic) {
          return Function('sourceRecords', rule.customLogic)(sourceRecords);
        }
        return values[0].value;

      default:
        return values[0].value;
    }
  }

  /**
   * Calculate quality score
   */
  private calculateQualityScore(
    data: Record<string, unknown>,
    sourceRecords: SourceRecord[]
  ): number {
    const completeness = this.calculateCompleteness(data);
    const consistency = this.calculateConsistency(sourceRecords);
    const recency = this.calculateRecency(sourceRecords);

    return (completeness * 0.4 + consistency * 0.3 + recency * 0.3);
  }

  /**
   * Calculate completeness
   */
  private calculateCompleteness(data: Record<string, unknown>): number {
    const total = Object.keys(data).length;
    if (total === 0) return 0;

    const populated = Object.values(data)
      .filter(v => v !== null && v !== undefined && v !== '').length;

    return populated / total;
  }

  /**
   * Calculate consistency across sources
   */
  private calculateConsistency(sourceRecords: SourceRecord[]): number {
    if (sourceRecords.length <= 1) return 1;

    const allFields = new Set<string>();
    sourceRecords.forEach(sr => Object.keys(sr.data).forEach(k => allFields.add(k)));

    let consistent = 0;
    allFields.forEach(field => {
      const values = new Set(
        sourceRecords
          .map(sr => JSON.stringify(sr.data[field]))
          .filter(v => v !== undefined)
      );
      if (values.size <= 1) consistent++;
    });

    return allFields.size > 0 ? consistent / allFields.size : 1;
  }

  /**
   * Calculate recency
   */
  private calculateRecency(sourceRecords: SourceRecord[]): number {
    if (sourceRecords.length === 0) return 0;

    const now = Date.now();
    const mostRecent = Math.max(...sourceRecords.map(sr => sr.lastModified.getTime()));
    const daysSince = (now - mostRecent) / (1000 * 60 * 60 * 24);

    return Math.exp(-daysSince / 30);
  }

  /**
   * Determine certification status based on quality score
   */
  private determineCertificationStatus(qualityScore: number): CertificationStatus {
    const threshold = this.config.qualityCertificationThreshold || 0.9;

    if (qualityScore >= threshold) {
      return 'certified';
    } else if (qualityScore >= threshold * 0.7) {
      return 'pending_review';
    } else {
      return 'draft';
    }
  }

  /**
   * Build cross-references
   */
  private buildCrossReferences(sourceRecords: SourceRecord[]): CrossReference[] {
    return sourceRecords.map(sr => ({
      sourceSystem: sr.sourceSystem,
      sourceRecordId: sr.sourceRecordId,
      masterRecordId: '',
      linkType: 'exact' as const,
      confidence: sr.confidence,
      createdAt: new Date(),
      createdBy: 'system'
    }));
  }

  /**
   * Index source records for lookup
   */
  private indexSourceRecords(masterRecord: MasterRecord): void {
    for (const sr of masterRecord.sourceRecords) {
      const key = `${sr.sourceSystem}:${sr.sourceRecordId}`;
      this.sourceIndex.set(key, masterRecord.id.id);
    }
  }

  /**
   * Find existing master records for source records
   */
  private findExistingMasterRecords(sourceRecords: SourceRecord[]): string[] {
    const masterIds = new Set<string>();

    for (const sr of sourceRecords) {
      const key = `${sr.sourceSystem}:${sr.sourceRecordId}`;
      const masterId = this.sourceIndex.get(key);
      if (masterId) {
        masterIds.add(masterId);
      }
    }

    return Array.from(masterIds);
  }

  /**
   * Detect changes between old and new data
   */
  private detectChanges(
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>
  ): Array<{ fieldName: string; oldValue: unknown; newValue: unknown; source: string; confidence: number }> {
    const changes: Array<{
      fieldName: string;
      oldValue: unknown;
      newValue: unknown;
      source: string;
      confidence: number;
    }> = [];

    const allFields = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    for (const field of allFields) {
      const oldValue = oldData[field];
      const newValue = newData[field];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          fieldName: field,
          oldValue,
          newValue,
          source: 'system',
          confidence: 1.0
        });
      }
    }

    return changes;
  }

  /**
   * Get golden record by ID
   */
  async getGoldenRecord(recordId: string): Promise<MasterRecord | undefined> {
    return this.records.get(recordId);
  }

  /**
   * Find golden record by source record
   */
  async findBySourceRecord(
    sourceSystem: string,
    sourceRecordId: string
  ): Promise<MasterRecord | undefined> {
    const key = `${sourceSystem}:${sourceRecordId}`;
    const masterId = this.sourceIndex.get(key);
    return masterId ? this.records.get(masterId) : undefined;
  }
}

"use strict";
/**
 * Golden Record Manager
 * Manages golden record lifecycle including creation, updates, merging, and certification
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoldenRecordManager = void 0;
const uuid_1 = require("uuid");
class GoldenRecordManager {
    config;
    records;
    sourceIndex; // sourceSystem:sourceRecordId -> masterRecordId
    constructor(config) {
        this.config = config;
        this.records = new Map();
        this.sourceIndex = new Map();
    }
    /**
     * Create a new golden record from source records
     */
    async createGoldenRecord(sourceRecords, context = {}) {
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
        const crossReferences = this.buildCrossReferences([], sourceRecords);
        const masterId = (0, uuid_1.v4)();
        // Create master record
        const masterRecord = {
            id: {
                id: masterId,
                domain: this.config.domain,
                version: 1
            },
            domain: this.config.domain,
            data: goldenData,
            sourceRecords,
            crossReferences: this.buildCrossReferences(masterId, sourceRecords),
            qualityScore,
            certificationStatus,
            lineage: {
                sourceOperations: sourceRecords.map(sr => ({
                    operationId: (0, uuid_1.v4)(),
                    operationType: 'create',
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
                tags: context.tags ?? [],
                classifications: context.classifications ?? [],
                sensitivity: 'internal',
                recordType: context.recordType,
                tenantId: context.tenantId,
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
    async updateGoldenRecord(masterRecordId, newSourceRecords, context = {}) {
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
        const allCrossRefs = this.buildCrossReferences(masterRecordId, newSourceRecords, existingRecord.crossReferences);
        // Update master record
        const updatedRecord = {
            ...existingRecord,
            data: goldenData,
            sourceRecords: allSourceRecords,
            crossReferences: allCrossRefs,
            qualityScore,
            certificationStatus: this.determineCertificationStatus(qualityScore),
            metadata: {
                ...existingRecord.metadata,
                recordType: existingRecord.metadata.recordType ?? context.recordType,
                tenantId: existingRecord.metadata.tenantId ?? context.tenantId,
                tags: context.tags ?? existingRecord.metadata.tags,
                classifications: context.classifications ?? existingRecord.metadata.classifications,
            },
            updatedAt: new Date(),
            version: existingRecord.version + 1
        };
        // Update lineage
        if (this.config.enableLineageTracking) {
            updatedRecord.lineage.sourceOperations.push(...newSourceRecords.map(sr => ({
                operationId: (0, uuid_1.v4)(),
                operationType: 'update',
                timestamp: new Date(),
                user: 'system',
                sourceSystem: sr.sourceSystem,
                changes: this.detectChanges(existingRecord.data, goldenData)
            })));
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
    async mergeGoldenRecords(recordIds, mergedBy) {
        if (recordIds.length < 2) {
            throw new Error('At least two records required for merge');
        }
        const records = recordIds
            .map(id => this.records.get(id))
            .filter((r) => r !== undefined);
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
        const mergeEvent = {
            eventId: (0, uuid_1.v4)(),
            sourceRecords: recordIds,
            targetRecord: records[0].id.id,
            survivorshipRules: this.config.survivorshipRules,
            conflicts: [],
            timestamp: new Date(),
            mergedBy
        };
        // Create merged record (using first record as base)
        const mergedRecord = {
            ...records[0],
            data: mergedData,
            sourceRecords: allSourceRecords,
            crossReferences: this.buildCrossReferences(records[0].id.id, allSourceRecords, allCrossRefs),
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
    async certifyRecord(recordId, certifiedBy, certificationLevel) {
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
    applySurvivorshipRules(sourceRecords) {
        const result = {};
        for (const rule of this.config.survivorshipRules) {
            const fieldName = rule.attributeName ?? rule.fieldName;
            if (!fieldName)
                continue;
            const value = this.applyRule(rule, sourceRecords);
            if (value !== undefined && value !== null) {
                result[fieldName] = value;
            }
        }
        // Include all fields from highest priority source
        const highestPriority = sourceRecords.reduce((max, sr) => sr.priority > max.priority ? sr : max);
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
    applyRule(rule, sourceRecords) {
        const attributeName = rule.attributeName ?? rule.fieldName;
        if (!attributeName)
            return undefined;
        const values = sourceRecords
            .map(sr => ({ value: sr.data[attributeName], record: sr }))
            .filter(v => v.value !== undefined && v.value !== null);
        if (values.length === 0)
            return undefined;
        switch (rule.strategy) {
            case 'most_recent':
                return values.sort((a, b) => b.record.lastModified.getTime() - a.record.lastModified.getTime())[0].value;
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
    calculateQualityScore(data, sourceRecords) {
        const completeness = this.calculateCompleteness(data);
        const consistency = this.calculateConsistency(sourceRecords);
        const recency = this.calculateRecency(sourceRecords);
        return (completeness * 0.4 + consistency * 0.3 + recency * 0.3);
    }
    /**
     * Calculate completeness
     */
    calculateCompleteness(data) {
        const total = Object.keys(data).length;
        if (total === 0)
            return 0;
        const populated = Object.values(data)
            .filter(v => v !== null && v !== undefined && v !== '').length;
        return populated / total;
    }
    /**
     * Calculate consistency across sources
     */
    calculateConsistency(sourceRecords) {
        if (sourceRecords.length <= 1)
            return 1;
        const allFields = new Set();
        sourceRecords.forEach(sr => Object.keys(sr.data).forEach(k => allFields.add(k)));
        let consistent = 0;
        allFields.forEach(field => {
            const values = new Set(sourceRecords
                .map(sr => JSON.stringify(sr.data[field]))
                .filter(v => v !== undefined));
            if (values.size <= 1)
                consistent++;
        });
        return allFields.size > 0 ? consistent / allFields.size : 1;
    }
    /**
     * Calculate recency
     */
    calculateRecency(sourceRecords) {
        if (sourceRecords.length === 0)
            return 0;
        const now = Date.now();
        const mostRecent = Math.max(...sourceRecords.map(sr => sr.lastModified.getTime()));
        const daysSince = (now - mostRecent) / (1000 * 60 * 60 * 24);
        return Math.exp(-daysSince / 30);
    }
    /**
     * Determine certification status based on quality score
     */
    determineCertificationStatus(qualityScore) {
        const threshold = this.config.qualityCertificationThreshold || 0.9;
        if (qualityScore >= threshold) {
            return 'certified';
        }
        else if (qualityScore >= threshold * 0.7) {
            return 'pending_review';
        }
        else {
            return 'draft';
        }
    }
    /**
     * Build cross-references
     */
    buildCrossReferences(masterRecordId, sourceRecords, existingCrossReferences = []) {
        const seen = new Set(existingCrossReferences.map(ref => `${ref.sourceSystem}:${ref.sourceRecordId}`));
        const newRefs = sourceRecords
            .filter(sr => !seen.has(`${sr.sourceSystem}:${sr.sourceRecordId}`))
            .map(sr => ({
            sourceSystem: sr.sourceSystem,
            sourceRecordId: sr.sourceRecordId,
            masterRecordId,
            linkType: 'exact',
            confidence: sr.confidence,
            createdAt: new Date(),
            createdBy: 'system'
        }));
        return [...existingCrossReferences, ...newRefs];
    }
    /**
     * Index source records for lookup
     */
    indexSourceRecords(masterRecord) {
        for (const sr of masterRecord.sourceRecords) {
            const key = `${sr.sourceSystem}:${sr.sourceRecordId}`;
            this.sourceIndex.set(key, masterRecord.id.id);
        }
    }
    /**
     * Find existing master records for source records
     */
    findExistingMasterRecords(sourceRecords) {
        const masterIds = new Set();
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
    detectChanges(oldData, newData) {
        const changes = [];
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
    getGoldenRecord(recordId) {
        return this.records.get(recordId);
    }
    /**
     * Find golden record by source record
     */
    findBySourceRecord(sourceSystem, sourceRecordId) {
        const key = `${sourceSystem}:${sourceRecordId}`;
        const masterId = this.sourceIndex.get(key);
        return masterId ? this.records.get(masterId) : undefined;
    }
    async getAllRecords() {
        return Array.from(this.records.values());
    }
}
exports.GoldenRecordManager = GoldenRecordManager;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataCloneService = void 0;
exports.getDataCloneService = getDataCloneService;
const uuid_1 = require("uuid");
const index_js_1 = require("../types/index.js");
const DataAnonymizer_js_1 = require("../anonymization/DataAnonymizer.js");
const SyntheticDataGenerator_js_1 = require("../synthetic/SyntheticDataGenerator.js");
const logger_js_1 = require("../utils/logger.js");
const sandbox_tenant_profile_1 = require("@intelgraph/sandbox-tenant-profile");
const logger = (0, logger_js_1.createLogger)('DataCloneService');
/**
 * DataCloneService handles cloning production data structure
 * with synthetic values, anonymization, or sampling.
 */
class DataCloneService {
    anonymizer;
    syntheticGenerator;
    constructor() {
        this.anonymizer = (0, DataAnonymizer_js_1.getDataAnonymizer)();
        this.syntheticGenerator = (0, SyntheticDataGenerator_js_1.getSyntheticDataGenerator)();
    }
    /**
     * Clone data into sandbox according to request
     */
    async clone(request, sandboxProfile) {
        const requestId = request.id || (0, uuid_1.v4)();
        const startTime = Date.now();
        logger.info('Starting data clone operation', {
            requestId,
            sandboxId: request.sandboxId,
            sourceType: request.sourceType,
            strategy: request.strategy,
        });
        const context = {
            requestId,
            sandboxId: request.sandboxId,
            sourceRecords: 0,
            clonedRecords: 0,
            anonymizedFields: 0,
            relationshipsCloned: 0,
            startTime,
            warnings: [],
        };
        try {
            // Validate request against sandbox policy
            await this.validateRequest(request, sandboxProfile);
            // Get source data based on source type
            const sourceData = await this.fetchSourceData(request, sandboxProfile);
            context.sourceRecords = sourceData.entities.length;
            // Apply clone strategy
            const clonedData = await this.applyStrategy(sourceData, request, sandboxProfile, context);
            context.clonedRecords = clonedData.entities.length;
            context.relationshipsCloned = clonedData.relationships?.length || 0;
            // Store cloned data in sandbox
            const outputLocation = await this.storeClonedData(clonedData, request, context);
            const result = {
                id: (0, uuid_1.v4)(),
                requestId,
                sandboxId: request.sandboxId,
                status: 'completed',
                statistics: {
                    sourceRecords: context.sourceRecords,
                    clonedRecords: context.clonedRecords,
                    anonymizedFields: context.anonymizedFields,
                    relationshipsCloned: context.relationshipsCloned,
                    processingTimeMs: Date.now() - startTime,
                },
                audit: {
                    anonymizationReport: this.getAnonymizationReport(request.fieldAnonymization, context),
                    validationPassed: true,
                    warnings: context.warnings,
                },
                outputLocation,
                startedAt: new Date(startTime),
                completedAt: new Date(),
            };
            logger.info('Data clone completed', {
                requestId,
                clonedRecords: context.clonedRecords,
                processingTimeMs: result.statistics.processingTimeMs,
            });
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Data clone failed', {
                requestId,
                error: errorMessage,
            });
            return {
                id: (0, uuid_1.v4)(),
                requestId,
                sandboxId: request.sandboxId,
                status: 'failed',
                statistics: {
                    sourceRecords: context.sourceRecords,
                    clonedRecords: context.clonedRecords,
                    anonymizedFields: context.anonymizedFields,
                    relationshipsCloned: context.relationshipsCloned,
                    processingTimeMs: Date.now() - startTime,
                },
                audit: {
                    anonymizationReport: [],
                    validationPassed: false,
                    warnings: context.warnings,
                },
                startedAt: new Date(startTime),
                completedAt: new Date(),
                error: errorMessage,
            };
        }
    }
    /**
     * Validate clone request against sandbox policy
     */
    async validateRequest(request, profile) {
        const enforcer = (0, sandbox_tenant_profile_1.getSandboxEnforcer)();
        // Check data access is allowed
        const decision = await enforcer.enforce(profile, {
            sandboxId: profile.id,
            userId: request.requestedBy,
            operation: sandbox_tenant_profile_1.OperationType.DATA_ACCESS,
        });
        if (!decision.allowed) {
            throw {
                code: index_js_1.DataLabErrorCode.VALIDATION_FAILED,
                message: `Data access not allowed: ${decision.reason}`,
                sandboxId: request.sandboxId,
                operation: 'clone',
                timestamp: new Date(),
            };
        }
        // Validate strategy against data access policy
        const dataMode = profile.dataAccessPolicy.mode;
        if (dataMode === sandbox_tenant_profile_1.DataAccessMode.SYNTHETIC_ONLY) {
            if (request.strategy !== index_js_1.CloneStrategy.SYNTHETIC &&
                request.strategy !== index_js_1.CloneStrategy.STRUCTURE_ONLY) {
                throw {
                    code: index_js_1.DataLabErrorCode.VALIDATION_FAILED,
                    message: `Sandbox only allows synthetic data. Strategy ${request.strategy} is not permitted.`,
                    sandboxId: request.sandboxId,
                    operation: 'clone',
                    timestamp: new Date(),
                };
            }
        }
        if (dataMode === sandbox_tenant_profile_1.DataAccessMode.STRUCTURE_ONLY) {
            if (request.strategy !== index_js_1.CloneStrategy.STRUCTURE_ONLY) {
                throw {
                    code: index_js_1.DataLabErrorCode.VALIDATION_FAILED,
                    message: 'Sandbox only allows structure cloning, not data.',
                    sandboxId: request.sandboxId,
                    operation: 'clone',
                    timestamp: new Date(),
                };
            }
        }
        // Validate sample size
        if (request.sampleSize &&
            request.sampleSize > profile.dataAccessPolicy.maxRecords) {
            throw {
                code: index_js_1.DataLabErrorCode.QUOTA_EXCEEDED,
                message: `Sample size ${request.sampleSize} exceeds maximum ${profile.dataAccessPolicy.maxRecords}`,
                sandboxId: request.sandboxId,
                operation: 'clone',
                timestamp: new Date(),
            };
        }
    }
    /**
     * Fetch source data based on source type
     */
    async fetchSourceData(request, profile) {
        // In a real implementation, this would:
        // 1. Connect to the appropriate data source
        // 2. Execute query/fetch logic
        // 3. Apply initial filtering
        logger.info('Fetching source data', {
            sourceType: request.sourceType,
            sandboxId: request.sandboxId,
        });
        // Simulated data fetch
        switch (request.sourceType) {
            case index_js_1.DataSourceType.NEO4J:
                return this.fetchFromNeo4j(request);
            case index_js_1.DataSourceType.POSTGRESQL:
                return this.fetchFromPostgres(request);
            case index_js_1.DataSourceType.INVESTIGATION:
                return this.fetchFromInvestigation(request);
            case index_js_1.DataSourceType.SCENARIO:
                return this.fetchFromScenario(request);
            default:
                return { entities: [], relationships: [] };
        }
    }
    /**
     * Apply clone strategy to data
     */
    async applyStrategy(sourceData, request, profile, context) {
        switch (request.strategy) {
            case index_js_1.CloneStrategy.STRUCTURE_ONLY:
                return this.applyStructureOnly(sourceData, context);
            case index_js_1.CloneStrategy.SYNTHETIC:
                return this.applySynthetic(sourceData, request, context);
            case index_js_1.CloneStrategy.ANONYMIZED:
                return this.applyAnonymized(sourceData, request, profile, context);
            case index_js_1.CloneStrategy.SAMPLED:
                return this.applySampled(sourceData, request, profile, context);
            case index_js_1.CloneStrategy.FUZZED:
                return this.applyFuzzed(sourceData, request, context);
            default:
                throw new Error(`Unknown clone strategy: ${request.strategy}`);
        }
    }
    /**
     * Structure only - return schema without data
     */
    applyStructureOnly(sourceData, context) {
        // Extract schema/structure only
        const sampleEntity = sourceData.entities[0] || {};
        const structure = Object.keys(sampleEntity).reduce((acc, key) => {
            acc[key] = typeof sampleEntity[key];
            return acc;
        }, {});
        return {
            entities: [{ _schema: structure, _note: 'Structure only - no actual data' }],
            relationships: [],
        };
    }
    /**
     * Replace all values with synthetic data
     */
    async applySynthetic(sourceData, request, context) {
        const entities = [];
        for (const entity of sourceData.entities) {
            const syntheticEntity = {
                id: (0, uuid_1.v4)(),
                dataSource: 'synthetic',
                tenantId: request.sandboxId,
            };
            // Generate synthetic values for each field
            for (const [key, value] of Object.entries(entity)) {
                if (key === 'id' || key === 'tenantId')
                    continue;
                syntheticEntity[key] = this.generateSyntheticValue(key, value);
            }
            entities.push(syntheticEntity);
        }
        return {
            entities,
            relationships: this.generateSyntheticRelationships(sourceData.relationships || [], request.sandboxId),
        };
    }
    /**
     * Apply anonymization to real data
     */
    async applyAnonymized(sourceData, request, profile, context) {
        // Build anonymization config based on PII handling
        const configs = request.fieldAnonymization.length > 0
            ? request.fieldAnonymization
            : this.buildDefaultAnonymizationConfig(sourceData.entities[0] || {}, profile);
        context.anonymizedFields = configs.length;
        // Anonymize entities
        const result = await this.anonymizer.anonymize(sourceData.entities, configs);
        // Add warnings
        context.warnings.push(...result.warnings);
        // Add sandbox metadata
        const anonymizedEntities = result.data.map(entity => ({
            ...entity,
            dataSource: 'anonymized',
            tenantId: request.sandboxId,
        }));
        return {
            entities: anonymizedEntities,
            relationships: sourceData.relationships?.map(rel => ({
                ...rel,
                dataSource: 'anonymized',
                tenantId: request.sandboxId,
            })),
        };
    }
    /**
     * Sample and anonymize data
     */
    async applySampled(sourceData, request, profile, context) {
        const sampleSize = Math.min(request.sampleSize || profile.dataAccessPolicy.maxRecords, sourceData.entities.length);
        // Sample entities
        let sampledEntities;
        switch (request.sampleMethod) {
            case 'stratified':
                sampledEntities = this.stratifiedSample(sourceData.entities, sampleSize);
                break;
            case 'systematic':
                sampledEntities = this.systematicSample(sourceData.entities, sampleSize);
                break;
            case 'random':
            default:
                sampledEntities = this.randomSample(sourceData.entities, sampleSize);
        }
        // Apply anonymization to sample
        return this.applyAnonymized({ entities: sampledEntities, relationships: sourceData.relationships }, request, profile, context);
    }
    /**
     * Fuzz values while maintaining structure
     */
    async applyFuzzed(sourceData, request, context) {
        const fuzzedEntities = sourceData.entities.map(entity => {
            const fuzzed = {
                id: (0, uuid_1.v4)(),
                dataSource: 'fuzzed',
                tenantId: request.sandboxId,
            };
            for (const [key, value] of Object.entries(entity)) {
                if (key === 'id' || key === 'tenantId')
                    continue;
                fuzzed[key] = this.fuzzValue(value);
            }
            return fuzzed;
        });
        return {
            entities: fuzzedEntities,
            relationships: sourceData.relationships?.map(rel => ({
                ...rel,
                id: (0, uuid_1.v4)(),
                dataSource: 'fuzzed',
                tenantId: request.sandboxId,
            })),
        };
    }
    /**
     * Store cloned data in sandbox
     */
    async storeClonedData(data, request, context) {
        // In a real implementation, this would:
        // 1. Store data in the appropriate sandbox database
        // 2. Return the location/identifier
        const location = `sandbox://${request.sandboxId}/clones/${context.requestId}`;
        logger.info('Stored cloned data', {
            location,
            entityCount: data.entities.length,
            relationshipCount: data.relationships?.length || 0,
        });
        return location;
    }
    // Helper methods
    async fetchFromNeo4j(request) {
        // Simulated Neo4j fetch
        return {
            entities: [
                { id: '1', name: 'Sample Entity', type: 'Person', createdAt: new Date() },
                { id: '2', name: 'Another Entity', type: 'Organization', createdAt: new Date() },
            ],
            relationships: [
                { id: 'r1', type: 'WORKS_FOR', sourceId: '1', targetId: '2' },
            ],
        };
    }
    async fetchFromPostgres(request) {
        return { entities: [], relationships: [] };
    }
    async fetchFromInvestigation(request) {
        return { entities: [], relationships: [] };
    }
    async fetchFromScenario(request) {
        return { entities: [], relationships: [] };
    }
    generateSyntheticValue(fieldName, originalValue) {
        const fieldLower = fieldName.toLowerCase();
        // Use field name hints for appropriate generators
        if (fieldLower.includes('name')) {
            return `Synthetic_${Math.random().toString(36).substring(7)}`;
        }
        if (fieldLower.includes('email')) {
            return `user_${Math.random().toString(36).substring(7)}@example.com`;
        }
        if (fieldLower.includes('date') || originalValue instanceof Date) {
            return new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
        }
        if (typeof originalValue === 'number') {
            return Math.floor(Math.random() * 1000);
        }
        if (typeof originalValue === 'boolean') {
            return Math.random() > 0.5;
        }
        return `synthetic_${Math.random().toString(36).substring(7)}`;
    }
    generateSyntheticRelationships(originalRels, sandboxId) {
        return originalRels.map(rel => ({
            id: (0, uuid_1.v4)(),
            type: rel.type,
            sourceId: (0, uuid_1.v4)(),
            targetId: (0, uuid_1.v4)(),
            dataSource: 'synthetic',
            tenantId: sandboxId,
        }));
    }
    buildDefaultAnonymizationConfig(sampleEntity, profile) {
        const configs = [];
        const piiFields = ['name', 'email', 'phone', 'address', 'ssn', 'dob'];
        for (const field of Object.keys(sampleEntity)) {
            const fieldLower = field.toLowerCase();
            if (piiFields.some(pii => fieldLower.includes(pii))) {
                configs.push({
                    fieldPath: field,
                    technique: this.mapPiiHandlingToTechnique(profile.dataAccessPolicy.piiHandling),
                    config: {},
                });
            }
        }
        return configs;
    }
    mapPiiHandlingToTechnique(handling) {
        switch (handling) {
            case 'redact':
                return index_js_1.AnonymizationTechnique.REDACTION;
            case 'hash':
                return index_js_1.AnonymizationTechnique.HASHING;
            case 'synthetic':
                return index_js_1.AnonymizationTechnique.PSEUDONYMIZATION;
            default:
                return index_js_1.AnonymizationTechnique.REDACTION;
        }
    }
    fuzzValue(value) {
        if (typeof value === 'string') {
            // Shuffle characters
            return value.split('').sort(() => Math.random() - 0.5).join('');
        }
        if (typeof value === 'number') {
            // Add noise
            return value + (Math.random() - 0.5) * value * 0.2;
        }
        if (value instanceof Date) {
            // Shift by random days
            return new Date(value.getTime() + (Math.random() - 0.5) * 30 * 24 * 60 * 60 * 1000);
        }
        return value;
    }
    randomSample(entities, size) {
        const shuffled = [...entities].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, size);
    }
    stratifiedSample(entities, size) {
        // Group by type field if present
        const groups = new Map();
        for (const entity of entities) {
            const type = String(entity.type || 'default');
            if (!groups.has(type)) {
                groups.set(type, []);
            }
            groups.get(type).push(entity);
        }
        // Sample proportionally from each group
        const result = [];
        const sizePerGroup = Math.floor(size / groups.size);
        for (const groupEntities of groups.values()) {
            result.push(...this.randomSample(groupEntities, sizePerGroup));
        }
        return result.slice(0, size);
    }
    systematicSample(entities, size) {
        const interval = Math.max(1, Math.floor(entities.length / size));
        const result = [];
        for (let i = 0; i < entities.length && result.length < size; i += interval) {
            result.push(entities[i]);
        }
        return result;
    }
    getAnonymizationReport(configs, context) {
        return configs.map(config => ({
            fieldPath: config.fieldPath,
            technique: config.technique,
            recordsAffected: context.clonedRecords,
        }));
    }
}
exports.DataCloneService = DataCloneService;
/**
 * Singleton instance
 */
let cloneServiceInstance = null;
function getDataCloneService() {
    if (!cloneServiceInstance) {
        cloneServiceInstance = new DataCloneService();
    }
    return cloneServiceInstance;
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUILTIN_GENERATORS = exports.DataLabErrorCode = exports.SandboxQueryResultSchema = exports.SandboxQueryRequestSchema = exports.ScenarioSimulationRequestSchema = exports.ScenarioTemplateSchema = exports.SyntheticDataResultSchema = exports.SyntheticDataRequestSchema = exports.SyntheticEntitySchemaDefinition = exports.SyntheticFieldSchema = exports.DataCloneResultSchema = exports.DataCloneRequestSchema = exports.FieldAnonymizationConfigSchema = exports.AnonymizationTechnique = exports.CloneStrategy = exports.DataSourceType = void 0;
const zod_1 = require("zod");
/**
 * DataLab Service Types
 *
 * Types for data lab operations including synthetic data generation,
 * data cloning, anonymization, and scenario simulation.
 */
// ============================================================================
// Data Source Types
// ============================================================================
/**
 * Data source types supported for cloning
 */
var DataSourceType;
(function (DataSourceType) {
    DataSourceType["NEO4J"] = "neo4j";
    DataSourceType["POSTGRESQL"] = "postgresql";
    DataSourceType["INVESTIGATION"] = "investigation";
    DataSourceType["ENTITY_SET"] = "entity_set";
    DataSourceType["SCENARIO"] = "scenario";
})(DataSourceType || (exports.DataSourceType = DataSourceType = {}));
/**
 * Clone strategy for production data
 */
var CloneStrategy;
(function (CloneStrategy) {
    CloneStrategy["STRUCTURE_ONLY"] = "structure_only";
    CloneStrategy["SYNTHETIC"] = "synthetic";
    CloneStrategy["ANONYMIZED"] = "anonymized";
    CloneStrategy["SAMPLED"] = "sampled";
    CloneStrategy["FUZZED"] = "fuzzed";
})(CloneStrategy || (exports.CloneStrategy = CloneStrategy = {}));
/**
 * Anonymization techniques
 */
var AnonymizationTechnique;
(function (AnonymizationTechnique) {
    AnonymizationTechnique["REDACTION"] = "redaction";
    AnonymizationTechnique["HASHING"] = "hashing";
    AnonymizationTechnique["PSEUDONYMIZATION"] = "pseudonymization";
    AnonymizationTechnique["GENERALIZATION"] = "generalization";
    AnonymizationTechnique["MASKING"] = "masking";
    AnonymizationTechnique["NOISE_ADDITION"] = "noise_addition";
    AnonymizationTechnique["K_ANONYMITY"] = "k_anonymity";
    AnonymizationTechnique["DIFFERENTIAL_PRIVACY"] = "differential_privacy";
})(AnonymizationTechnique || (exports.AnonymizationTechnique = AnonymizationTechnique = {}));
// ============================================================================
// Zod Schemas
// ============================================================================
/**
 * Field-level anonymization configuration
 */
exports.FieldAnonymizationConfigSchema = zod_1.z.object({
    fieldPath: zod_1.z.string(),
    technique: zod_1.z.nativeEnum(AnonymizationTechnique),
    config: zod_1.z.object({
        preserveFormat: zod_1.z.boolean().default(false),
        preserveLength: zod_1.z.boolean().default(false),
        kValue: zod_1.z.number().min(2).max(100).optional(), // For k-anonymity
        epsilon: zod_1.z.number().min(0.01).max(10).optional(), // For differential privacy
        hashAlgorithm: zod_1.z.enum(['sha256', 'sha512', 'blake2b']).optional(),
        maskChar: zod_1.z.string().length(1).default('*'),
        maskFromStart: zod_1.z.number().min(0).default(0),
        maskFromEnd: zod_1.z.number().min(0).default(0),
    }).default({}),
});
/**
 * Data clone request
 */
exports.DataCloneRequestSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    sandboxId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().max(500).optional(),
    // Source configuration
    sourceType: zod_1.z.nativeEnum(DataSourceType),
    sourceConfig: zod_1.z.object({
        connectionId: zod_1.z.string().optional(),
        investigationId: zod_1.z.string().optional(),
        entityIds: zod_1.z.array(zod_1.z.string()).optional(),
        cypherQuery: zod_1.z.string().optional(),
        sqlQuery: zod_1.z.string().optional(),
        scenarioId: zod_1.z.string().optional(),
    }),
    // Clone configuration
    strategy: zod_1.z.nativeEnum(CloneStrategy).default(CloneStrategy.SYNTHETIC),
    fieldAnonymization: zod_1.z.array(exports.FieldAnonymizationConfigSchema).default([]),
    sampleSize: zod_1.z.number().min(1).max(100000).optional(),
    sampleMethod: zod_1.z.enum(['random', 'stratified', 'systematic']).default('random'),
    // Output configuration
    outputFormat: zod_1.z.enum(['neo4j', 'json', 'csv', 'parquet']).default('neo4j'),
    includeRelationships: zod_1.z.boolean().default(true),
    preserveGraph: zod_1.z.boolean().default(true), // Maintain graph structure
    // Metadata
    requestedBy: zod_1.z.string(),
    requestedAt: zod_1.z.date().default(() => new Date()),
});
/**
 * Data clone result
 */
exports.DataCloneResultSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    requestId: zod_1.z.string().uuid(),
    sandboxId: zod_1.z.string().uuid(),
    status: zod_1.z.enum(['pending', 'processing', 'completed', 'failed']),
    // Statistics
    statistics: zod_1.z.object({
        sourceRecords: zod_1.z.number(),
        clonedRecords: zod_1.z.number(),
        anonymizedFields: zod_1.z.number(),
        relationshipsCloned: zod_1.z.number(),
        processingTimeMs: zod_1.z.number(),
    }),
    // Audit
    audit: zod_1.z.object({
        anonymizationReport: zod_1.z.array(zod_1.z.object({
            fieldPath: zod_1.z.string(),
            technique: zod_1.z.string(),
            recordsAffected: zod_1.z.number(),
        })),
        validationPassed: zod_1.z.boolean(),
        warnings: zod_1.z.array(zod_1.z.string()),
    }),
    // Output
    outputLocation: zod_1.z.string().optional(),
    outputNodeId: zod_1.z.string().optional(),
    // Timestamps
    startedAt: zod_1.z.date(),
    completedAt: zod_1.z.date().optional(),
    error: zod_1.z.string().optional(),
});
/**
 * Synthetic data schema definition
 */
exports.SyntheticFieldSchema = zod_1.z.object({
    name: zod_1.z.string(),
    type: zod_1.z.enum(['string', 'number', 'boolean', 'date', 'uuid', 'array', 'object']),
    generator: zod_1.z.string(), // Generator function name
    config: zod_1.z.record(zod_1.z.unknown()).default({}),
    nullable: zod_1.z.boolean().default(false),
    nullProbability: zod_1.z.number().min(0).max(1).default(0),
});
/**
 * Entity schema for synthetic generation
 */
exports.SyntheticEntitySchemaDefinition = zod_1.z.object({
    entityType: zod_1.z.string(),
    fields: zod_1.z.array(exports.SyntheticFieldSchema),
    relationshipTypes: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        targetEntityType: zod_1.z.string(),
        direction: zod_1.z.enum(['outgoing', 'incoming', 'both']),
        probability: zod_1.z.number().min(0).max(1).default(0.5),
        minCount: zod_1.z.number().min(0).default(0),
        maxCount: zod_1.z.number().min(0).default(5),
    })).default([]),
});
/**
 * Synthetic data generation request
 */
exports.SyntheticDataRequestSchema = zod_1.z.object({
    sandboxId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(100),
    // Schema definition
    schemas: zod_1.z.array(exports.SyntheticEntitySchemaDefinition),
    // Generation configuration
    config: zod_1.z.object({
        totalEntities: zod_1.z.number().min(1).max(1000000).default(1000),
        entityDistribution: zod_1.z.record(zod_1.z.number()).optional(), // Entity type -> percentage
        seed: zod_1.z.number().optional(), // For reproducibility
        locale: zod_1.z.string().default('en'),
        generateRelationships: zod_1.z.boolean().default(true),
        connectivityDensity: zod_1.z.number().min(0).max(1).default(0.3),
    }),
    // Output
    outputFormat: zod_1.z.enum(['neo4j', 'json', 'csv']).default('neo4j'),
    // Metadata
    requestedBy: zod_1.z.string(),
});
/**
 * Synthetic data generation result
 */
exports.SyntheticDataResultSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    sandboxId: zod_1.z.string().uuid(),
    status: zod_1.z.enum(['pending', 'generating', 'completed', 'failed']),
    // Statistics
    statistics: zod_1.z.object({
        entitiesGenerated: zod_1.z.number(),
        relationshipsGenerated: zod_1.z.number(),
        byEntityType: zod_1.z.record(zod_1.z.number()),
        generationTimeMs: zod_1.z.number(),
    }),
    // Output
    outputLocation: zod_1.z.string().optional(),
    sampleData: zod_1.z.array(zod_1.z.record(zod_1.z.unknown())).optional(),
    // Timestamps
    startedAt: zod_1.z.date(),
    completedAt: zod_1.z.date().optional(),
    error: zod_1.z.string().optional(),
});
/**
 * Scenario template for simulation
 */
exports.ScenarioTemplateSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().max(1000).optional(),
    category: zod_1.z.enum([
        'intelligence_analysis',
        'fraud_detection',
        'network_analysis',
        'entity_resolution',
        'threat_detection',
        'compliance',
        'custom',
    ]),
    // Entity templates
    entityTemplates: zod_1.z.array(zod_1.z.object({
        entityType: zod_1.z.string(),
        count: zod_1.z.number().min(1).max(10000),
        schema: exports.SyntheticEntitySchemaDefinition,
        clusters: zod_1.z.number().min(1).default(1),
    })),
    // Relationship templates
    relationshipTemplates: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        sourceType: zod_1.z.string(),
        targetType: zod_1.z.string(),
        probability: zod_1.z.number().min(0).max(1),
        properties: zod_1.z.array(exports.SyntheticFieldSchema).default([]),
    })),
    // Scenario parameters
    parameters: zod_1.z.record(zod_1.z.object({
        type: zod_1.z.enum(['string', 'number', 'boolean', 'select']),
        label: zod_1.z.string(),
        default: zod_1.z.unknown(),
        options: zod_1.z.array(zod_1.z.string()).optional(),
    })).default({}),
    // Metadata
    createdBy: zod_1.z.string(),
    createdAt: zod_1.z.date(),
    isPublic: zod_1.z.boolean().default(false),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
});
/**
 * Scenario simulation request
 */
exports.ScenarioSimulationRequestSchema = zod_1.z.object({
    sandboxId: zod_1.z.string().uuid(),
    templateId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().max(500).optional(),
    // Parameter overrides
    parameters: zod_1.z.record(zod_1.z.unknown()).default({}),
    // Scale configuration
    scale: zod_1.z.number().min(0.1).max(10).default(1), // Multiplier for entity counts
    // Seed for reproducibility
    seed: zod_1.z.number().optional(),
    // Output
    outputFormat: zod_1.z.enum(['neo4j', 'json']).default('neo4j'),
    // Metadata
    requestedBy: zod_1.z.string(),
});
/**
 * Query execution in sandbox
 */
exports.SandboxQueryRequestSchema = zod_1.z.object({
    sandboxId: zod_1.z.string().uuid(),
    query: zod_1.z.string().min(1).max(10000),
    queryType: zod_1.z.enum(['cypher', 'sql', 'graphql']),
    parameters: zod_1.z.record(zod_1.z.unknown()).default({}),
    timeout: zod_1.z.number().min(1000).max(300000).default(30000),
    limit: zod_1.z.number().min(1).max(10000).default(1000),
    requestedBy: zod_1.z.string(),
});
/**
 * Query result
 */
exports.SandboxQueryResultSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    sandboxId: zod_1.z.string().uuid(),
    status: zod_1.z.enum(['success', 'error', 'timeout']),
    data: zod_1.z.array(zod_1.z.record(zod_1.z.unknown())).optional(),
    rowCount: zod_1.z.number(),
    executionTimeMs: zod_1.z.number(),
    plan: zod_1.z.string().optional(), // Query execution plan
    warnings: zod_1.z.array(zod_1.z.string()).default([]),
    error: zod_1.z.string().optional(),
});
// ============================================================================
// Error Types
// ============================================================================
var DataLabErrorCode;
(function (DataLabErrorCode) {
    DataLabErrorCode["CLONE_FAILED"] = "DATALAB_CLONE_FAILED";
    DataLabErrorCode["GENERATION_FAILED"] = "DATALAB_GENERATION_FAILED";
    DataLabErrorCode["ANONYMIZATION_FAILED"] = "DATALAB_ANONYMIZATION_FAILED";
    DataLabErrorCode["QUERY_FAILED"] = "DATALAB_QUERY_FAILED";
    DataLabErrorCode["SCENARIO_NOT_FOUND"] = "DATALAB_SCENARIO_NOT_FOUND";
    DataLabErrorCode["QUOTA_EXCEEDED"] = "DATALAB_QUOTA_EXCEEDED";
    DataLabErrorCode["VALIDATION_FAILED"] = "DATALAB_VALIDATION_FAILED";
})(DataLabErrorCode || (exports.DataLabErrorCode = DataLabErrorCode = {}));
// ============================================================================
// Generator Types for Faker Integration
// ============================================================================
/**
 * Built-in generator configurations
 */
exports.BUILTIN_GENERATORS = {
    // Person generators
    'person.firstName': { module: 'person', method: 'firstName' },
    'person.lastName': { module: 'person', method: 'lastName' },
    'person.fullName': { module: 'person', method: 'fullName' },
    'person.gender': { module: 'person', method: 'sex' },
    'person.jobTitle': { module: 'person', method: 'jobTitle' },
    // Contact generators
    'internet.email': { module: 'internet', method: 'email' },
    'phone.number': { module: 'phone', method: 'number' },
    // Location generators
    'location.city': { module: 'location', method: 'city' },
    'location.country': { module: 'location', method: 'country' },
    'location.address': { module: 'location', method: 'streetAddress' },
    'location.coordinates': { module: 'location', method: 'nearbyGPSCoordinate' },
    // Organization generators
    'company.name': { module: 'company', method: 'name' },
    'company.industry': { module: 'company', method: 'buzzPhrase' },
    // Finance generators
    'finance.amount': { module: 'finance', method: 'amount' },
    'finance.currency': { module: 'finance', method: 'currencyCode' },
    'finance.accountNumber': { module: 'finance', method: 'accountNumber' },
    // Date generators
    'date.past': { module: 'date', method: 'past' },
    'date.future': { module: 'date', method: 'future' },
    'date.recent': { module: 'date', method: 'recent' },
    // ID generators
    'string.uuid': { module: 'string', method: 'uuid' },
    'string.alphanumeric': { module: 'string', method: 'alphanumeric' },
    // Misc generators
    'lorem.sentence': { module: 'lorem', method: 'sentence' },
    'lorem.paragraph': { module: 'lorem', method: 'paragraph' },
    'number.int': { module: 'number', method: 'int' },
    'number.float': { module: 'number', method: 'float' },
    'datatype.boolean': { module: 'datatype', method: 'boolean' },
};

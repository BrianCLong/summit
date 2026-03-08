"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DigitalTwinSchema = exports.SimulationConfigSchema = exports.DataBindingSchema = exports.TwinStateVectorSchema = exports.TwinMetadataSchema = exports.DataSourceTypeSchema = exports.TwinTypeSchema = exports.TwinStateSchema = void 0;
const zod_1 = require("zod");
// =============================================================================
// Core Digital Twin Types
// =============================================================================
exports.TwinStateSchema = zod_1.z.enum([
    'INITIALIZING',
    'SYNCING',
    'ACTIVE',
    'SIMULATING',
    'DEGRADED',
    'OFFLINE',
]);
exports.TwinTypeSchema = zod_1.z.enum([
    'ENTITY',
    'SYSTEM',
    'PROCESS',
    'NETWORK',
    'ORGANIZATION',
    'INFRASTRUCTURE',
    'COMPOSITE',
]);
exports.DataSourceTypeSchema = zod_1.z.enum([
    'KAFKA_STREAM',
    'REST_API',
    'GRAPHQL',
    'NEO4J',
    'POSTGRES',
    'IOT_SENSOR',
    'FILE_IMPORT',
    'MANUAL',
]);
// =============================================================================
// Twin Definition Schema
// =============================================================================
exports.TwinMetadataSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1),
    type: exports.TwinTypeSchema,
    description: zod_1.z.string().optional(),
    version: zod_1.z.string().default('1.0.0'),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    createdBy: zod_1.z.string(),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    classification: zod_1.z.string().optional(),
});
exports.TwinStateVectorSchema = zod_1.z.object({
    timestamp: zod_1.z.date(),
    confidence: zod_1.z.number().min(0).max(1),
    source: zod_1.z.string(),
    properties: zod_1.z.record(zod_1.z.unknown()),
    derived: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.DataBindingSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    sourceType: exports.DataSourceTypeSchema,
    sourceId: zod_1.z.string(),
    targetProperty: zod_1.z.string(),
    transform: zod_1.z.string().optional(),
    refreshInterval: zod_1.z.number().optional(),
    lastSync: zod_1.z.date().optional(),
});
exports.SimulationConfigSchema = zod_1.z.object({
    engine: zod_1.z.enum(['MONTE_CARLO', 'AGENT_BASED', 'SYSTEM_DYNAMICS', 'HYBRID']),
    timeHorizon: zod_1.z.number(),
    timeStep: zod_1.z.number(),
    iterations: zod_1.z.number().default(1000),
    parameters: zod_1.z.record(zod_1.z.unknown()),
});
exports.DigitalTwinSchema = zod_1.z.object({
    metadata: exports.TwinMetadataSchema,
    state: exports.TwinStateSchema,
    currentStateVector: exports.TwinStateVectorSchema,
    stateHistory: zod_1.z.array(exports.TwinStateVectorSchema).default([]),
    dataBindings: zod_1.z.array(exports.DataBindingSchema).default([]),
    simulationConfig: exports.SimulationConfigSchema.optional(),
    relationships: zod_1.z.array(zod_1.z.object({
        targetTwinId: zod_1.z.string().uuid(),
        type: zod_1.z.string(),
        properties: zod_1.z.record(zod_1.z.unknown()).optional(),
    })).default([]),
    neo4jNodeId: zod_1.z.string().optional(),
    provenanceChain: zod_1.z.array(zod_1.z.string()).default([]),
});

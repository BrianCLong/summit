"use strict";
// @ts-nocheck
/**
 * Agentic Mesh Evaluation - Core Type Definitions
 * Comprehensive type system for distributed multi-agent mesh evaluation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubmitTaskRequestSchema = exports.StartEvaluationRequestSchema = exports.CreateMeshRequestSchema = exports.MeshNodeSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// Zod Schemas for Validation
// ============================================================================
exports.MeshNodeSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    agentId: zod_1.z.string(),
    role: zod_1.z.enum([
        'coordinator',
        'worker',
        'specialist',
        'monitor',
        'validator',
        'optimizer',
        'fallback',
    ]),
    status: zod_1.z.enum([
        'initializing',
        'ready',
        'busy',
        'idle',
        'degraded',
        'failed',
        'offline',
    ]),
    capabilities: zod_1.z.array(zod_1.z.string()),
    specializations: zod_1.z.array(zod_1.z.string()),
    maxConcurrentTasks: zod_1.z.number().int().positive(),
    endpoint: zod_1.z.string().url(),
    protocol: zod_1.z.array(zod_1.z.string()),
    neighbors: zod_1.z.array(zod_1.z.string()),
});
exports.CreateMeshRequestSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().optional(),
    topology: zod_1.z.enum([
        'peer-to-peer',
        'hierarchical',
        'hybrid',
        'star',
        'ring',
        'grid',
        'custom',
    ]),
    nodes: zod_1.z.array(exports.MeshNodeSchema).min(2),
    config: zod_1.z.object({
        maxHops: zod_1.z.number().int().positive().default(10),
        messageTTL: zod_1.z.number().int().positive().default(300),
        timeoutMs: zod_1.z.number().int().positive().default(30000),
        loadBalancingStrategy: zod_1.z
            .enum([
            'round-robin',
            'least-loaded',
            'random',
            'weighted',
            'consistent-hashing',
            'capability-based',
        ])
            .default('least-loaded'),
        enableFailover: zod_1.z.boolean().default(true),
        redundancyFactor: zod_1.z.number().int().min(1).max(5).default(2),
    }),
    tenantId: zod_1.z.string(),
    projectId: zod_1.z.string().optional(),
});
exports.StartEvaluationRequestSchema = zod_1.z.object({
    meshId: zod_1.z.string(),
    scenario: zod_1.z.enum([
        'performance-baseline',
        'load-testing',
        'stress-testing',
        'fault-injection',
        'chaos-engineering',
        'scalability-testing',
        'security-testing',
        'compliance-testing',
        'optimization',
        'custom',
    ]),
    scenarioParams: zod_1.z.record(zod_1.z.unknown()).default({}),
    baselineId: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
});
exports.SubmitTaskRequestSchema = zod_1.z.object({
    meshId: zod_1.z.string(),
    type: zod_1.z.string(),
    name: zod_1.z.string(),
    payload: zod_1.z.record(zod_1.z.unknown()),
    targetNodes: zod_1.z.array(zod_1.z.string()).optional(),
    routingStrategy: zod_1.z
        .enum([
        'random',
        'round-robin',
        'least-loaded',
        'capability-match',
        'locality',
        'broadcast',
        'multicast',
        'custom',
    ])
        .default('least-loaded'),
    priority: zod_1.z.number().int().min(0).max(100).default(50),
});

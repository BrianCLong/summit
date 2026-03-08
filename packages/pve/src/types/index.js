"use strict";
/**
 * PVE Type Definitions
 *
 * Core types for the Policy Validation Engine.
 *
 * @module pve/types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvaluationContextSchema = exports.PolicyResultSchema = void 0;
const zod_1 = require("zod");
// -----------------------------------------------------------------------------
// Validation Schemas
// -----------------------------------------------------------------------------
exports.PolicyResultSchema = zod_1.z.object({
    policy: zod_1.z.string(),
    allowed: zod_1.z.boolean(),
    severity: zod_1.z.enum(['error', 'warning', 'info']).optional(),
    message: zod_1.z.string().optional(),
    details: zod_1.z
        .object({
        rule: zod_1.z.string().optional(),
        expected: zod_1.z.unknown().optional(),
        actual: zod_1.z.unknown().optional(),
        context: zod_1.z.record(zod_1.z.unknown()).optional(),
    })
        .optional(),
    fix: zod_1.z.string().optional(),
    location: zod_1.z
        .object({
        file: zod_1.z.string().optional(),
        line: zod_1.z.number().optional(),
        column: zod_1.z.number().optional(),
        field: zod_1.z.string().optional(),
    })
        .optional(),
});
exports.EvaluationContextSchema = zod_1.z.object({
    type: zod_1.z.enum([
        'pr_diff',
        'schema_drift',
        'metadata_invariant',
        'agent_output',
        'ci_integrity',
        'tsconfig_integrity',
        'api_surface',
        'dependency_audit',
        'security_scan',
        'custom',
    ]),
    input: zod_1.z.unknown(),
    metadata: zod_1.z
        .object({
        repo: zod_1.z
            .object({
            owner: zod_1.z.string(),
            name: zod_1.z.string(),
            defaultBranch: zod_1.z.string().optional(),
            visibility: zod_1.z.enum(['public', 'private', 'internal']).optional(),
        })
            .optional(),
        actor: zod_1.z
            .object({
            id: zod_1.z.string(),
            type: zod_1.z.enum(['user', 'bot', 'agent']),
            name: zod_1.z.string().optional(),
        })
            .optional(),
        timestamp: zod_1.z.string().optional(),
        correlationId: zod_1.z.string().optional(),
        environment: zod_1.z.string().optional(),
    })
        .optional(),
});

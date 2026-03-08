"use strict";
/**
 * Multi-LLM Orchestrator Types
 *
 * Core type definitions for the resilient multi-LLM orchestrator
 * with governance gates and hallucination scoring.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChainConfigSchema = exports.GovernanceGateSchema = exports.LLMRequestSchema = exports.LLMMessageSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================
exports.LLMMessageSchema = zod_1.z.object({
    role: zod_1.z.enum(['system', 'user', 'assistant', 'tool']),
    content: zod_1.z.string(),
    name: zod_1.z.string().optional(),
    toolCalls: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        type: zod_1.z.literal('function'),
        function: zod_1.z.object({
            name: zod_1.z.string(),
            arguments: zod_1.z.string(),
        }),
    })).optional(),
    toolCallId: zod_1.z.string().optional(),
});
exports.LLMRequestSchema = zod_1.z.object({
    messages: zod_1.z.array(exports.LLMMessageSchema),
    model: zod_1.z.string().optional(),
    temperature: zod_1.z.number().min(0).max(2).optional(),
    maxTokens: zod_1.z.number().positive().optional(),
    stream: zod_1.z.boolean().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.GovernanceGateSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    type: zod_1.z.enum([
        'content-filter',
        'pii-detection',
        'toxicity-check',
        'prompt-injection',
        'rate-limit',
        'budget-limit',
        'data-residency',
        'classification-level',
        'custom',
    ]),
    enabled: zod_1.z.boolean(),
    action: zod_1.z.enum(['block', 'warn', 'log', 'redact']),
});
exports.ChainConfigSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    strategy: zod_1.z.enum(['sequential', 'parallel', 'fallback', 'consensus']),
    timeout: zod_1.z.number().positive(),
    maxRetries: zod_1.z.number().nonnegative(),
});

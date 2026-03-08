"use strict";
/**
 * ChatOps Core Type Definitions
 *
 * This file defines all interfaces for the Summit ChatOps system including:
 * - Multi-model intent routing
 * - Hierarchical memory system
 * - Bounded autonomy engine
 * - Platform adapters (Slack, Teams, Web)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatMessageSchema = exports.ToolOperationSchema = exports.ConversationTurnSchema = exports.OSINTEntitySchema = void 0;
const zod_1 = require("zod");
// =============================================================================
// ZOD SCHEMAS FOR VALIDATION
// =============================================================================
exports.OSINTEntitySchema = zod_1.z.object({
    type: zod_1.z.enum([
        'THREAT_ACTOR',
        'INFRASTRUCTURE',
        'MALWARE',
        'CAMPAIGN',
        'TTP',
        'INDICATOR',
        'VULNERABILITY',
        'NARRATIVE',
    ]),
    value: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1),
    source: zod_1.z.string(),
    linkedGraphId: zod_1.z.string().optional(),
    mitreId: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.ConversationTurnSchema = zod_1.z.object({
    turnId: zod_1.z.string().uuid(),
    sessionId: zod_1.z.string().uuid(),
    userId: zod_1.z.string(),
    tenantId: zod_1.z.string(),
    role: zod_1.z.enum(['user', 'assistant', 'system']),
    content: zod_1.z.string(),
    timestamp: zod_1.z.date(),
    tokenCount: zod_1.z.number().int().positive(),
    metadata: zod_1.z
        .object({
        intent: zod_1.z.string().optional(),
        entities: zod_1.z.array(exports.OSINTEntitySchema).optional(),
        investigationId: zod_1.z.string().optional(),
    })
        .optional(),
});
exports.ToolOperationSchema = zod_1.z.object({
    toolId: zod_1.z.string(),
    operation: zod_1.z.string(),
    input: zod_1.z.record(zod_1.z.unknown()),
    riskOverride: zod_1.z.enum(['autonomous', 'hitl', 'prohibited']).optional(),
});
exports.ChatMessageSchema = zod_1.z.object({
    messageId: zod_1.z.string(),
    platform: zod_1.z.enum(['slack', 'teams', 'web']),
    channelId: zod_1.z.string(),
    threadId: zod_1.z.string().optional(),
    userId: zod_1.z.string(),
    content: zod_1.z.string(),
    timestamp: zod_1.z.date(),
    metadata: zod_1.z
        .object({
        tenantId: zod_1.z.string().optional(),
        investigationId: zod_1.z.string().optional(),
        mentions: zod_1.z.array(zod_1.z.string()).optional(),
    })
        .optional(),
});

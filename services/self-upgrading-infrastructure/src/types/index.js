"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpgradeRequestSchema = exports.UpgradeStatusSchema = exports.UpgradeComponentSchema = exports.RegulatoryChangeSchema = exports.CompetitiveThreatSchema = exports.MarketTrendSchema = void 0;
const zod_1 = require("zod");
// Market Trend Types
exports.MarketTrendSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    category: zod_1.z.enum(['technology', 'security', 'ux', 'performance', 'compliance']),
    signal: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1),
    impact: zod_1.z.enum(['low', 'medium', 'high', 'critical']),
    source: zod_1.z.string(),
    detectedAt: zod_1.z.date(),
    actionable: zod_1.z.boolean(),
    recommendedActions: zod_1.z.array(zod_1.z.string()),
});
// Competitive Threat Types
exports.CompetitiveThreatSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    competitor: zod_1.z.string(),
    threatType: zod_1.z.enum(['feature_gap', 'performance_lag', 'security_weakness', 'ux_deficit']),
    severity: zod_1.z.enum(['low', 'medium', 'high', 'critical']),
    description: zod_1.z.string(),
    detectedAt: zod_1.z.date(),
    responseDeadline: zod_1.z.date().optional(),
    mitigationStrategy: zod_1.z.string().optional(),
});
// Regulatory Change Types
exports.RegulatoryChangeSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    regulation: zod_1.z.string(),
    jurisdiction: zod_1.z.string(),
    changeType: zod_1.z.enum(['new', 'amendment', 'repeal', 'guidance']),
    effectiveDate: zod_1.z.date(),
    complianceDeadline: zod_1.z.date(),
    impact: zod_1.z.enum(['minimal', 'moderate', 'significant', 'transformational']),
    affectedComponents: zod_1.z.array(zod_1.z.string()),
    requiredActions: zod_1.z.array(zod_1.z.string()),
});
// Upgrade Types
exports.UpgradeComponentSchema = zod_1.z.enum([
    'algorithm',
    'security',
    'ux',
    'infrastructure',
    'database',
    'api',
    'monitoring',
]);
exports.UpgradeStatusSchema = zod_1.z.enum([
    'pending',
    'analyzing',
    'approved',
    'in_progress',
    'validating',
    'completed',
    'rolled_back',
    'failed',
]);
exports.UpgradeRequestSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    component: exports.UpgradeComponentSchema,
    currentVersion: zod_1.z.string(),
    targetVersion: zod_1.z.string(),
    trigger: zod_1.z.enum(['market_trend', 'competitive_threat', 'regulatory_change', 'scheduled', 'manual']),
    triggerId: zod_1.z.string().optional(),
    priority: zod_1.z.enum(['low', 'medium', 'high', 'critical']),
    status: exports.UpgradeStatusSchema,
    createdAt: zod_1.z.date(),
    scheduledAt: zod_1.z.date().optional(),
    startedAt: zod_1.z.date().optional(),
    completedAt: zod_1.z.date().optional(),
    rollbackAvailable: zod_1.z.boolean(),
    validationResults: zod_1.z.record(zod_1.z.boolean()).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});

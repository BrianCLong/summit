"use strict";
/**
 * Strategic Framework - Core Type Definitions
 *
 * Comprehensive type system for strategic planning, analysis,
 * decision support, and monitoring capabilities.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateAnalysisInputSchema = exports.CreateDecisionInputSchema = exports.CreateInitiativeInputSchema = exports.CreateObjectiveInputSchema = exports.UpdateGoalInputSchema = exports.CreateGoalInputSchema = exports.MetricType = exports.RiskCategory = exports.ImpactLevel = exports.DecisionType = exports.AnalysisType = exports.TimeHorizon = exports.StrategicStatus = exports.StrategicPriority = void 0;
const zod_1 = require("zod");
// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================
exports.StrategicPriority = {
    CRITICAL: 'CRITICAL',
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    LOW: 'LOW',
};
exports.StrategicStatus = {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    ON_HOLD: 'ON_HOLD',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    AT_RISK: 'AT_RISK',
};
exports.TimeHorizon = {
    IMMEDIATE: 'IMMEDIATE', // 0-3 months
    SHORT_TERM: 'SHORT_TERM', // 3-12 months
    MEDIUM_TERM: 'MEDIUM_TERM', // 1-3 years
    LONG_TERM: 'LONG_TERM', // 3-5 years
    STRATEGIC: 'STRATEGIC', // 5+ years
};
exports.AnalysisType = {
    SWOT: 'SWOT',
    PESTLE: 'PESTLE',
    PORTER_FIVE_FORCES: 'PORTER_FIVE_FORCES',
    GAP_ANALYSIS: 'GAP_ANALYSIS',
    SCENARIO_PLANNING: 'SCENARIO_PLANNING',
    RISK_ASSESSMENT: 'RISK_ASSESSMENT',
    CAPABILITY_ASSESSMENT: 'CAPABILITY_ASSESSMENT',
    COMPETITIVE_ANALYSIS: 'COMPETITIVE_ANALYSIS',
};
exports.DecisionType = {
    STRATEGIC: 'STRATEGIC',
    TACTICAL: 'TACTICAL',
    OPERATIONAL: 'OPERATIONAL',
    RESOURCE_ALLOCATION: 'RESOURCE_ALLOCATION',
    RISK_MITIGATION: 'RISK_MITIGATION',
    INVESTMENT: 'INVESTMENT',
    PARTNERSHIP: 'PARTNERSHIP',
    MARKET_ENTRY: 'MARKET_ENTRY',
};
exports.ImpactLevel = {
    TRANSFORMATIONAL: 'TRANSFORMATIONAL',
    SIGNIFICANT: 'SIGNIFICANT',
    MODERATE: 'MODERATE',
    MINOR: 'MINOR',
    NEGLIGIBLE: 'NEGLIGIBLE',
};
exports.RiskCategory = {
    STRATEGIC: 'STRATEGIC',
    OPERATIONAL: 'OPERATIONAL',
    FINANCIAL: 'FINANCIAL',
    COMPLIANCE: 'COMPLIANCE',
    REPUTATIONAL: 'REPUTATIONAL',
    TECHNOLOGICAL: 'TECHNOLOGICAL',
    MARKET: 'MARKET',
    GEOPOLITICAL: 'GEOPOLITICAL',
};
exports.MetricType = {
    KPI: 'KPI',
    OKR: 'OKR',
    LEADING_INDICATOR: 'LEADING_INDICATOR',
    LAGGING_INDICATOR: 'LAGGING_INDICATOR',
    HEALTH_METRIC: 'HEALTH_METRIC',
    EFFICIENCY_METRIC: 'EFFICIENCY_METRIC',
};
// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================
exports.CreateGoalInputSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().min(1).max(2000),
    vision: zod_1.z.string().max(1000).optional(),
    missionAlignment: zod_1.z.string().max(1000).optional(),
    priority: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    timeHorizon: zod_1.z.enum(['IMMEDIATE', 'SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM', 'STRATEGIC']),
    startDate: zod_1.z.coerce.date(),
    targetDate: zod_1.z.coerce.date(),
    owner: zod_1.z.string().min(1),
    stakeholders: zod_1.z.array(zod_1.z.string()).optional().default([]),
    tags: zod_1.z.array(zod_1.z.string()).optional().default([]),
    labels: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional().default({}),
    notes: zod_1.z.string().max(5000).optional().default(''),
});
exports.UpdateGoalInputSchema = exports.CreateGoalInputSchema.partial().extend({
    id: zod_1.z.string().uuid(),
    status: zod_1.z.enum(['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'AT_RISK']).optional(),
});
exports.CreateObjectiveInputSchema = zod_1.z.object({
    goalId: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().min(1).max(2000),
    priority: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    owner: zod_1.z.string().min(1),
    contributors: zod_1.z.array(zod_1.z.string()).optional().default([]),
    startDate: zod_1.z.coerce.date(),
    targetDate: zod_1.z.coerce.date(),
    alignedCapabilities: zod_1.z.array(zod_1.z.string()).optional().default([]),
    measurementCriteria: zod_1.z.string().max(1000).optional().default(''),
});
exports.CreateInitiativeInputSchema = zod_1.z.object({
    objectiveId: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().min(1).max(2000),
    rationale: zod_1.z.string().max(2000).optional().default(''),
    priority: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    owner: zod_1.z.string().min(1),
    team: zod_1.z.array(zod_1.z.string()).optional().default([]),
    startDate: zod_1.z.coerce.date(),
    targetDate: zod_1.z.coerce.date(),
    budget: zod_1.z.object({
        total: zod_1.z.number().min(0),
        currency: zod_1.z.string().default('USD'),
    }).optional(),
    effortEstimate: zod_1.z.number().min(0).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional().default([]),
    labels: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional().default({}),
});
exports.CreateDecisionInputSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().min(1).max(2000),
    type: zod_1.z.enum(['STRATEGIC', 'TACTICAL', 'OPERATIONAL', 'RESOURCE_ALLOCATION', 'RISK_MITIGATION', 'INVESTMENT', 'PARTNERSHIP', 'MARKET_ENTRY']),
    context: zod_1.z.string().max(5000).optional().default(''),
    urgency: zod_1.z.enum(['IMMEDIATE', 'URGENT', 'NORMAL', 'LOW']),
    importance: zod_1.z.enum(['TRANSFORMATIONAL', 'SIGNIFICANT', 'MODERATE', 'MINOR', 'NEGLIGIBLE']),
    decisionMaker: zod_1.z.string().min(1),
    stakeholders: zod_1.z.array(zod_1.z.string()).optional().default([]),
    deadline: zod_1.z.coerce.date(),
    linkedGoals: zod_1.z.array(zod_1.z.string()).optional().default([]),
    linkedAnalyses: zod_1.z.array(zod_1.z.string()).optional().default([]),
});
exports.CreateAnalysisInputSchema = zod_1.z.object({
    type: zod_1.z.enum(['SWOT', 'PESTLE', 'PORTER_FIVE_FORCES', 'GAP_ANALYSIS', 'SCENARIO_PLANNING', 'RISK_ASSESSMENT', 'CAPABILITY_ASSESSMENT', 'COMPETITIVE_ANALYSIS']),
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().min(1).max(2000),
    scope: zod_1.z.string().max(2000).optional().default(''),
    context: zod_1.z.string().max(5000).optional().default(''),
    timeHorizon: zod_1.z.enum(['IMMEDIATE', 'SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM', 'STRATEGIC']),
    analyst: zod_1.z.string().min(1),
    reviewers: zod_1.z.array(zod_1.z.string()).optional().default([]),
    linkedGoals: zod_1.z.array(zod_1.z.string()).optional().default([]),
});

"use strict";
/**
 * Summit Work Graph - Node Types
 *
 * Graph-native work management where Linear/Jira tickets are
 * "thin projections" over a richer decision graph.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkGraphNodeSchema = exports.EvidenceBundleSchema = exports.FindingsSchema = exports.ChangeSchema = exports.MilestoneSchema = exports.SuccessCriterionSchema = exports.RoadmapSchema = exports.SwimlaneSchema = exports.TimeframeSchema = exports.BoardSchema = exports.BoardColumnSchema = exports.SprintSchema = exports.PolicySchema = exports.EnvironmentSchema = exports.AgentSchema = exports.CustomerSchema = exports.IncidentSchema = exports.ScanSchema = exports.TestSchema = exports.PRSchema = exports.TicketSchema = exports.EpicSchema = exports.HypothesisSchema = exports.CommitmentSchema = exports.IntentSchema = exports.BaseNodeSchema = void 0;
const zod_1 = require("zod");
// ============================================
// Base Node Schema
// ============================================
exports.BaseNodeSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: zod_1.z.string(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    createdBy: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
// ============================================
// Intent Node
// ============================================
exports.IntentSchema = exports.BaseNodeSchema.extend({
    type: zod_1.z.literal('intent'),
    title: zod_1.z.string().min(1),
    description: zod_1.z.string(),
    source: zod_1.z.enum(['customer', 'internal', 'market', 'regulation']),
    customer: zod_1.z.string().optional(),
    priority: zod_1.z.enum(['P0', 'P1', 'P2', 'P3']),
    status: zod_1.z.enum(['captured', 'validated', 'planned', 'delivered', 'rejected']),
    evidence: zod_1.z.array(zod_1.z.string()).default([]),
    targetDate: zod_1.z.date().optional(),
    valueScore: zod_1.z.number().min(0).max(100).optional(),
});
// ============================================
// Commitment Node
// ============================================
exports.CommitmentSchema = exports.BaseNodeSchema.extend({
    type: zod_1.z.literal('commitment'),
    title: zod_1.z.string().min(1),
    description: zod_1.z.string(),
    customer: zod_1.z.string(),
    promisedTo: zod_1.z.string().optional(),
    dueDate: zod_1.z.date(),
    status: zod_1.z.enum(['active', 'at_risk', 'delivered', 'broken']),
    confidence: zod_1.z.number().min(0).max(100),
    contractualSLA: zod_1.z.boolean().default(false),
    escalationPath: zod_1.z.array(zod_1.z.string()).default([]),
    linkedIntents: zod_1.z.array(zod_1.z.string()).default([]),
});
// ============================================
// Hypothesis Node
// ============================================
exports.HypothesisSchema = exports.BaseNodeSchema.extend({
    type: zod_1.z.literal('hypothesis'),
    statement: zod_1.z.string().min(1),
    status: zod_1.z.enum(['proposed', 'testing', 'validated', 'invalidated']),
    confidence: zod_1.z.number().min(0).max(100),
    evidence: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum(['metric', 'user_feedback', 'experiment', 'observation']),
        description: zod_1.z.string(),
        support: zod_1.z.enum(['for', 'against', 'neutral']),
        weight: zod_1.z.number().min(0).max(1),
    })),
    testPlan: zod_1.z.string().optional(),
    outcome: zod_1.z.string().optional(),
});
// ============================================
// Epic Node
// ============================================
exports.EpicSchema = exports.BaseNodeSchema.extend({
    type: zod_1.z.literal('epic'),
    title: zod_1.z.string().min(1),
    description: zod_1.z.string(),
    status: zod_1.z.enum(['draft', 'planned', 'in_progress', 'completed', 'cancelled']),
    owner: zod_1.z.string().optional(),
    targetQuarter: zod_1.z.string().optional(),
    progress: zod_1.z.number().min(0).max(100).default(0),
    linearId: zod_1.z.string().optional(),
    jiraKey: zod_1.z.string().optional(),
});
// ============================================
// Ticket Node
// ============================================
exports.TicketSchema = exports.BaseNodeSchema.extend({
    type: zod_1.z.literal('ticket'),
    title: zod_1.z.string().min(1),
    description: zod_1.z.string(),
    status: zod_1.z.enum(['backlog', 'ready', 'in_progress', 'review', 'done', 'blocked']),
    priority: zod_1.z.enum(['P0', 'P1', 'P2', 'P3']),
    ticketType: zod_1.z.enum(['bug', 'feature', 'chore', 'refactor', 'docs', 'test', 'unknown']).default('unknown'),
    estimate: zod_1.z.number().optional(),
    assignee: zod_1.z.string().optional(),
    assigneeType: zod_1.z.enum(['human', 'agent']).optional(),
    labels: zod_1.z.array(zod_1.z.string()).default([]),
    dueDate: zod_1.z.date().optional(),
    linearId: zod_1.z.string().optional(),
    jiraKey: zod_1.z.string().optional(),
    cycleId: zod_1.z.string().optional(),
    sprintId: zod_1.z.string().optional(),
    agentEligible: zod_1.z.boolean().default(false),
    complexity: zod_1.z.enum(['trivial', 'simple', 'medium', 'complex', 'unknown']).default('unknown'),
    area: zod_1.z.string().optional(),
    blockedReason: zod_1.z.string().optional(),
    completedAt: zod_1.z.date().optional(),
});
// ============================================
// PR Node
// ============================================
exports.PRSchema = exports.BaseNodeSchema.extend({
    type: zod_1.z.literal('pr'),
    title: zod_1.z.string().min(1),
    description: zod_1.z.string(),
    url: zod_1.z.string().url(),
    number: zod_1.z.number(),
    author: zod_1.z.string(),
    authorType: zod_1.z.enum(['human', 'agent']),
    status: zod_1.z.enum(['draft', 'open', 'merged', 'closed']),
    checksStatus: zod_1.z.enum(['pending', 'passing', 'failing']),
    reviewers: zod_1.z.array(zod_1.z.string()).default([]),
    additions: zod_1.z.number().default(0),
    deletions: zod_1.z.number().default(0),
    filesChanged: zod_1.z.number().default(0),
    branch: zod_1.z.string(),
    mergedAt: zod_1.z.date().optional(),
});
// ============================================
// Test Node
// ============================================
exports.TestSchema = exports.BaseNodeSchema.extend({
    type: zod_1.z.literal('test'),
    name: zod_1.z.string().min(1),
    suite: zod_1.z.string(),
    status: zod_1.z.enum(['pending', 'running', 'passed', 'failed', 'skipped', 'flaky']),
    lastRun: zod_1.z.date().optional(),
    duration: zod_1.z.number().optional(),
    coverage: zod_1.z.number().min(0).max(100).optional(),
    failureReason: zod_1.z.string().optional(),
    flakyRate: zod_1.z.number().min(0).max(100).optional(),
});
// ============================================
// Scan Node (Security/Quality)
// ============================================
exports.ScanSchema = exports.BaseNodeSchema.extend({
    type: zod_1.z.literal('scan'),
    scanType: zod_1.z.enum(['sast', 'dast', 'dependency', 'secret', 'license', 'quality']),
    status: zod_1.z.enum(['pending', 'running', 'completed', 'failed']),
    findings: zod_1.z.array(zod_1.z.object({
        severity: zod_1.z.enum(['critical', 'high', 'medium', 'low', 'info']),
        title: zod_1.z.string(),
        description: zod_1.z.string(),
        location: zod_1.z.string().optional(),
        cwe: zod_1.z.string().optional(),
        remediation: zod_1.z.string().optional(),
    })),
    criticalCount: zod_1.z.number().default(0),
    highCount: zod_1.z.number().default(0),
    mediumCount: zod_1.z.number().default(0),
    lowCount: zod_1.z.number().default(0),
    completedAt: zod_1.z.date().optional(),
});
// ============================================
// Incident Node
// ============================================
exports.IncidentSchema = exports.BaseNodeSchema.extend({
    type: zod_1.z.literal('incident'),
    title: zod_1.z.string().min(1),
    description: zod_1.z.string(),
    severity: zod_1.z.enum(['SEV1', 'SEV2', 'SEV3', 'SEV4']),
    status: zod_1.z.enum(['detected', 'acknowledged', 'investigating', 'mitigated', 'resolved', 'postmortem']),
    detectedAt: zod_1.z.date(),
    acknowledgedAt: zod_1.z.date().optional(),
    mitigatedAt: zod_1.z.date().optional(),
    resolvedAt: zod_1.z.date().optional(),
    impactedServices: zod_1.z.array(zod_1.z.string()).default([]),
    impactedCustomers: zod_1.z.array(zod_1.z.string()).default([]),
    oncall: zod_1.z.string().optional(),
    rootCause: zod_1.z.string().optional(),
    postmortemUrl: zod_1.z.string().optional(),
    ttd: zod_1.z.number().optional(), // Time to detect (minutes)
    ttm: zod_1.z.number().optional(), // Time to mitigate (minutes)
    ttr: zod_1.z.number().optional(), // Time to resolve (minutes)
});
// ============================================
// Customer Node
// ============================================
exports.CustomerSchema = exports.BaseNodeSchema.extend({
    type: zod_1.z.literal('customer'),
    name: zod_1.z.string().min(1),
    tier: zod_1.z.enum(['enterprise', 'business', 'startup', 'free']),
    arr: zod_1.z.number().optional(),
    healthScore: zod_1.z.number().min(0).max(100).optional(),
    csm: zod_1.z.string().optional(),
    renewalDate: zod_1.z.date().optional(),
    contracts: zod_1.z.array(zod_1.z.string()).default([]),
});
// ============================================
// Agent Node
// ============================================
exports.AgentSchema = exports.BaseNodeSchema.extend({
    type: zod_1.z.literal('agent'),
    name: zod_1.z.string().min(1),
    agentType: zod_1.z.enum(['coding', 'testing', 'security', 'docs', 'review', 'triage', 'planning']),
    status: zod_1.z.enum(['available', 'busy', 'offline', 'error']),
    capabilities: zod_1.z.array(zod_1.z.string()).default([]),
    currentTask: zod_1.z.string().optional(),
    currentLoad: zod_1.z.number().default(0),
    capacityUnits: zod_1.z.number().default(10),
    completedTasks: zod_1.z.number().default(0),
    successRate: zod_1.z.number().min(0).max(100).default(100),
    qualityScore: zod_1.z.number().min(0).max(100).default(80),
    averageCompletionTime: zod_1.z.number().optional(),
    reputation: zod_1.z.number().min(0).max(100).default(50),
    lastActive: zod_1.z.date().optional(),
    model: zod_1.z.string().optional(),
    version: zod_1.z.string().optional(),
});
// ============================================
// Environment Node
// ============================================
exports.EnvironmentSchema = exports.BaseNodeSchema.extend({
    type: zod_1.z.literal('environment'),
    name: zod_1.z.enum(['dev', 'staging', 'production', 'canary']),
    version: zod_1.z.string(),
    deployedAt: zod_1.z.date(),
    health: zod_1.z.enum(['healthy', 'degraded', 'unhealthy', 'unknown']),
    url: zod_1.z.string().optional(),
    region: zod_1.z.string().optional(),
    metrics: zod_1.z
        .object({
        cpu: zod_1.z.number().optional(),
        memory: zod_1.z.number().optional(),
        latencyP50: zod_1.z.number().optional(),
        latencyP99: zod_1.z.number().optional(),
        errorRate: zod_1.z.number().optional(),
    })
        .optional(),
});
// ============================================
// Policy Node
// ============================================
exports.PolicySchema = exports.BaseNodeSchema.extend({
    type: zod_1.z.literal('policy'),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string(),
    policyType: zod_1.z.enum(['security', 'quality', 'compliance', 'operational', 'governance']),
    status: zod_1.z.enum(['draft', 'active', 'deprecated']),
    scope: zod_1.z.array(zod_1.z.enum(['pr', 'ticket', 'deployment', 'incident', 'all'])),
    conditions: zod_1.z.array(zod_1.z.object({
        field: zod_1.z.string(),
        operator: zod_1.z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'matches']),
        value: zod_1.z.unknown().optional(),
    })),
    actions: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum(['block', 'warn', 'notify', 'require_approval', 'auto_fix']),
        message: zod_1.z.string(),
        target: zod_1.z.string().optional(),
    })),
    exceptions: zod_1.z.array(zod_1.z.string()).default([]),
    owner: zod_1.z.string().optional(),
    enforcementLevel: zod_1.z.enum(['advisory', 'soft', 'hard']).default('soft'),
});
// ============================================
// Sprint/Cycle Node
// ============================================
exports.SprintSchema = exports.BaseNodeSchema.extend({
    type: zod_1.z.literal('sprint'),
    name: zod_1.z.string().min(1),
    number: zod_1.z.number(),
    status: zod_1.z.enum(['planning', 'active', 'completed', 'cancelled']),
    startDate: zod_1.z.date(),
    endDate: zod_1.z.date(),
    goal: zod_1.z.string().optional(),
    capacity: zod_1.z.number().optional(),
    committed: zod_1.z.number().default(0),
    completed: zod_1.z.number().default(0),
    velocity: zod_1.z.number().optional(),
    team: zod_1.z.string().optional(),
});
// ============================================
// Board Node
// ============================================
exports.BoardColumnSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    position: zod_1.z.number(),
    wipLimit: zod_1.z.number().optional(),
    color: zod_1.z.string().optional(),
});
exports.BoardSchema = exports.BaseNodeSchema.extend({
    type: zod_1.z.literal('board'),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    boardType: zod_1.z.enum(['kanban', 'scrum', 'custom']),
    columns: zod_1.z.array(exports.BoardColumnSchema).default([]),
    owner: zod_1.z.string().optional(),
    team: zod_1.z.string().optional(),
    isDefault: zod_1.z.boolean().default(false),
    archived: zod_1.z.boolean().default(false),
    itemCount: zod_1.z.number().default(0),
});
// ============================================
// Roadmap Node
// ============================================
exports.TimeframeSchema = zod_1.z.object({
    start: zod_1.z.date(),
    end: zod_1.z.date(),
    granularity: zod_1.z.enum(['day', 'week', 'month', 'quarter', 'year']),
});
exports.SwimlaneSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    color: zod_1.z.string().optional(),
    position: zod_1.z.number(),
});
exports.RoadmapSchema = exports.BaseNodeSchema.extend({
    type: zod_1.z.literal('roadmap'),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    timeframe: exports.TimeframeSchema,
    swimlanes: zod_1.z.array(exports.SwimlaneSchema).default([]),
    status: zod_1.z.enum(['draft', 'active', 'archived']),
    owner: zod_1.z.string().optional(),
    team: zod_1.z.string().optional(),
    visibility: zod_1.z.enum(['private', 'team', 'public']).default('team'),
});
// ============================================
// Milestone Node
// ============================================
exports.SuccessCriterionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    description: zod_1.z.string(),
    met: zod_1.z.boolean().default(false),
});
exports.MilestoneSchema = exports.BaseNodeSchema.extend({
    type: zod_1.z.literal('milestone'),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    targetDate: zod_1.z.date(),
    milestoneType: zod_1.z.enum(['release', 'checkpoint', 'deadline', 'event']),
    status: zod_1.z.enum(['planned', 'on_track', 'at_risk', 'achieved', 'missed']),
    progress: zod_1.z.number().min(0).max(100).default(0),
    successCriteria: zod_1.z.array(exports.SuccessCriterionSchema).default([]),
    owner: zod_1.z.string().optional(),
    stakeholders: zod_1.z.array(zod_1.z.string()).default([]),
    linkedRoadmapId: zod_1.z.string().optional(),
    color: zod_1.z.string().optional(),
});
// ============================================
// Change Node
// ============================================
exports.ChangeSchema = exports.BaseNodeSchema.extend({
    type: zod_1.z.literal('change'),
    status: zod_1.z.enum(['draft', 'active', 'verified', 'archived']),
    owner: zod_1.z.string().optional(),
    branch: zod_1.z.string().optional(),
    path: zod_1.z.string().optional(), // Path to changes/<id>
    implementsIntentId: zod_1.z.string().optional(),
    basedOnSpecId: zod_1.z.string().optional(),
});
// ============================================
// Findings Node
// ============================================
exports.FindingsSchema = exports.BaseNodeSchema.extend({
    type: zod_1.z.literal('findings'),
    summary: zod_1.z.string(),
    dataSources: zod_1.z.array(zod_1.z.string()).default([]),
    confidence: zod_1.z.number().min(0).max(100).default(0),
    supportsHypothesisId: zod_1.z.string().optional(),
});
// ============================================
// EvidenceBundle Node
// ============================================
exports.EvidenceBundleSchema = exports.BaseNodeSchema.extend({
    type: zod_1.z.literal('evidence_bundle'),
    rubricScore: zod_1.z.number().min(0).max(100),
    signer: zod_1.z.string().optional(),
    verifiesChangeId: zod_1.z.string().optional(),
    checks: zod_1.z.array(zod_1.z.object({
        category: zod_1.z.enum(['completeness', 'correctness', 'coherence', 'security', 'compliance', 'performance', 'ux', 'provenance']),
        status: zod_1.z.enum(['pass', 'fail', 'warn', 'skip']),
        details: zod_1.z.string().optional(),
    })).default([]),
});
exports.WorkGraphNodeSchema = zod_1.z.discriminatedUnion('type', [
    exports.IntentSchema,
    exports.CommitmentSchema,
    exports.HypothesisSchema,
    exports.EpicSchema,
    exports.TicketSchema,
    exports.PRSchema,
    exports.TestSchema,
    exports.ScanSchema,
    exports.IncidentSchema,
    exports.CustomerSchema,
    exports.AgentSchema,
    exports.EnvironmentSchema,
    exports.PolicySchema,
    exports.SprintSchema,
    exports.BoardSchema,
    exports.RoadmapSchema,
    exports.MilestoneSchema,
    exports.ChangeSchema,
    exports.FindingsSchema,
    exports.EvidenceBundleSchema,
]);

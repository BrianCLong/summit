"use strict";
/**
 * Core types for Safety Harness system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportConfigSchema = exports.ReportFormatSchema = exports.DifferentialResultSchema = exports.DifferentialTestConfigSchema = exports.TestRunSchema = exports.TestResultSchema = exports.TestPackSchema = exports.TestScenarioSchema = exports.RoleContextSchema = exports.ExpectedOutcomeSchema = exports.ComponentSchema = exports.AttackTypeSchema = exports.RiskLevelSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// Test Pack Schemas
// ============================================================================
exports.RiskLevelSchema = zod_1.z.enum(['low', 'medium', 'high', 'critical']);
exports.AttackTypeSchema = zod_1.z.enum([
    'data-exfiltration',
    'profiling',
    'discrimination',
    'overreach',
    'prompt-injection',
    'jailbreak',
    'pii-leak',
    'toxicity',
    'bias',
    'policy-bypass',
    'unauthorized-access',
    'privilege-escalation',
    'denial-of-service',
]);
exports.ComponentSchema = zod_1.z.enum([
    'copilot',
    'analytics',
    'case',
    'export',
    'graph-query',
    'search',
    'api-gateway',
]);
exports.ExpectedOutcomeSchema = zod_1.z.enum([
    'block',
    'warn',
    'redact',
    'escalate',
    'require-approval',
    'allow-with-logging',
    'deny',
]);
// ============================================================================
// Test Scenario Schema
// ============================================================================
exports.RoleContextSchema = zod_1.z.object({
    role: zod_1.z.string(),
    tenantId: zod_1.z.string(),
    userId: zod_1.z.string(),
    permissions: zod_1.z.array(zod_1.z.string()),
    warrants: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.TestScenarioSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    attackType: exports.AttackTypeSchema,
    component: exports.ComponentSchema,
    riskLevel: exports.RiskLevelSchema,
    enabled: zod_1.z.boolean().default(true),
    // Test input
    input: zod_1.z.object({
        prompt: zod_1.z.string().optional(),
        query: zod_1.z.string().optional(),
        action: zod_1.z.string().optional(),
        payload: zod_1.z.record(zod_1.z.unknown()).optional(),
        context: exports.RoleContextSchema,
    }),
    // Expected behavior
    expected: zod_1.z.object({
        outcome: exports.ExpectedOutcomeSchema,
        shouldContain: zod_1.z.array(zod_1.z.string()).optional(),
        shouldNotContain: zod_1.z.array(zod_1.z.string()).optional(),
        policyViolations: zod_1.z.array(zod_1.z.string()).optional(),
        guardrailsTriggered: zod_1.z.array(zod_1.z.string()).optional(),
        riskScoreRange: zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()]).optional(),
    }),
    // Metadata
    metadata: zod_1.z.object({
        tags: zod_1.z.array(zod_1.z.string()),
        cveIds: zod_1.z.array(zod_1.z.string()).optional(),
        references: zod_1.z.array(zod_1.z.string()).optional(),
        severity: exports.RiskLevelSchema,
        compliance: zod_1.z.array(zod_1.z.string()).optional(),
    }),
});
// ============================================================================
// Test Pack Schema
// ============================================================================
exports.TestPackSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    version: zod_1.z.string(),
    description: zod_1.z.string(),
    component: exports.ComponentSchema,
    scenarios: zod_1.z.array(exports.TestScenarioSchema),
    metadata: zod_1.z.object({
        author: zod_1.z.string(),
        createdAt: zod_1.z.string(),
        updatedAt: zod_1.z.string(),
        tags: zod_1.z.array(zod_1.z.string()),
    }),
});
// ============================================================================
// Test Execution Results
// ============================================================================
exports.TestResultSchema = zod_1.z.object({
    scenarioId: zod_1.z.string(),
    passed: zod_1.z.boolean(),
    timestamp: zod_1.z.string(),
    durationMs: zod_1.z.number(),
    // Actual behavior observed
    actual: zod_1.z.object({
        outcome: zod_1.z.string(),
        response: zod_1.z.record(zod_1.z.unknown()),
        blocked: zod_1.z.boolean(),
        guardrailsTriggered: zod_1.z.array(zod_1.z.string()),
        policyViolations: zod_1.z.array(zod_1.z.string()),
        riskScore: zod_1.z.number().optional(),
        logs: zod_1.z.array(zod_1.z.string()).optional(),
    }),
    // Comparison with expected
    comparison: zod_1.z.object({
        outcomeMatch: zod_1.z.boolean(),
        contentMatch: zod_1.z.boolean().optional(),
        guardrailsMatch: zod_1.z.boolean().optional(),
        policyMatch: zod_1.z.boolean().optional(),
        riskScoreInRange: zod_1.z.boolean().optional(),
    }),
    // Failure details
    failure: zod_1.z.object({
        reason: zod_1.z.string(),
        details: zod_1.z.record(zod_1.z.unknown()),
        severity: exports.RiskLevelSchema,
    }).optional(),
});
// ============================================================================
// Test Run Results
// ============================================================================
exports.TestRunSchema = zod_1.z.object({
    runId: zod_1.z.string(),
    startTime: zod_1.z.string(),
    endTime: zod_1.z.string(),
    durationMs: zod_1.z.number(),
    // Configuration
    config: zod_1.z.object({
        targetEndpoint: zod_1.z.string(),
        environment: zod_1.z.string(),
        modelVersion: zod_1.z.string().optional(),
        buildVersion: zod_1.z.string().optional(),
        parallel: zod_1.z.boolean(),
        maxConcurrency: zod_1.z.number(),
    }),
    // Test packs executed
    testPacks: zod_1.z.array(zod_1.z.string()),
    // Results
    results: zod_1.z.array(exports.TestResultSchema),
    // Summary statistics
    summary: zod_1.z.object({
        total: zod_1.z.number(),
        passed: zod_1.z.number(),
        failed: zod_1.z.number(),
        skipped: zod_1.z.number(),
        errorRate: zod_1.z.number(),
        // By risk level
        byRiskLevel: zod_1.z.record(zod_1.z.object({
            total: zod_1.z.number(),
            passed: zod_1.z.number(),
            failed: zod_1.z.number(),
        })),
        // By component
        byComponent: zod_1.z.record(zod_1.z.object({
            total: zod_1.z.number(),
            passed: zod_1.z.number(),
            failed: zod_1.z.number(),
        })),
        // By attack type
        byAttackType: zod_1.z.record(zod_1.z.object({
            total: zod_1.z.number(),
            passed: zod_1.z.number(),
            failed: zod_1.z.number(),
        })),
    }),
    // Regressions from previous run
    regressions: zod_1.z.array(zod_1.z.object({
        scenarioId: zod_1.z.string(),
        previousResult: zod_1.z.string(),
        currentResult: zod_1.z.string(),
        severity: exports.RiskLevelSchema,
    })).optional(),
});
// ============================================================================
// Differential Testing
// ============================================================================
exports.DifferentialTestConfigSchema = zod_1.z.object({
    baseline: zod_1.z.object({
        endpoint: zod_1.z.string(),
        version: zod_1.z.string(),
        label: zod_1.z.string(),
    }),
    candidate: zod_1.z.object({
        endpoint: zod_1.z.string(),
        version: zod_1.z.string(),
        label: zod_1.z.string(),
    }),
    testPacks: zod_1.z.array(zod_1.z.string()),
    thresholds: zod_1.z.object({
        maxNewFailures: zod_1.z.number(),
        maxRegressionRate: zod_1.z.number(),
    }),
});
exports.DifferentialResultSchema = zod_1.z.object({
    runId: zod_1.z.string(),
    timestamp: zod_1.z.string(),
    config: exports.DifferentialTestConfigSchema,
    baselineRun: exports.TestRunSchema,
    candidateRun: exports.TestRunSchema,
    comparison: zod_1.z.object({
        newFailures: zod_1.z.array(zod_1.z.string()),
        newPasses: zod_1.z.array(zod_1.z.string()),
        regressions: zod_1.z.array(zod_1.z.string()),
        improvements: zod_1.z.array(zod_1.z.string()),
        unchanged: zod_1.z.array(zod_1.z.string()),
        verdict: zod_1.z.enum(['pass', 'fail', 'warning']),
        reason: zod_1.z.string(),
    }),
});
// ============================================================================
// Report Schemas
// ============================================================================
exports.ReportFormatSchema = zod_1.z.enum(['json', 'html', 'markdown', 'junit', 'csv']);
exports.ReportConfigSchema = zod_1.z.object({
    format: exports.ReportFormatSchema,
    outputPath: zod_1.z.string(),
    includeDetails: zod_1.z.boolean(),
    includeLogs: zod_1.z.boolean(),
    highlightFailures: zod_1.z.boolean(),
});

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const zod_1 = require("zod");
const pino_1 = __importDefault(require("pino"));
const opa_client_js_1 = require("../services/opa-client.js");
const telemetry_js_1 = require("../observability/telemetry.js");
const cost_guard_js_1 = require("../services/cost-guard.js");
const ledger_js_1 = require("../provenance/ledger.js");
const router = (0, express_1.Router)();
const logger = pino_1.default({ name: 'export-api' });
// Request schemas
const exportRequestSchema = zod_1.z.object({
    action: zod_1.z.literal('export'),
    dataset: zod_1.z.object({
        sources: zod_1.z.array(zod_1.z.object({
            id: zod_1.z.string(),
            license: zod_1.z.string(),
            owner: zod_1.z.string(),
            classification: zod_1.z
                .enum(['public', 'internal', 'confidential', 'restricted'])
                .optional(),
            fields: zod_1.z
                .array(zod_1.z.object({
                name: zod_1.z.string(),
                type: zod_1.z.string(),
            }))
                .optional(),
            pii_detected: zod_1.z.boolean().optional(),
        })),
    }),
    context: zod_1.z.object({
        user_id: zod_1.z.string(),
        user_role: zod_1.z.enum([
            'analyst',
            'investigator',
            'admin',
            'compliance-officer',
        ]),
        user_scopes: zod_1.z.array(zod_1.z.string()).default([]),
        tenant_id: zod_1.z.string(),
        purpose: zod_1.z.enum([
            'investigation',
            'threat-intel',
            'fraud-risk',
            'commercial',
            'research',
        ]),
        export_type: zod_1.z.enum(['analysis', 'report', 'dataset', 'api']),
        destination: zod_1.z.string().optional(),
        approvals: zod_1.z.array(zod_1.z.string()).optional(),
        step_up_verified: zod_1.z.boolean().optional(),
        pii_export_approved: zod_1.z.boolean().optional(),
        compliance_mode: zod_1.z.boolean().optional(),
    }),
    case_id: zod_1.z.string().optional(),
    claim_ids: zod_1.z.array(zod_1.z.string()).optional(),
});
const simulateRequestSchema = exportRequestSchema.extend({
    simulation: zod_1.z.object({
        policy_changes: zod_1.z.record(zod_1.z.any()).optional(),
        what_if_scenarios: zod_1.z
            .array(zod_1.z.object({
            name: zod_1.z.string(),
            changes: zod_1.z.record(zod_1.z.any()),
        }))
            .optional(),
    }),
});
/**
 * POST /export
 *
 * Main export endpoint with full policy evaluation and cost tracking
 */
router.post('/export', async (req, res) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || `export-${Date.now()}`;
    try {
        // Validate request
        const exportRequest = exportRequestSchema.parse(req.body);
        (0, telemetry_js_1.addSpanAttributes)({
            'export.tenant_id': exportRequest.context.tenant_id,
            'export.user_id': exportRequest.context.user_id,
            'export.purpose': exportRequest.context.purpose,
            'export.type': exportRequest.context.export_type,
            'export.source_count': exportRequest.dataset.sources.length,
            'export.compliance_mode': Boolean(exportRequest.context.compliance_mode),
        });
        logger.info({
            requestId,
            tenantId: exportRequest.context.tenant_id,
            userId: exportRequest.context.user_id,
            sourceCount: exportRequest.dataset.sources.length,
            purpose: exportRequest.context.purpose,
        }, 'Export request received');
        // Cost check
        const costCheck = await cost_guard_js_1.costGuard.checkCostAllowance({
            tenantId: exportRequest.context.tenant_id,
            userId: exportRequest.context.user_id,
            operation: 'export_operation',
            complexity: exportRequest.dataset.sources.length,
            metadata: { requestId, exportType: exportRequest.context.export_type },
        });
        if (!costCheck.allowed) {
            telemetry_js_1.businessMetrics.exportBlocks.add(1, {
                tenant_id: exportRequest.context.tenant_id,
                reason: 'cost_limit',
                export_type: exportRequest.context.export_type,
            });
            return res.status(429).json({
                decision: {
                    effect: 'deny',
                    reasons: ['Cost limit exceeded'],
                    violations: [
                        {
                            code: 'COST_LIMIT_EXCEEDED',
                            message: `Export cost $${costCheck.estimatedCost} exceeds remaining budget $${costCheck.budgetRemaining}`,
                            appeal_code: 'COST001',
                            appeal_url: 'https://compliance.intelgraph.io/appeal/COST001',
                            severity: 'blocking',
                        },
                    ],
                    risk_assessment: {
                        level: 'high',
                        factors: ['Budget exceeded'],
                        requires_approval: false,
                        requires_step_up: false,
                    },
                    redactions: [],
                    audit_trail: {
                        decision_id: requestId,
                        timestamp: new Date().toISOString(),
                        policy_version: 'cost-guard-1.0',
                        evaluator: 'cost-guard-service',
                    },
                },
                cost_estimate: {
                    estimated_cost: costCheck.estimatedCost,
                    budget_remaining: costCheck.budgetRemaining,
                    budget_utilization: costCheck.budgetUtilization,
                },
            });
        }
        // Evaluate export policy via OPA
        const policyDecision = await opa_client_js_1.opaClient.evaluateExportPolicy({
            action: 'export',
            dataset: exportRequest.dataset,
            context: {
                ...exportRequest.context,
                user_scopes: exportRequest.context.user_scopes || [],
            },
        });
        // Generate redactions for sensitive fields
        const redactions = generateRedactions(exportRequest.dataset.sources, exportRequest.context);
        // Create audit trail
        const opaDecisionId = policyDecision.decision_id || requestId;
        const auditTrail = {
            decision_id: opaDecisionId,
            timestamp: new Date().toISOString(),
            policy_version: 'export-enhanced-1.0',
            evaluator: 'opa-policy-engine',
        };
        // Record metrics
        telemetry_js_1.businessMetrics.exportRequests.add(1, {
            tenant_id: exportRequest.context.tenant_id,
            export_type: exportRequest.context.export_type,
            decision: policyDecision.action,
        });
        if (policyDecision.action === 'deny') {
            telemetry_js_1.businessMetrics.exportBlocks.add(1, {
                tenant_id: exportRequest.context.tenant_id,
                reason: 'policy_violation',
                export_type: exportRequest.context.export_type,
            });
        }
        // Record actual cost
        await cost_guard_js_1.costGuard.recordActualCost({
            tenantId: exportRequest.context.tenant_id,
            userId: exportRequest.context.user_id,
            operation: 'export_operation',
            duration: Date.now() - startTime,
            metadata: { requestId, decision: policyDecision.action },
        });
        await ledger_js_1.provenanceLedger.appendEntry({
            tenantId: exportRequest.context.tenant_id,
            timestamp: new Date(),
            actionType: 'EXPORT_POLICY_DECISION',
            resourceType: 'Export',
            resourceId: requestId,
            actorId: exportRequest.context.user_id,
            actorType: 'user',
            payload: {
                action: 'export',
                decision: policyDecision.action,
                violations: policyDecision.violations,
                redactions,
                request: {
                    dataset: exportRequest.dataset,
                    context: exportRequest.context,
                },
            },
            metadata: {
                requestId,
                policyDecisionId: opaDecisionId,
                policyVersion: auditTrail.policy_version,
                complianceMode: exportRequest.context.compliance_mode ?? false,
            },
        });
        const response = {
            decision: {
                effect: policyDecision.action === 'allow'
                    ? 'allow'
                    : policyDecision.action === 'deny'
                        ? 'deny'
                        : 'review',
                reasons: policyDecision.violations.map((v) => v.message),
                violations: policyDecision.violations,
                risk_assessment: policyDecision.risk_assessment,
                redactions,
                audit_trail: auditTrail,
            },
            cost_estimate: {
                estimated_cost: costCheck.estimatedCost,
                budget_remaining: costCheck.budgetRemaining,
                budget_utilization: costCheck.budgetUtilization,
            },
        };
        // If allowed, generate export URLs
        if (policyDecision.action === 'allow') {
            response.export_url = `https://exports.intelgraph.io/bundles/${requestId}`;
            response.manifest_url = `https://exports.intelgraph.io/manifests/${requestId}`;
            response.bundle_hash = `sha256:${generateMockHash(requestId)}`;
        }
        logger.info({
            requestId,
            decision: response.decision.effect,
            violationCount: response.decision.violations.length,
            riskLevel: response.decision.risk_assessment.level,
            duration: Date.now() - startTime,
        }, 'Export request processed');
        res.json(response);
    }
    catch (error) {
        logger.error({ requestId, error }, 'Export request failed');
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Invalid request format',
                details: error.errors,
            });
        }
        res.status(500).json({
            error: 'Internal server error',
            request_id: requestId,
        });
    }
});
/**
 * POST /export/simulate
 *
 * Policy simulation endpoint for testing what-if scenarios
 */
router.post('/export/simulate', async (req, res) => {
    const requestId = req.headers['x-request-id'] || `sim-${Date.now()}`;
    try {
        const simulateRequest = simulateRequestSchema.parse(req.body);
        logger.info({
            requestId,
            tenantId: simulateRequest.context.tenant_id,
            scenarioCount: simulateRequest.simulation.what_if_scenarios?.length || 0,
        }, 'Export simulation request received');
        // Get baseline decision
        const baselineDecision = await opa_client_js_1.opaClient.evaluateExportPolicy({
            action: 'export',
            dataset: simulateRequest.dataset,
            context: {
                ...simulateRequest.context,
                user_scopes: simulateRequest.context.user_scopes || [],
            },
        });
        const baseline = {
            effect: baselineDecision.action === 'allow'
                ? 'allow'
                : baselineDecision.action === 'deny'
                    ? 'deny'
                    : 'review',
            reasons: baselineDecision.violations.map((v) => v.message),
            violations: baselineDecision.violations,
            risk_assessment: baselineDecision.risk_assessment,
            redactions: generateRedactions(simulateRequest.dataset.sources, simulateRequest.context),
            audit_trail: {
                decision_id: `${requestId}-baseline`,
                timestamp: new Date().toISOString(),
                policy_version: 'export-enhanced-1.0',
                evaluator: 'opa-policy-engine',
            },
        };
        // Run what-if scenarios
        const scenarios = [];
        for (const scenario of simulateRequest.simulation.what_if_scenarios || []) {
            const modifiedContext = {
                ...simulateRequest.context,
                ...scenario.changes,
            };
            const scenarioDecision = await opa_client_js_1.opaClient.evaluateExportPolicy({
                action: 'export',
                dataset: simulateRequest.dataset,
                context: {
                    ...modifiedContext,
                    user_scopes: modifiedContext.user_scopes || simulateRequest.context.user_scopes || [],
                },
            });
            const scenarioResult = {
                effect: scenarioDecision.action === 'allow'
                    ? 'allow'
                    : scenarioDecision.action === 'deny'
                        ? 'deny'
                        : 'review',
                reasons: scenarioDecision.violations.map((v) => v.message),
                violations: scenarioDecision.violations,
                risk_assessment: scenarioDecision.risk_assessment,
                redactions: generateRedactions(simulateRequest.dataset.sources, modifiedContext),
                audit_trail: {
                    decision_id: `${requestId}-${scenario.name}`,
                    timestamp: new Date().toISOString(),
                    policy_version: 'export-enhanced-1.0',
                    evaluator: 'opa-policy-engine',
                },
            };
            scenarios.push({
                name: scenario.name,
                decision: scenarioResult,
                impact: {
                    decision_changed: baseline.effect !== scenarioResult.effect,
                    violations_added: scenarioResult.violations
                        .filter((v) => !baseline.violations.some((bv) => bv.code === v.code))
                        .map((v) => v.code),
                    violations_removed: baseline.violations
                        .filter((v) => !scenarioResult.violations.some((sv) => sv.code === v.code))
                        .map((v) => v.code),
                    risk_level_change: baseline.risk_assessment.level !==
                        scenarioResult.risk_assessment.level
                        ? `${baseline.risk_assessment.level} → ${scenarioResult.risk_assessment.level}`
                        : 'no change',
                },
            });
        }
        const response = {
            decision: baseline,
            cost_estimate: {
                estimated_cost: 0, // Simulations are free
                budget_remaining: 1000, // Mock value
                budget_utilization: 0,
            },
            simulation_results: {
                baseline,
                scenarios,
            },
        };
        logger.info({
            requestId,
            baselineDecision: baseline.effect,
            scenarioResults: scenarios.map((s) => ({
                name: s.name,
                decision: s.decision.effect,
            })),
        }, 'Export simulation completed');
        res.json(response);
    }
    catch (error) {
        logger.error({ requestId, error }, 'Export simulation failed');
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Invalid simulation request format',
                details: error.errors,
            });
        }
        res.status(500).json({
            error: 'Internal server error',
            request_id: requestId,
        });
    }
});
/**
 * GET /export/status/:requestId
 *
 * Check the status of an export request
 */
router.get('/export/status/:requestId', async (req, res) => {
    const { requestId } = req.params;
    // Mock status response
    const mockStatus = {
        request_id: requestId,
        status: 'completed',
        created_at: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        completed_at: new Date().toISOString(),
        export_url: `https://exports.intelgraph.io/bundles/${requestId}`,
        manifest_url: `https://exports.intelgraph.io/manifests/${requestId}`,
        bundle_size_bytes: 1024000,
        expiry_date: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
    };
    res.json(mockStatus);
});
// Helper functions
function generateRedactions(sources, context) {
    const redactions = [];
    // Check for PII fields that need redaction
    for (const source of sources) {
        if (source.fields) {
            for (const field of source.fields) {
                if (['email', 'phone', 'ssn'].includes(field.type) &&
                    !context.pii_export_approved) {
                    redactions.push({
                        field: field.name,
                        reason: 'PII field requires explicit approval for export',
                        replacement: '[REDACTED]',
                    });
                }
            }
        }
    }
    // Redact based on classification
    for (const source of sources) {
        if (source.classification === 'confidential' &&
            context.export_type === 'dataset') {
            redactions.push({
                field: 'source_details',
                reason: 'Confidential data not permitted in dataset exports',
                replacement: '[CLASSIFIED]',
            });
        }
    }
    return redactions;
}
function generateMockHash(input) {
    // Mock hash generation - in real implementation would be actual hash
    return Buffer.from(input).toString('base64').substring(0, 64);
}
exports.default = router;

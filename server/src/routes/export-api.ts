import { Router } from 'express';
import { z } from 'zod';
import pino from 'pino';
import { opaClient } from '../services/opa-client';
import { businessMetrics, addSpanAttributes } from '../observability/telemetry';
import { costGuard } from '../services/cost-guard';

const router = Router();
const logger = pino({ name: 'export-api' });

// Request schemas
const exportRequestSchema = z.object({
  action: z.literal('export'),
  dataset: z.object({
    sources: z.array(
      z.object({
        id: z.string(),
        license: z.string(),
        owner: z.string().optional(),
        classification: z
          .enum(['public', 'internal', 'confidential', 'restricted'])
          .optional(),
        fields: z
          .array(
            z.object({
              name: z.string(),
              type: z.string(),
            }),
          )
          .optional(),
        pii_detected: z.boolean().optional(),
      }),
    ),
  }),
  context: z.object({
    user_id: z.string(),
    user_role: z.enum([
      'analyst',
      'investigator',
      'admin',
      'compliance-officer',
    ]),
    user_scopes: z.array(z.string()).optional(),
    tenant_id: z.string(),
    purpose: z.enum([
      'investigation',
      'threat-intel',
      'fraud-risk',
      'commercial',
      'research',
    ]),
    export_type: z.enum(['analysis', 'report', 'dataset', 'api']),
    destination: z.string().optional(),
    approvals: z.array(z.string()).optional(),
    step_up_verified: z.boolean().optional(),
    pii_export_approved: z.boolean().optional(),
  }),
  case_id: z.string().optional(),
  claim_ids: z.array(z.string()).optional(),
});

const simulateRequestSchema = exportRequestSchema.extend({
  simulation: z.object({
    policy_changes: z.record(z.any()).optional(),
    what_if_scenarios: z
      .array(
        z.object({
          name: z.string(),
          changes: z.record(z.any()),
        }),
      )
      .optional(),
  }),
});

// Response types
interface ExportResponse {
  decision: {
    effect: 'allow' | 'deny' | 'review';
    reasons: string[];
    violations: Array<{
      code: string;
      message: string;
      appeal_code: string;
      appeal_url: string;
      severity: 'blocking' | 'warning';
    }>;
    risk_assessment: {
      level: 'low' | 'medium' | 'high';
      factors: string[];
      requires_approval: boolean;
      requires_step_up: boolean;
    };
    redactions: Array<{
      field: string;
      reason: string;
      replacement: string;
    }>;
    audit_trail: {
      decision_id: string;
      timestamp: string;
      policy_version: string;
      evaluator: string;
    };
  };
  export_url?: string;
  manifest_url?: string;
  bundle_hash?: string;
  cost_estimate: {
    estimated_cost: number;
    budget_remaining: number;
    budget_utilization: number;
  };
}

interface SimulationResponse extends ExportResponse {
  simulation_results: {
    baseline: ExportResponse['decision'];
    scenarios: Array<{
      name: string;
      decision: ExportResponse['decision'];
      impact: {
        decision_changed: boolean;
        violations_added: string[];
        violations_removed: string[];
        risk_level_change: string;
      };
    }>;
  };
}

/**
 * POST /export
 *
 * Main export endpoint with full policy evaluation and cost tracking
 */
router.post('/export', async (req, res) => {
  const startTime = Date.now();
  const requestId =
    (req.headers['x-request-id'] as string) || `export-${Date.now()}`;

  try {
    // Validate request
    const exportRequest = exportRequestSchema.parse(req.body);

    addSpanAttributes({
      'export.tenant_id': exportRequest.context.tenant_id,
      'export.user_id': exportRequest.context.user_id,
      'export.purpose': exportRequest.context.purpose,
      'export.type': exportRequest.context.export_type,
      'export.source_count': exportRequest.dataset.sources.length,
    });

    logger.info(
      {
        requestId,
        tenantId: exportRequest.context.tenant_id,
        userId: exportRequest.context.user_id,
        sourceCount: exportRequest.dataset.sources.length,
        purpose: exportRequest.context.purpose,
      },
      'Export request received',
    );

    // Cost check
    const costCheck = await costGuard.checkCostAllowance({
      tenantId: exportRequest.context.tenant_id,
      userId: exportRequest.context.user_id,
      operation: 'export_operation',
      complexity: exportRequest.dataset.sources.length,
      metadata: { requestId, exportType: exportRequest.context.export_type },
    });

    if (!costCheck.allowed) {
      businessMetrics.exportBlocks.add(1, {
        tenant_id: exportRequest.context.tenant_id,
        reason: 'cost_limit',
        export_type: exportRequest.context.export_type,
      });

      return res.status(429).json({
        decision: {
          effect: 'deny' as const,
          reasons: ['Cost limit exceeded'],
          violations: [
            {
              code: 'COST_LIMIT_EXCEEDED',
              message: `Export cost $${costCheck.estimatedCost} exceeds remaining budget $${costCheck.budgetRemaining}`,
              appeal_code: 'COST001',
              appeal_url: 'https://compliance.intelgraph.io/appeal/COST001',
              severity: 'blocking' as const,
            },
          ],
          risk_assessment: {
            level: 'high' as const,
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
    const policyDecision = await opaClient.evaluateExportPolicy({
      action: 'export',
      dataset: exportRequest.dataset,
      context: exportRequest.context,
    });

    // Generate redactions for sensitive fields
    const redactions = generateRedactions(
      exportRequest.dataset.sources,
      exportRequest.context,
    );

    // Create audit trail
    const auditTrail = {
      decision_id: requestId,
      timestamp: new Date().toISOString(),
      policy_version: 'export-enhanced-1.0',
      evaluator: 'opa-policy-engine',
    };

    // Record metrics
    businessMetrics.exportRequests.add(1, {
      tenant_id: exportRequest.context.tenant_id,
      export_type: exportRequest.context.export_type,
      decision: policyDecision.action,
    });

    if (policyDecision.action === 'deny') {
      businessMetrics.exportBlocks.add(1, {
        tenant_id: exportRequest.context.tenant_id,
        reason: 'policy_violation',
        export_type: exportRequest.context.export_type,
      });
    }

    // Record actual cost
    await costGuard.recordActualCost({
      tenantId: exportRequest.context.tenant_id,
      userId: exportRequest.context.user_id,
      operation: 'export_operation',
      duration: Date.now() - startTime,
      metadata: { requestId, decision: policyDecision.action },
    });

    const response: ExportResponse = {
      decision: {
        effect:
          policyDecision.action === 'allow'
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

    logger.info(
      {
        requestId,
        decision: response.decision.effect,
        violationCount: response.decision.violations.length,
        riskLevel: response.decision.risk_assessment.level,
        duration: Date.now() - startTime,
      },
      'Export request processed',
    );

    res.json(response);
  } catch (error) {
    logger.error({ requestId, error }, 'Export request failed');

    if (error instanceof z.ZodError) {
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
  const requestId =
    (req.headers['x-request-id'] as string) || `sim-${Date.now()}`;

  try {
    const simulateRequest = simulateRequestSchema.parse(req.body);

    logger.info(
      {
        requestId,
        tenantId: simulateRequest.context.tenant_id,
        scenarioCount:
          simulateRequest.simulation.what_if_scenarios?.length || 0,
      },
      'Export simulation request received',
    );

    // Get baseline decision
    const baselineDecision = await opaClient.evaluateExportPolicy({
      action: 'export',
      dataset: simulateRequest.dataset,
      context: simulateRequest.context,
    });

    const baseline: ExportResponse['decision'] = {
      effect:
        baselineDecision.action === 'allow'
          ? 'allow'
          : baselineDecision.action === 'deny'
            ? 'deny'
            : 'review',
      reasons: baselineDecision.violations.map((v) => v.message),
      violations: baselineDecision.violations,
      risk_assessment: baselineDecision.risk_assessment,
      redactions: generateRedactions(
        simulateRequest.dataset.sources,
        simulateRequest.context,
      ),
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

      const scenarioDecision = await opaClient.evaluateExportPolicy({
        action: 'export',
        dataset: simulateRequest.dataset,
        context: modifiedContext,
      });

      const scenarioResult = {
        effect:
          scenarioDecision.action === 'allow'
            ? 'allow'
            : scenarioDecision.action === 'deny'
              ? 'deny'
              : 'review',
        reasons: scenarioDecision.violations.map((v) => v.message),
        violations: scenarioDecision.violations,
        risk_assessment: scenarioDecision.risk_assessment,
        redactions: generateRedactions(
          simulateRequest.dataset.sources,
          modifiedContext,
        ),
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
            .filter(
              (v) => !baseline.violations.some((bv) => bv.code === v.code),
            )
            .map((v) => v.code),
          violations_removed: baseline.violations
            .filter(
              (v) =>
                !scenarioResult.violations.some((sv) => sv.code === v.code),
            )
            .map((v) => v.code),
          risk_level_change:
            baseline.risk_assessment.level !==
            scenarioResult.risk_assessment.level
              ? `${baseline.risk_assessment.level} → ${scenarioResult.risk_assessment.level}`
              : 'no change',
        },
      });
    }

    const response: SimulationResponse = {
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

    logger.info(
      {
        requestId,
        baselineDecision: baseline.effect,
        scenarioResults: scenarios.map((s) => ({
          name: s.name,
          decision: s.decision.effect,
        })),
      },
      'Export simulation completed',
    );

    res.json(response);
  } catch (error) {
    logger.error({ requestId, error }, 'Export simulation failed');

    if (error instanceof z.ZodError) {
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
function generateRedactions(
  sources: any[],
  context: any,
): Array<{ field: string; reason: string; replacement: string }> {
  const redactions = [];

  // Check for PII fields that need redaction
  for (const source of sources) {
    if (source.fields) {
      for (const field of source.fields) {
        if (
          ['email', 'phone', 'ssn'].includes(field.type) &&
          !context.pii_export_approved
        ) {
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
    if (
      source.classification === 'confidential' &&
      context.export_type === 'dataset'
    ) {
      redactions.push({
        field: 'source_details',
        reason: 'Confidential data not permitted in dataset exports',
        replacement: '[CLASSIFIED]',
      });
    }
  }

  return redactions;
}

function generateMockHash(input: string): string {
  // Mock hash generation - in real implementation would be actual hash
  return Buffer.from(input).toString('base64').substring(0, 64);
}

export default router;

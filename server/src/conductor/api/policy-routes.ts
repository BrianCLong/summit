// API Routes for Policy Explanation and Simulation
import express from 'express';
import { policyExplainer } from '../router/policy-explainer';
import { prometheusConductorMetrics } from '../observability/prometheus';

const router = express.Router();

/**
 * POST /api/maestro/v1/policies/explain
 * Explain a routing decision with full trace
 */
router.post('/explain', async (req, res) => {
  const startTime = Date.now();

  try {
    const { queryId, extended = false } = req.body;

    if (!queryId) {
      return res.status(400).json({
        error: 'queryId is required',
        code: 'MISSING_QUERY_ID',
      });
    }

    const explanation = await policyExplainer.getPolicyExplanationAPI(queryId);

    if (!explanation) {
      return res.status(404).json({
        error: 'Decision trace not found',
        code: 'TRACE_NOT_FOUND',
        queryId,
      });
    }

    // Track metrics
    const duration = Date.now() - startTime;
    prometheusConductorMetrics?.policyExplanationLatency?.observe(
      duration / 1000,
    );
    prometheusConductorMetrics?.policyExplanationRequests?.inc({
      status: 'success',
    });

    const response = {
      queryId: explanation.queryId,
      timestamp: explanation.timestamp,
      decision: explanation.decision,
      ...(extended && {
        rulePath: explanation.rulePath,
        policyEvaluations: explanation.policyEvaluations,
        costBreakdown: explanation.costBreakdown,
        performanceMetrics: explanation.performanceMetrics,
      }),
    };

    res.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    prometheusConductorMetrics?.policyExplanationLatency?.observe(
      duration / 1000,
    );
    prometheusConductorMetrics?.policyExplanationRequests?.inc({
      status: 'error',
    });

    console.error('Policy explanation error:', error);
    res.status(500).json({
      error: 'Failed to explain policy decision',
      code: 'EXPLANATION_FAILED',
      message: error.message,
    });
  }
});

/**
 * POST /api/maestro/v1/policies/simulate
 * Simulate what-if scenarios for policy changes
 */
router.post('/simulate', async (req, res) => {
  const startTime = Date.now();

  try {
    const { queryId, proposedRules, simulationType = 'rule_change' } = req.body;

    if (!queryId) {
      return res.status(400).json({
        error: 'queryId is required',
        code: 'MISSING_QUERY_ID',
      });
    }

    if (!proposedRules || !Array.isArray(proposedRules)) {
      return res.status(400).json({
        error: 'proposedRules must be an array',
        code: 'INVALID_RULES',
      });
    }

    const simulation = await policyExplainer.simulateWhatIfAPI(queryId, {
      rules: proposedRules,
      type: simulationType,
    });

    if (!simulation) {
      return res.status(404).json({
        error: 'Original decision not found for simulation',
        code: 'ORIGINAL_DECISION_NOT_FOUND',
        queryId,
      });
    }

    // Track metrics
    const duration = Date.now() - startTime;
    prometheusConductorMetrics?.policySimulationLatency?.observe(
      duration / 1000,
    );
    prometheusConductorMetrics?.policySimulationRequests?.inc({
      status: 'success',
      type: simulationType,
    });

    res.json({
      queryId,
      simulationType,
      timestamp: new Date().toISOString(),
      simulation,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    prometheusConductorMetrics?.policySimulationLatency?.observe(
      duration / 1000,
    );
    prometheusConductorMetrics?.policySimulationRequests?.inc({
      status: 'error',
      type: req.body.simulationType || 'unknown',
    });

    console.error('Policy simulation error:', error);
    res.status(500).json({
      error: 'Failed to simulate policy changes',
      code: 'SIMULATION_FAILED',
      message: error.message,
    });
  }
});

/**
 * GET /api/maestro/v1/policies/rules
 * Get all available policy rules
 */
router.get('/rules', async (req, res) => {
  try {
    // In a real implementation, this would fetch from a policy store
    const rules = [
      {
        id: 'pii-restriction',
        name: 'PII Data Restriction',
        description: 'Restrict PII data to sovereign/local models only',
        condition: 'query.containsPII === true',
        action: 'route_to',
        priority: 100,
        enabled: true,
        metadata: { allowedExperts: ['local-llm', 'sovereign-ai'] },
      },
      {
        id: 'cost-budget',
        name: 'Cost Budget Enforcement',
        description: 'Enforce per-tenant cost budgets',
        condition: 'tenant.budgetRemaining > estimatedCost',
        action: 'allow',
        priority: 90,
        enabled: true,
      },
      {
        id: 'sensitivity-classification',
        name: 'Sensitivity Classification',
        description: 'Route based on data sensitivity level',
        condition: 'context.sensitivity === "secret"',
        action: 'route_to',
        priority: 95,
        enabled: true,
        metadata: { allowedExperts: ['local-llm'] },
      },
      {
        id: 'emergency-override',
        name: 'Emergency Override',
        description: 'Allow emergency queries to bypass normal restrictions',
        condition: 'context.urgency === "high" && user.hasEmergencyRole',
        action: 'allow',
        priority: 110,
        enabled: true,
      },
    ];

    prometheusConductorMetrics?.policyRulesRequests?.inc({ status: 'success' });

    res.json({
      rules,
      count: rules.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    prometheusConductorMetrics?.policyRulesRequests?.inc({ status: 'error' });

    console.error('Policy rules fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch policy rules',
      code: 'RULES_FETCH_FAILED',
      message: error.message,
    });
  }
});

/**
 * GET /api/maestro/v1/runs/:runId/nodes/:nodeId/routing
 * Get routing decision for a specific run node
 */
router.get('/runs/:runId/nodes/:nodeId/routing', async (req, res) => {
  try {
    const { runId, nodeId } = req.params;
    const { includeTrace = false } = req.query;

    // In a real implementation, this would fetch from the runs database
    // For now, return a mock routing decision
    const routingDecision = {
      runId,
      nodeId,
      queryId: `${runId}-${nodeId}-query`,
      timestamp: new Date().toISOString(),
      expert: {
        id: 'openai-gpt-4',
        name: 'OpenAI GPT-4',
        provider: 'openai',
        model: 'gpt-4-0125-preview',
      },
      decision: {
        confidence: 0.92,
        reason: 'High confidence task, budget available, no PII detected',
        estimatedCost: 0.045,
        estimatedLatency: 1200,
      },
      alternatives: [
        {
          expert: 'anthropic-claude-3',
          score: 0.87,
          rejectionReason: 'Higher cost per token',
        },
        {
          expert: 'local-llm',
          score: 0.75,
          rejectionReason: 'Lower performance score',
        },
      ],
    };

    if (includeTrace === 'true') {
      const trace = await policyExplainer.getPolicyExplanationAPI(
        routingDecision.queryId,
      );
      routingDecision.trace = trace;
    }

    prometheusConductorMetrics?.runRoutingRequests?.inc({ status: 'success' });

    res.json(routingDecision);
  } catch (error) {
    prometheusConductorMetrics?.runRoutingRequests?.inc({ status: 'error' });

    console.error('Run routing fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch routing decision',
      code: 'ROUTING_FETCH_FAILED',
      message: error.message,
    });
  }
});

export { router as policyRoutes };

// @ts-nocheck
import { Router, type Request, type Response, type NextFunction } from 'express';
import { CostOptimizationService } from '../services/CostOptimizationService.js';
import { FinOpsPolicyService } from '../services/FinOpsPolicyService.js';
import { PrometheusMetricProvider } from '../services/MetricProvider.js';
import { logger } from '../config/logger.js';
import { trace } from '@opentelemetry/api';

const router = Router();
const costOptimizer = new CostOptimizationService();
const policyService = new FinOpsPolicyService();
const metricProvider = new PrometheusMetricProvider();
const tracer = trace.getTracer('finops-router');

// Extend Express Request interface to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    tenantId?: string;
    role?: string;
  };
}

// Middleware to ensure user has access to finops data
// Hardened to check for specific roles rather than just existence of user object.
const ensureFinOpsAccess = (req: Request, res: Response, next: NextFunction): void => {
  const authReq = req as AuthenticatedRequest;
  const user = authReq.user;

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Check for admin or specific finops role
  // In development, the mock user has role='admin'.
  const allowedRoles = ['admin', 'finops_manager', 'superadmin'];
  if (!allowedRoles.includes(user.role)) {
    logger.warn({ userId: user.id, role: user.role }, 'Access denied to FinOps endpoints');
    res.status(403).json({ error: 'Forbidden: Insufficient permissions for FinOps operations' });
    return;
  }

  next();
};

router.use(ensureFinOpsAccess);

/**
 * GET /api/finops/dashboard
 * Returns aggregated cost data for the dashboard.
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const tenantId = (authReq.user?.tenantId || (req.query.tenantId as any)) as string;

  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant ID required' });
  }

  try {
    const span = tracer.startSpan('finops.get_dashboard');

    // Fetch real metrics from the provider
    const [currentCost, budgetUtilization, resourceMetrics] = await Promise.all([
        metricProvider.getTenantCost(tenantId),
        metricProvider.getBudgetUtilization(tenantId),
        metricProvider.getResourceMetrics(tenantId)
    ]);

    // Check policies against real metrics
    // Convert resourceMetrics to record<string, number> for evaluation
    const metricsForEval: Record<string, number> = {
        cpu_utilization: resourceMetrics.cpu_utilization,
        memory_utilization: resourceMetrics.memory_utilization,
        storage_usage_gb: resourceMetrics.storage_usage_gb,
        network_io: resourceMetrics.network_io,
        current_cost: currentCost,
        budget_utilization: budgetUtilization
    };

    const policyViolations = await policyService.evaluatePolicies(tenantId, metricsForEval);

    // Mocked historical data (Mocked because we don't have a persistent time-series DB in this environment)
    // Using deterministic generation based on date index, avoiding Math.random().
    const history = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));

      // Deterministic pseudo-random based on day index (i)
      const deterministicFactor = (i * 13) % 100;

      return {
        date: date.toISOString().split('T')[0],
        compute: 50 + (deterministicFactor * 0.2),
        storage: 20 + (i * 0.5),
        network: 10 + (deterministicFactor * 0.1),
        db: 30 + (deterministicFactor * 0.15),
        total: 110 + (deterministicFactor * 0.45) + (i * 0.5)
      };
    });

    const forecast = {
      nextMonthEstimate: currentCost * 1.1, // Simple projection
      trend: 'increasing',
      confidence: 0.85,
      isSimulated: true
    };

    res.json({
      tenantId,
      currentMonthSpend: currentCost,
      budget: 2000.00, // This would normally come from a TenantService
      utilization: budgetUtilization,
      history,
      forecast,
      serviceBreakdown: {
        compute: currentCost * 0.5, // Estimated breakdown
        database: currentCost * 0.3,
        storage: currentCost * 0.1,
        network: currentCost * 0.05,
        ai: currentCost * 0.05
      },
      activeViolations: policyViolations,
      realTimeMetrics: resourceMetrics,
      meta: {
          isSimulated: resourceMetrics.isSimulated || true,
          provenance: resourceMetrics.provenance || 'simulated',
          source: 'SimulatedProvider'
      }
    });

    span.end();
  } catch (error: any) {
    logger.error({ error }, 'Error fetching finops dashboard');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/finops/recommendations
// Returns cost optimization recommendations
router.get('/recommendations', async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const tenantId = (authReq.user?.tenantId || (req.query.tenantId as any)) as string;

  try {
    const opportunities = await costOptimizer.identifyOptimizationOpportunities(tenantId);
    res.json({ opportunities });
  } catch (error: any) {
    logger.error({ error }, 'Error identifying optimization opportunities');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/finops/recommendations/:id/execute
// Executes a specific recommendation
router.post('/recommendations/:id/execute', async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const tenantId = (authReq.user?.tenantId || (req.query.tenantId as any)) as string;
  const opportunityId = req.params.id;

  try {
    const opportunities = await costOptimizer.identifyOptimizationOpportunities(tenantId);
    const opportunity = opportunities.find(o => o.id === opportunityId);

    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found or no longer valid' });
    }

    const result = await costOptimizer.executeOptimizations([opportunity]);
    res.json(result[0]);
  } catch (error: any) {
    logger.error({ error }, 'Error executing optimization');
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/finops/policies
// Returns active FinOps policies
router.get('/policies', async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const tenantId = (authReq.user?.tenantId || (req.query.tenantId as any)) as string;
    try {
        const policies = await policyService.getPolicies(tenantId);
        res.json({ policies });
    } catch (error: any) {
        logger.error({ error }, 'Error fetching policies');
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /api/finops/policies
// Creates or updates a policy
router.post('/policies', async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const tenantId = (authReq.user?.tenantId || (req.query.tenantId as any)) as string;
    const policy = req.body;

    // Basic validation
    if (!policy.name || !policy.rules) {
        return res.status(400).json({ error: 'Invalid policy format' });
    }

    try {
        await policyService.savePolicy(tenantId, policy);
        res.json({ success: true, policy });
    } catch (error: any) {
        logger.error({ error }, 'Error saving policy');
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;

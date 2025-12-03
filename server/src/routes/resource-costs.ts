
import { Router } from 'express';
import { resourceCostAnalyzerService } from '../services/ResourceCostAnalyzerService';
import { ensureAuthenticated } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Validation schema for query params
const CostAnalysisQuerySchema = z.object({
  period: z.enum(['hour', 'day', 'week', 'month']).optional().default('day'),
});

/**
 * @openapi
 * /api/costs/analysis:
 *   get:
 *     summary: Get resource cost analysis with service breakdown
 *     description: Returns a detailed cost breakdown per service and optimization suggestions for the authenticated tenant.
 *     tags:
 *       - Costs
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [hour, day, week, month]
 *           default: day
 *         description: Time period for the analysis
 *     responses:
 *       200:
 *         description: Successful analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tenantId:
 *                   type: string
 *                 totalCost:
 *                   type: number
 *                 serviceBreakdown:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       serviceName:
 *                         type: string
 *                       cost:
 *                         type: number
 *                       percentage:
 *                         type: number
 *                 optimizations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       serviceName:
 *                         type: string
 *                       suggestion:
 *                         type: string
 */
router.get('/analysis', ensureAuthenticated, async (req, res, next) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
       res.status(400).json({ error: 'Tenant ID required' });
       return;
    }

    const query = CostAnalysisQuerySchema.parse(req.query);

    const analysis = await resourceCostAnalyzerService.getServiceCostAnalysis(
      tenantId,
      query.period
    );

    res.json(analysis);
  } catch (error) {
    next(error);
  }
});

export default router;

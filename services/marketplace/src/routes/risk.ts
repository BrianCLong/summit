import { Router } from 'express';
import { riskScorerService } from '../services/riskScorerService.js';
import { productService } from '../services/productService.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export const riskRoutes = Router();

// Assess dataset risk (preview before publishing)
riskRoutes.post('/assess', async (req: AuthenticatedRequest, res, next) => {
  try {
    // Create a temporary product-like object for assessment
    const tempProduct = {
      id: 'temp-' + Date.now(),
      providerId: req.user!.providerId || req.user!.id,
      ...req.body,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const assessment = await riskScorerService.assess(tempProduct);
    res.json(assessment);
  } catch (err) {
    next(err);
  }
});

// Get risk report for a product
riskRoutes.get('/report/:productId', async (req, res, next) => {
  try {
    const product = await productService.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const assessment = await riskScorerService.getByProductId(
      req.params.productId
    );

    if (!assessment) {
      // Generate new assessment if none exists
      const newAssessment = await riskScorerService.assess(product);
      return res.json(newAssessment);
    }

    res.json(assessment);
  } catch (err) {
    next(err);
  }
});

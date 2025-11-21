import { Router } from 'express';
import { productService } from '../services/productService.js';
import { riskScorerService } from '../services/riskScorerService.js';
import { CreateProductInput } from '../models/types.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export const productRoutes = Router();

// Search products
productRoutes.get('/', async (req, res, next) => {
  try {
    const { query, category, maxRiskLevel, limit, offset } = req.query;
    const result = await productService.search({
      query: query as string,
      category: category as string,
      maxRiskLevel: maxRiskLevel as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Get product by ID
productRoutes.get('/:id', async (req, res, next) => {
  try {
    const product = await productService.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// Create product
productRoutes.post('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const input = CreateProductInput.parse(req.body);
    const providerId = req.user!.providerId;
    if (!providerId) {
      return res.status(403).json({ error: 'Must be a registered provider' });
    }
    const product = await productService.create(providerId, input);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

// Publish product
productRoutes.post('/:id/publish', async (req: AuthenticatedRequest, res, next) => {
  try {
    const providerId = req.user!.providerId;
    if (!providerId) {
      return res.status(403).json({ error: 'Must be a registered provider' });
    }
    const product = await productService.publish(req.params.id, providerId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// Get compliance/risk report
productRoutes.get('/:id/compliance', async (req, res, next) => {
  try {
    const assessment = await riskScorerService.getByProductId(req.params.id);
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    res.json(assessment);
  } catch (err) {
    next(err);
  }
});

// Get my listings (provider)
productRoutes.get('/my/listings', async (req: AuthenticatedRequest, res, next) => {
  try {
    const providerId = req.user!.providerId;
    if (!providerId) {
      return res.status(403).json({ error: 'Must be a registered provider' });
    }
    const products = await productService.getByProvider(providerId);
    res.json(products);
  } catch (err) {
    next(err);
  }
});

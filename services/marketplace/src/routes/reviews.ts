import { Router } from 'express';
import { reviewService } from '../services/reviewService.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export const reviewRoutes = Router();

// Submit a review
reviewRoutes.post('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const review = await reviewService.submit({
      ...req.body,
      reviewerId: req.user!.id,
    });
    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
});

// Get reviews for a product
reviewRoutes.get('/product/:productId', async (req, res, next) => {
  try {
    const { limit, offset } = req.query;
    const result = await reviewService.findByProduct(req.params.productId, {
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Get average rating for a product
reviewRoutes.get('/product/:productId/rating', async (req, res, next) => {
  try {
    const rating = await reviewService.getAverageRating(req.params.productId);
    if (!rating) {
      return res.json({ average: null, count: 0, distribution: {} });
    }
    res.json(rating);
  } catch (err) {
    next(err);
  }
});

// Mark review as helpful
reviewRoutes.post('/:id/helpful', async (req, res, next) => {
  try {
    const review = await reviewService.markHelpful(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    res.json(review);
  } catch (err) {
    next(err);
  }
});

// Get reviews by provider
reviewRoutes.get('/provider/:providerId', async (req, res, next) => {
  try {
    const reviews = await reviewService.findByProvider(req.params.providerId);
    res.json(reviews);
  } catch (err) {
    next(err);
  }
});

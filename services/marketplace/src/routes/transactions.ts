import { Router } from 'express';
import { transactionService } from '../services/transactionService.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export const transactionRoutes = Router();

// Initiate transaction
transactionRoutes.post('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { productId, licenseType, usageTerms, durationDays } = req.body;
    const transaction = await transactionService.initiate({
      buyerId: req.user!.id,
      productId,
      licenseType,
      usageTerms,
      durationDays,
    });
    res.status(201).json(transaction);
  } catch (err) {
    next(err);
  }
});

// Get transaction by ID
transactionRoutes.get('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const transaction = await transactionService.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    // Verify user is buyer or seller
    if (
      transaction.buyerId !== req.user!.id &&
      transaction.sellerId !== req.user!.providerId
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(transaction);
  } catch (err) {
    next(err);
  }
});

// Process payment
transactionRoutes.post('/:id/pay', async (req: AuthenticatedRequest, res, next) => {
  try {
    const transaction = await transactionService.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    if (transaction.buyerId !== req.user!.id) {
      return res.status(403).json({ error: 'Only buyer can pay' });
    }
    const result = await transactionService.processPayment(
      req.params.id,
      req.body
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Get my purchases
transactionRoutes.get('/my/purchases', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { status } = req.query;
    const transactions = await transactionService.getByBuyer(
      req.user!.id,
      status as string
    );
    res.json(transactions);
  } catch (err) {
    next(err);
  }
});

// Get my sales (provider)
transactionRoutes.get('/my/sales', async (req: AuthenticatedRequest, res, next) => {
  try {
    const providerId = req.user!.providerId;
    if (!providerId) {
      return res.status(403).json({ error: 'Must be a registered provider' });
    }
    const { status } = req.query;
    const transactions = await transactionService.getBySeller(
      providerId,
      status as string
    );
    res.json(transactions);
  } catch (err) {
    next(err);
  }
});

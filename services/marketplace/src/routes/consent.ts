import { Router } from 'express';
import { consentService } from '../services/consentService.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export const consentRoutes = Router();

// Record consent
consentRoutes.post('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const consent = await consentService.record(req.body);
    res.status(201).json(consent);
  } catch (err) {
    next(err);
  }
});

// Revoke consent
consentRoutes.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { reason } = req.body;
    const consent = await consentService.revoke(req.params.id, reason);
    if (!consent) {
      return res.status(404).json({ error: 'Consent not found or already revoked' });
    }
    res.json(consent);
  } catch (err) {
    next(err);
  }
});

// Get consents for a data subject (DSAR)
consentRoutes.get('/subject/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await consentService.handleDSAR(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Handle erasure request (Right to be Forgotten)
consentRoutes.post('/subject/:id/erasure', async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await consentService.handleErasureRequest(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Get active consents for a product
consentRoutes.get('/product/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const consents = await consentService.findActiveByProduct(req.params.id);
    res.json(consents);
  } catch (err) {
    next(err);
  }
});

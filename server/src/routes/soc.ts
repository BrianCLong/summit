// server/src/routes/soc.ts

import { Router } from 'express';
import { socStore } from '../security/soc/store';
import { randomUUID } from 'crypto';

const router = Router();

// Placeholder for authentication middleware
const isAuthenticated = (req, res, next) => {
  // In a real application, this would check for a valid session or token.
  // For now, we'll just simulate an authenticated user.
  (req as any).user = { id: 'admin-user', roles: ['soc-analyst'] };
  next();
};

// GET /api/soc/incidents - List incident candidates
router.get('/incidents', isAuthenticated, (req, res) => {
  const incidents = socStore.listIncidentCandidates();
  res.json(incidents);
});

// GET /api/soc/incidents/:id - Get incident details
router.get('/incidents/:id', isAuthenticated, (req, res) => {
  const incident = socStore.getIncidentCandidate(req.params.id);
  if (incident) {
    res.json(incident);
  } else {
    res.status(404).json({ error: 'Incident not found' });
  }
});

// GET /api/soc/incidents/:id/recommendations - Get recommendations for an incident
router.get('/incidents/:id/recommendations', isAuthenticated, (req, res) => {
  const recommendations = socStore.listRecommendationsForIncident(req.params.id);
  res.json(recommendations);
});

// POST /api/soc/recommendations/:id/approve - Approve a recommendation
router.post('/recommendations/:id/approve', isAuthenticated, (req, res) => {
  const recommendation = socStore.getRecommendation(req.params.id);
  if (!recommendation) {
    return res.status(404).json({ error: 'Recommendation not found' });
  }

  const approval = {
    id: randomUUID(),
    recommendationId: recommendation.id,
    approver: (req as any).user.id,
    timestamp: new Date(),
    decision: 'approved' as const,
    justification: req.body.justification,
  };

  socStore.addApproval(approval);

  // In a real application, this would also add an audit event.
  // For example: auditService.log('recommendation.approved', { recommendationId: recommendation.id });

  recommendation.status = 'approved';

  res.status(201).json(approval);
});

export default router;

import { Router } from 'express';
import { PolicyService } from '../services/policyService';

export function createPolicyRoutes(policyService: PolicyService): Router {
  const router = Router();

  router.post('/simulate', async (req, res) => {
    try {
      const result = await policyService.simulate(req.body);
      res.json(result);
    } catch (error) {
      console.error('Error in policy simulation route:', error);
      res.status(500).json({ error: 'Failed to simulate policy' });
    }
  });

  return router;
}

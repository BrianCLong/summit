import { Router } from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';
import { AssuranceService } from '../services/AssuranceService.js';

const router = Router();

// Read-only endpoint for assurance status
// Using the shared AssuranceService to ensure alignment with CI/CD signals
router.get('/status', ensureAuthenticated, async (req, res) => {
  try {
    const service = AssuranceService.getInstance();
    const result = await service.evaluate();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to evaluate assurance signals' });
  }
});

export const assuranceRoutes = router;

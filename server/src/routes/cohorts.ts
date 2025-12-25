import { Router } from 'express';
import { createCohort, getCohort, evaluateCohort } from '../analytics/cohorts/CohortController.js';

const router = Router();

// Admin only (assumed via mounting or future middleware)
router.post('/cohorts', createCohort);
router.get('/cohorts/:id', getCohort);
router.post('/cohorts/:id/evaluate', evaluateCohort);

export default router;

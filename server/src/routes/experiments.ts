import { Router } from 'express';
import {
    createExperiment,
    listExperiments,
    stopExperiment,
    getAssignment
} from './experiments/ExperimentController.js';

const router = Router();

// Admin endpoints (in real app, protect with admin role middleware)
router.post('/experiments', createExperiment);
router.get('/experiments', listExperiments);
router.post('/experiments/:id/stop', stopExperiment);

// User endpoint for assignment
router.get('/experiments/:id/assignment', getAssignment);

export default router;

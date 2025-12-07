import express from 'express';
import { GovernanceService } from '../services/GovernanceService.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = express.Router();
const governanceService = new GovernanceService();

// All governance endpoints require authentication
// In a real scenario, these might be service-to-service calls authenticated via mTLS or API Keys
// For now, we assume standard Auth
router.use(ensureAuthenticated);

router.post('/authorize', (req, res) => governanceService.authorize(req, res));
router.post('/simulate-policy', (req, res) => governanceService.simulatePolicy(req, res));
router.post('/log-access', (req, res) => governanceService.logAccess(req, res));
router.post('/reason-denial', (req, res) => governanceService.reasonDenial(req, res));

export default router;

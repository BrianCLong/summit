import { Router } from 'express';
import { OpaController } from '../controllers/OpaController.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = Router();

// Protect these routes as they allow arbitrary code execution (though in sandbox)
router.use(ensureAuthenticated);

router.get('/policies', OpaController.getPolicies);
router.get('/policies/:filename', OpaController.getPolicyContent);
router.post('/evaluate', OpaController.evaluatePolicy);
router.post('/validate', OpaController.validatePolicy);

export const opaRoutes = router;

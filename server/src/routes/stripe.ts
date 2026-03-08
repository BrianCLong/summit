import { Router } from 'express';
import { createCheckout } from '@summit/billing';
import logger from '../config/logger.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = Router();

router.post('/checkout', ensureAuthenticated, async (req, res) => {
  const { plan } = req.body;
  const tenantId = (req as any).user?.tenantId || (req as any).user?.tenant_id;

  if (!tenantId) {
    return res.status(401).json({ error: 'Unauthorized: Tenant context required' });
  }

  try {
    const session = await createCheckout(tenantId, plan);
    res.json({ url: session.url });
  } catch (err: any) {
    logger.error({ err: err.message, tenantId, plan }, 'Failed to create Stripe checkout session');
    res.status(500).json({ error: err.message });
  }
});

export default router;

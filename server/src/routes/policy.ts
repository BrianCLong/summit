import { Router } from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';
import {
  OverlayContext,
  PolicySimulationInput,
  policySimulationInputSchema,
  simulatePolicyDecision,
  overlayContextSchema,
  tenantPolicyBundleSchema,
} from '../policy/tenantBundle.js';

const router = Router();

router.use(ensureAuthenticated);

router.post('/simulate', (req, res) => {
  try {
    const { bundle, input, overlayContext } = req.body || {};
    const parsedBundle = tenantPolicyBundleSchema.parse(bundle);
    const parsedInput: PolicySimulationInput = policySimulationInputSchema.parse(input);
    const context: OverlayContext | undefined = overlayContext
      ? overlayContextSchema.parse(overlayContext)
      : undefined;

    const result = simulatePolicyDecision(parsedBundle, parsedInput, context);
    return res.json({ ok: true, result });
  } catch (error: any) {
    const status = error?.name === 'ZodError' ? 400 : 500;
    return res.status(status).json({
      ok: false,
      error: error?.errors || error?.message || 'policy simulation failed',
    });
  }
});

export const policyRouter = router;

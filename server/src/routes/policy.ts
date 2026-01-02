import express from 'express';
import { z } from 'zod';
import { simulatePolicyDecision, policySimulationInputSchema, overlayContextSchema } from '../policy/tenantBundle.js';
import { Profiles } from '../policy/profiles.js';
import { ensureAuthenticated } from '../middleware/auth.js';

// Named export for compatibility (reverted from default)
export const policyRouter = express.Router();

policyRouter.post('/simulate', ensureAuthenticated, async (req, res) => {
  try {
    const input = policySimulationInputSchema.parse(req.body);
    const context = req.body.context ? overlayContextSchema.parse(req.body.context) : undefined;

    // Check if the request specifies a template/profile
    let bundle = Profiles.strict;
    // We treat 'profile' as an extra field outside the schema for simulation purposes
    if ((req.body as any).profile === 'balanced') bundle = Profiles.balanced;
    if ((req.body as any).profile === 'fast_ops') bundle = Profiles.fast_ops;

    const result = simulatePolicyDecision(bundle, input, context);

    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

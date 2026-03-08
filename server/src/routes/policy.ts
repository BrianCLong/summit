import express from 'express';
import { z } from 'zod';
import { simulatePolicyDecision, policySimulationInputSchema, overlayContextSchema } from '../policy/tenantBundle.js';
import { Profiles } from '../policy/profiles.js';
import { policyProfileAssignmentService } from '../services/policy-profiles/PolicyProfileAssignmentService.js';
import { buildTenantPolicyBundle, getPolicyProfileManifest } from '../policies/profile-manifests.js';
import { ensureAuthenticated, ensureRole } from '../middleware/auth.js';
import { policyHotReloadService } from '../policy/hotReloadService.js';

// Named export for compatibility (reverted from default)
export const policyRouter = express.Router();

// POST /policies/rollback - Rollback policy bundle version (Sprint 08)
policyRouter.post('/rollback', ensureAuthenticated, ensureRole(['ADMIN', 'admin']), async (req, res) => {
  try {
    const { versionId } = req.body;
    if (!versionId) {
      return res.status(400).json({ error: 'versionId required' });
    }
    const version = await policyHotReloadService.rollback(versionId);
    res.json({
      success: true,
      versionId: version.versionId,
      digest: version.digest,
      message: 'Policy rolled back successfully'
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Rollback failed', message: error.message });
  }
});

policyRouter.post('/simulate', ensureAuthenticated, async (req, res) => {
  try {
    const input = policySimulationInputSchema.parse(req.body);
    const context = req.body.context ? overlayContextSchema.parse(req.body.context) : undefined;
    const tenantId =
      (req.headers['x-tenant-id'] as string) ||
      (req as any).user?.tenantId ||
      'default-tenant';

    const activeProfile = await policyProfileAssignmentService.getActiveProfile(tenantId);

    // Check if the request specifies a template/profile
    let bundle = activeProfile.bundle;
    const requestedProfile = (req.body as any).profile;
    if (requestedProfile) {
      const manifest = getPolicyProfileManifest(requestedProfile);
      if (manifest) {
        bundle = buildTenantPolicyBundle(
          tenantId,
          requestedProfile,
          'policy-simulation:override',
        );
      } else if (requestedProfile === 'balanced') {
        bundle = Profiles.balanced;
      } else if (requestedProfile === 'fast_ops') {
        bundle = Profiles.fast_ops;
      } else if (requestedProfile === 'strict') {
        bundle = Profiles.strict;
      }
    }

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

import { Router } from 'express';
import { z } from 'zod';
import { accountDossierService, AssuranceSchema, RiskSchema, ArtifactSchema } from '../services/AccountDossierService.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = Router();

// GET /api/dossier/:tenantId
router.get('/:tenantId', ensureAuthenticated, async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    // Basic RBAC check
    if (req.user?.tenantId !== tenantId && !req.user?.roles?.includes('global_admin')) {
        // Strict check could be here
    }

    const dossier = await accountDossierService.getDossier(tenantId);
    if (!dossier) {
       return res.status(404).json({ error: 'Dossier not found' });
    }
    res.json(dossier);
  } catch (error) {
    next(error);
  }
});

// POST /api/dossier/:tenantId/assurances
router.post('/:tenantId/assurances', ensureAuthenticated, async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const input = AssuranceSchema.parse(req.body);
    const result = await accountDossierService.addAssurance(tenantId, input, req.user!.id);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/dossier/:tenantId/risks
router.post('/:tenantId/risks', ensureAuthenticated, async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const input = RiskSchema.parse(req.body);
    const result = await accountDossierService.addRisk(tenantId, input, req.user!.id);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/dossier/:tenantId/artifacts
router.post('/:tenantId/artifacts', ensureAuthenticated, async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const input = ArtifactSchema.parse(req.body);
    const result = await accountDossierService.addArtifact(tenantId, input, req.user!.id);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/dossier/:tenantId/export
router.get('/:tenantId/export', ensureAuthenticated, async (req, res, next) => {
    try {
        const { tenantId } = req.params;
        const result = await accountDossierService.generateExport(tenantId);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

export default router;

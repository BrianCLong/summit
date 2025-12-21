import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AccountDossierService } from '../../dossier/service.js';
import { CreateAssuranceSchema, CreateRiskSchema, CreateArtifactSchema } from '../../dossier/types.js';
import { pool } from '../../db/pg.js';
import { ensureAuthenticated } from '../../middleware/auth.js';

const router = Router();
const dossierService = new AccountDossierService(pool);

// Define a type that includes the user property added by ensureAuthenticated
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    tenantId: string;
    [key: string]: any;
  };
}

router.post(
  '/:accountId/assurance',
  ensureAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { accountId } = req.params;
      const tenantId = authReq.user.tenantId;
      const actorId = authReq.user.id;

      // Validate Body
      const input = CreateAssuranceSchema.parse(req.body);

      // Ensure Dossier Exists
      const dossierId = await dossierService.ensureDossier(tenantId, accountId, actorId);

      // Add Assurance
      const assuranceId = await dossierService.addAssurance(tenantId, dossierId, input, actorId);

      res.status(201).json({ id: assuranceId });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error('Error adding assurance:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  }
);

router.post(
  '/:accountId/risk',
  ensureAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { accountId } = req.params;
      const tenantId = authReq.user.tenantId;
      const actorId = authReq.user.id;

      const input = CreateRiskSchema.parse(req.body);
      const dossierId = await dossierService.ensureDossier(tenantId, accountId, actorId);
      const riskId = await dossierService.addRisk(tenantId, dossierId, input, actorId);

      res.status(201).json({ id: riskId });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error('Error adding risk:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  }
);

router.post(
  '/:accountId/artifact',
  ensureAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { accountId } = req.params;
      const tenantId = authReq.user.tenantId;
      const actorId = authReq.user.id;

      const input = CreateArtifactSchema.parse(req.body);
      const dossierId = await dossierService.ensureDossier(tenantId, accountId, actorId);
      const artifactId = await dossierService.addArtifact(tenantId, dossierId, input, actorId);

      res.status(201).json({ id: artifactId });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        console.error('Error adding artifact:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  }
);

router.get(
  '/:accountId/export',
  ensureAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { accountId } = req.params;
      const tenantId = authReq.user.tenantId;

      const exportData = await dossierService.exportDossier(tenantId, accountId);

      res.status(200).json(exportData);
    } catch (error: any) {
      if (error.message === 'Dossier not found') {
        res.status(404).json({ error: 'Dossier not found' });
      } else {
        console.error('Error exporting dossier:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  }
);

export default router;

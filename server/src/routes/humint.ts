import express, { Request, Response } from 'express';
import { HumintService } from '../services/HumintService.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import { tenantContext } from '../middleware/tenantContext.js';
import { z } from 'zod';
import { SourceReliability, SourceStatus, ReportGrading, ReportStatus, RequirementPriority } from '../types/humint.js';

const router = express.Router();
const service = HumintService.getInstance();

// Middleware
router.use(ensureAuthenticated);
router.use(tenantContext);

// --- Sources ---

const createSourceSchema = z.object({
  cryptonym: z.string(),
  reliability: z.nativeEnum(SourceReliability),
  accessLevel: z.string(),
  status: z.nativeEnum(SourceStatus),
  recruitedAt: z.string().datetime().optional(),
});

router.post('/sources', async (req: Request, res: Response) => {
  try {
    const data = createSourceSchema.parse(req.body);
    const tenantId = req.user!.tenantId; // ensureAuthenticated guarantees req.user
    const source = await service.createSource(tenantId, req.user!.id, {
      ...data,
      recruitedAt: data.recruitedAt ? new Date(data.recruitedAt) : undefined,
    });
    res.json(source);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.get('/sources', async (req: Request, res: Response) => {
  try {
    const sources = await service.listSources(req.user!.tenantId);
    res.json(sources);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.get('/sources/:id', async (req: Request, res: Response) => {
  try {
    const source = await service.getSource(req.user!.tenantId, req.params.id);
    if (!source) return res.status(404).json({ error: 'Source not found' });
    res.json(source);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// --- Reports ---

const createReportSchema = z.object({
  sourceId: z.string(),
  content: z.string(),
  grading: z.nativeEnum(ReportGrading),
  disseminationList: z.array(z.string()).optional(),
});

router.post('/reports', async (req: Request, res: Response) => {
  try {
    const data = createReportSchema.parse(req.body);
    const report = await service.createReport(req.user!.tenantId, req.user!.id, data);
    res.json(report);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.get('/reports', async (req: Request, res: Response) => {
  try {
    const sourceId = req.query.sourceId as string | undefined;
    const reports = await service.listReports(req.user!.tenantId, sourceId);
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.patch('/reports/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!Object.values(ReportStatus).includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    const report = await service.updateReportStatus(req.user!.tenantId, req.params.id, status);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// --- Debriefs ---

const debriefSchema = z.object({
  sourceId: z.string(),
  date: z.string().datetime(),
  location: z.string(),
  notes: z.string(),
});

router.post('/debriefs', async (req: Request, res: Response) => {
  try {
    const data = debriefSchema.parse(req.body);
    const debrief = await service.logDebrief(req.user!.tenantId, req.user!.id, {
      ...data,
      date: new Date(data.date),
    });
    res.json(debrief);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// --- Requirements ---

const requirementSchema = z.object({
  description: z.string(),
  priority: z.nativeEnum(RequirementPriority),
  deadline: z.string().datetime().optional(),
  assignedTo: z.string().optional(),
});

router.post('/requirements', async (req: Request, res: Response) => {
  try {
    const data = requirementSchema.parse(req.body);
    const reqItem = await service.createRequirement(req.user!.tenantId, {
      ...data,
      deadline: data.deadline ? new Date(data.deadline) : undefined,
    });
    res.json(reqItem);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// --- Network/Graph ---

router.post('/sources/:id/relationships', async (req: Request, res: Response) => {
  try {
    const { targetName, relationshipType, notes } = req.body;
    await service.addSourceRelationship(req.user!.tenantId, req.params.id, targetName, relationshipType, notes);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.get('/sources/:id/network', async (req: Request, res: Response) => {
  try {
    const network = await service.getSourceNetwork(req.user!.tenantId, req.params.id);
    res.json(network);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// --- CI Screening ---

router.post('/sources/:id/screen', async (req: Request, res: Response) => {
  try {
    const result = await service.runCIScreening(req.user!.tenantId, req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;

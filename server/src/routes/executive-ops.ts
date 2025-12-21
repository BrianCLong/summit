import express, { Request, Response } from 'express';
import { pg } from '../db/pg.js';
import {
  ExecutiveOpsRepository,
  IncidentMarkerInput,
  KpiValueInput,
  ReleaseMarkerInput,
  RiskInput,
} from '../executive-ops/ExecutiveOpsRepository.js';

const router = express.Router();

const getTenantId = (req: Request) => (req as any).tenantId || (req as any).user?.tenantId || 'global';

const getRepository = (req: Request) => {
  const tenantId = getTenantId(req);
  const repo = new ExecutiveOpsRepository(pg, tenantId);
  return repo;
};

router.use(express.json());

router.post('/kpis/:slug/values', async (req: Request, res: Response) => {
  try {
    const repo = getRepository(req);
    await repo.initialize();
    const payload: KpiValueInput = {
      ...req.body,
      kpiSlug: req.params.slug,
    };
    const id = await repo.recordKpiValue(payload);
    const scoreboard = await repo.getScoreboard();
    res.status(201).json({ id, scoreboard });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/scoreboard', async (req: Request, res: Response) => {
  try {
    const repo = getRepository(req);
    await repo.initialize();
    const segmentFilter = req.query.segment
      ? (JSON.parse(String(req.query.segment)) as Record<string, string>)
      : undefined;
    const scoreboard = await repo.getScoreboard({ segment: segmentFilter });
    res.json({ scoreboard });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/release-markers', async (req: Request, res: Response) => {
  try {
    const repo = getRepository(req);
    await repo.initialize();
    const payload = req.body as ReleaseMarkerInput;
    const id = await repo.addReleaseMarker(payload);
    res.status(201).json({ id });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/incident-markers', async (req: Request, res: Response) => {
  try {
    const repo = getRepository(req);
    await repo.initialize();
    const payload = req.body as IncidentMarkerInput;
    const id = await repo.addIncidentMarker(payload);
    res.status(201).json({ id });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/risks', async (req: Request, res: Response) => {
  try {
    const repo = getRepository(req);
    await repo.initialize();
    const payload = req.body as RiskInput;
    const id = await repo.upsertRisk(payload);
    const risks = await repo.listTopRisks();
    res.status(201).json({ id, risks });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/risks/:id/acceptance', async (req: Request, res: Response) => {
  try {
    const repo = getRepository(req);
    await repo.initialize();
    const expiry = req.body?.acceptanceExpiry as string;
    if (!expiry) {
      return res.status(400).json({ error: 'acceptanceExpiry is required' });
    }
    await repo.updateRiskAcceptance(req.params.id, expiry);
    const risks = await repo.listTopRisks();
    res.json({ risks });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export const executiveOpsRouter = router;

export default router;

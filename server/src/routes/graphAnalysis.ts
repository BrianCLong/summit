import express, { Request, Response, NextFunction } from 'express';
import { GraphAnalysisService } from '../analysis/GraphAnalysisService.js';
import { GraphAlgorithmKey } from '../analysis/graphTypes.js';

const router = express.Router();
const service = GraphAnalysisService.getInstance();
const singleParam = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] : value ?? '';
const singleQuery = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

// Helper to get tenantId (assuming request is authenticated and has user.tenantId)
const getTenantId = (req: Request): string => {
  const user = (req as any).user;
  if (!user || !user.tenantId) {
    throw new Error('Tenant ID missing from request context');
  }
  return user.tenantId;
};

// POST /api/graph/analysis/run
router.post('/run', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const { algorithm, params } = req.body;

    if (!algorithm) {
      res.status(400).json({ error: 'Missing algorithm' });
      return;
    }

    // Validate algorithm key
    const validAlgorithms: GraphAlgorithmKey[] = [
      'shortestPath',
      'kHopNeighborhood',
      'degreeCentrality',
      'connectedComponents'
    ];
    if (!validAlgorithms.includes(algorithm as GraphAlgorithmKey)) {
        res.status(400).json({ error: `Invalid algorithm. Must be one of: ${validAlgorithms.join(', ')}` });
        return;
    }

    const job = await service.createJob(tenantId, algorithm as GraphAlgorithmKey, params || {});

    // For MVP synchronous execution if requested or short jobs
    if (singleQuery(req.query.async as string | string[] | undefined) === 'true') {
         // Fire and forget (or rather, run in background)
         service.runJob(job.id).catch(err => console.error(err));
         res.json({ jobId: job.id, status: 'pending' });
    } else {
        const completedJob = await service.runJob(job.id);
        if (completedJob.status === 'failed') {
             res.status(500).json({ error: completedJob.error, jobId: job.id });
        } else {
             res.json(completedJob);
        }
    }
  } catch (error: any) {
    next(error);
  }
});

// GET /api/graph/analysis/:jobId
router.get('/:jobId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const jobId = singleParam(req.params.jobId);

    const job = service.getJob(jobId, tenantId);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    res.json(job);
  } catch (error: any) {
    next(error);
  }
});

export default router;

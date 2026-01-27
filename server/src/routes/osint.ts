// @ts-nocheck
import express, { type Request, type Response } from 'express';
// import { OSINTPrioritizationService } from '../services/OSINTPrioritizationService.js';
// import { VeracityScoringService } from '../services/VeracityScoringService.js';
import { osintQueue } from '../services/OSINTQueueService.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import { osintRateLimiter } from '../middleware/osintRateLimiter.js';
import { getPostgresPool } from '../db/postgres.js';
import { SimpleFeedCollector } from '../../packages/osint-collector/src/collectors/SimpleFeedCollector.js';
import { CollectionType, TaskStatus } from '../../packages/osint-collector/src/types/index.js';
import { MaestroEngine, RunContext } from '../../packages/maestro-core/src/engine.js';
import { RiskAssessmentPlugin } from '../../packages/maestro-core/src/plugins/risk_assessment.js';
import fs from 'fs';
import path from 'path';

interface AuthenticatedRequest extends Request {
  user?: {
    tenantId?: string;
  };
}

const router = express.Router();
// const prioritizationService = new OSINTPrioritizationService();
// const veracityService = new VeracityScoringService();

router.use(osintRateLimiter);

// --- Initialization of Local Maestro Engine for MVP Slice ---
const maestroStateStore = {
  createRun: async () => {},
  updateRunStatus: async () => {},
  getRunStatus: async () => 'pending',
  getRunDetails: async () => ({}),
  createStepExecution: async () => {},
  updateStepExecution: async () => {},
  getStepExecution: async () => null
};
const maestroArtifactStore = {
  store: async () => 'path',
  retrieve: async () => Buffer.from(''),
  list: async () => []
};
const maestroPolicyEngine = {
  check: async () => ({ allowed: true })
};

const localMaestro = new MaestroEngine(
  maestroStateStore as any,
  maestroArtifactStore as any,
  maestroPolicyEngine as any
);

// Register Plugins
localMaestro.registerPlugin(new SimpleFeedCollector({ name: 'simple-feed-collector', type: CollectionType.WEB_SCRAPING, enabled: true }));
localMaestro.registerPlugin(new RiskAssessmentPlugin());

// --- Routes ---

// Trigger prioritization cycle
router.post('/prioritize', ensureAuthenticated, async (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'OSINTPrioritizationService not implemented' });
});

// Manually trigger scoring for an entity
router.post('/score/:id', ensureAuthenticated, async (req: Request, res: Response) => {
  res.status(501).json({ success: false, error: 'VeracityScoringService not implemented' });
});

// Ingest OSINT Feed (Thin Slice)
router.post('/ingest-feed', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { url } = req.body;

    // Use the Real Collector
    const collector = new SimpleFeedCollector({
      name: 'on-demand-feed',
      type: CollectionType.WEB_SCRAPING,
      enabled: true,
      feedUrl: url
    });

    await collector.initialize();

    const result = await collector.collect({
      id: `manual-${Date.now()}`,
      type: CollectionType.WEB_SCRAPING,
      source: url,
      target: 'iocs',
      priority: 1,
      scheduledAt: new Date(),
      status: TaskStatus.PENDING,
      config: { url }
    });

    // Persist to Database
    const pg = getPostgresPool();
    const iocs = result.data as any[];
    let insertedCount = 0;

    // Batch insert would be better but simple loop for MVP slice
    for (const ioc of iocs) {
      await pg.query(
        `INSERT INTO iocs (type, value, source, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT DO NOTHING`, // simplified handling
        [ioc.type, ioc.value, ioc.source]
      );
      insertedCount++;
    }

    res.json({
      success: true,
      message: 'Feed ingested and persisted',
      count: insertedCount,
      data: iocs.slice(0, 5) // Return sample
    });
  } catch (error: any) {
    console.error('Ingest error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Run Risk Assessment (Local LLM Slice)
router.post('/assess-risk', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { iocs } = req.body;
    if (!iocs || !Array.isArray(iocs)) {
       return res.status(400).json({ success: false, error: 'iocs array required' });
    }

    // Reuse Logic via Plugin
    const plugin = new RiskAssessmentPlugin();
    const result = await plugin.execute(
      { parameters: { iocs } } as any,
      {} as any,
      {} as any
    );

    res.json({
      success: true,
      results: result.output
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Trigger Maestro Workflow (Integration Critical Path)
router.post('/workflow', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { feedUrl } = req.body;
    if (!feedUrl) return res.status(400).json({ error: 'feedUrl required' });

    const templatePath = path.resolve(process.cwd(), 'packages/maestro-core/src/templates/osint-risk-analysis.json');
    if (!fs.existsSync(templatePath)) {
        return res.status(500).json({ error: 'Workflow template not found' });
    }

    let workflow = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

    // Inject Parameters
    workflow.steps[0].config.url = feedUrl;

    const runId = `run-${Date.now()}`;

    // Execute Workflow on Local Engine
    await localMaestro.startRun({
      run_id: runId,
      workflow,
      tenant_id: 'default',
      triggered_by: 'api',
      environment: 'dev',
      parameters: { feedUrl }
    });

    res.json({
      success: true,
      message: 'Maestro workflow started',
      runId,
      template: workflow.name,
    });
  } catch (error: any) {
     console.error('Workflow trigger failed', error);
     res.status(500).json({ success: false, error: error.message });
  }
});

// Get queue status
router.get('/queue', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const counts = await osintQueue.getJobCounts();
    res.json({ success: true, counts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

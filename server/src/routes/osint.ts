// @ts-nocheck
import express, { type Request, type Response } from 'express';
// import { OSINTPrioritizationService } from '../services/OSINTPrioritizationService.js';
// import { VeracityScoringService } from '../services/VeracityScoringService.js';
import { osintQueue } from '../services/OSINTQueueService.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import { osintRateLimiter } from '../middleware/osintRateLimiter.js';
import { getPostgresPool } from '../db/postgres.js';
import { SimpleFeedCollector } from '../../../packages/osint-collector/src/collectors/SimpleFeedCollector.js';
import { CollectionType, TaskStatus } from '../../../packages/osint-collector/src/types/index.js';
import { securityAudit } from '../audit/security-audit-logger.js';

interface AuthenticatedRequest extends Request {
  user?: {
    tenantId?: string;
  };
}

const router = express.Router();
// const prioritizationService = new OSINTPrioritizationService();
// const veracityService = new VeracityScoringService();

router.use(osintRateLimiter);

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

    securityAudit.logDataImport({
      actor: (req as AuthenticatedRequest).user?.tenantId ?? 'unknown',
      tenantId: (req as AuthenticatedRequest).user?.tenantId,
      resourceType: 'osint_feed',
      resourceId: url ?? 'unknown',
      action: 'ingest',
      details: { feedUrl: url },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      dataClassification: 'confidential',
    });

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

    securityAudit.logSensitiveRead({
      actor: (req as AuthenticatedRequest).user?.tenantId ?? 'unknown',
      tenantId: (req as AuthenticatedRequest).user?.tenantId,
      resourceType: 'osint_risk_assessment',
      resourceId: `batch-${iocs.length}`,
      action: 'assess',
      details: { iocCount: iocs.length },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      dataClassification: 'confidential',
    });

    const results = [];
    const llmEndpoint = process.env.LLM_ENDPOINT;

    for (const ioc of iocs) {
      let riskAssessment;

      // Try Real LLM if configured
      if (llmEndpoint) {
        try {
          const response = await fetch(`${llmEndpoint}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: `Assess the cybersecurity risk of the following IOC: ${ioc.value}. Return JSON with "score" (0-1) and "summary".`,
              model: 'llama3'
            })
          });
          if (response.ok) {
            const data = await response.json();
            riskAssessment = {
              ioc: ioc.value,
              risk_score: data.score || 0.5,
              risk_summary: data.summary || 'AI Assessment',
              model: 'llama3-local'
            };
          }
        } catch (e) {
          console.warn('LLM connection failed, falling back to heuristic', e);
        }
      }

      // Fallback Heuristic
      if (!riskAssessment) {
        riskAssessment = {
          ioc: ioc.value,
          risk_score: ioc.value.includes('192') || ioc.value.includes('127') ? 0.1 : 0.7,
          risk_summary: ioc.value.includes('192')
            ? 'Low risk local network address.'
            : 'Potential public IP, requires further investigation.',
          model: 'heuristic-v1'
        };
      }
      results.push(riskAssessment);
    }

    res.json({
      success: true,
      results
    });
  } catch (error: any) {
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
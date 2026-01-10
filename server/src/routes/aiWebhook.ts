import { Router } from 'express';
import crypto from 'crypto';
import { pubsub } from '../realtime/pubsub.js';
import { randomUUID as uuid } from 'node:crypto';
import { logger } from '../utils/logger.js';
import { createRouteRateLimitMiddleware } from '../middleware/rateLimit.js';

const router = Router();
const webhookRateLimit = createRouteRateLimitMiddleware('webhookIngest');

function verifySignature(body: Buffer, sig: string): boolean {
  const secret = process.env.ML_WEBHOOK_SECRET;
  if (!secret) {
    logger.error('ML_WEBHOOK_SECRET is not configured');
    return false;
  }

  if (!body) {
    return false;
  }

  const h = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const digestBuffer = Buffer.from(h);
  const sigBuffer = Buffer.from(sig || '');

  try {
    if (digestBuffer.length !== sigBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(digestBuffer, sigBuffer);
  } catch (error: any) {
    return false;
  }
}

router.post('/ai/webhook', webhookRateLimit, async (req, res) => {
  const sig = req.header('X-IntelGraph-Signature') || '';

  // Sentinel: CRITICAL Fix - Do not fallback to JSON.stringify(req.body)
  // JSON serialization is non-deterministic and can be manipulated to bypass signature checks.
  // We must rely on the raw buffer captured by the express.json() verify hook.
  const raw = (req as any).rawBody;

  if (!raw) {
    logger.error('Webhook received without rawBody. Ensure express.json() is configured with verify hook.');
    return res.status(500).json({ error: 'System configuration error' });
  }

  if (!verifySignature(raw, sig)) {
    logger.warn('Invalid webhook signature attempt');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const evt = req.body; // Body is already parsed by express.json()
  const { job_id, kind } = evt;
  const db = (req as any).db;

  // Ideally db should be typed, but for now we assume it's injected middleware
  if (!db) {
    logger.error('Database connection missing in request context');
    return res.status(500).json({ error: 'Database unavailable' });
  }

  try {
    await db.jobs.update(job_id, {
      status: 'SUCCESS',
      finishedAt: new Date().toISOString(),
    });

    const insights = normalizeInsights(evt);
    for (const payload of insights) {
      const ins = await db.insights.insert({
        id: uuid(),
        jobId: job_id,
        kind,
        payload,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });
      pubsub.publish(`INSIGHT_PENDING_${kind || '*'}`, ins);
    }
    pubsub.publish(`AI_JOB_${job_id}`, { id: job_id, kind, status: 'SUCCESS' });
    await db.audit.insert({
      id: uuid(),
      type: 'ML_WEBHOOK',
      actorId: 'ml-service',
      createdAt: new Date().toISOString(),
      meta: { jobId: job_id, kind, count: insights.length },
    });
    res.json({ ok: true });
  } catch (error: any) {
    logger.error('Error processing AI webhook', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

function normalizeInsights(evt: any) {
  if (evt.kind === 'nlp_entities') return evt.results;
  if (evt.kind === 'entity_resolution') return evt.links;
  if (evt.kind === 'link_prediction') return evt.predictions;
  if (evt.kind === 'community_detect') return evt.communities;
  return [evt];
}

export default router;

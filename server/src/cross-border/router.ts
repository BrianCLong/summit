/**
 * Cross-Border HTTP Router
 *
 * Express router for cross-border assistant REST API endpoints.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getCrossBorderGateway } from './gateway.js';
import { getResilienceManager } from './resilience.js';
import { getCrossBorderMetrics, updateActiveSessions, updateActivePartners } from './metrics.js';
import type { DataClassification } from './types.js';

const router = Router();

/**
 * Error handler middleware
 */
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * GET /cross-border/health
 * Health check endpoint
 */
router.get('/health', (_req, res) => {
  const gateway = getCrossBorderGateway();
  const status = gateway.getStatus();

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    ...status,
  });
});

/**
 * GET /cross-border/status
 * Detailed status endpoint
 */
router.get('/status', (_req, res) => {
  const gateway = getCrossBorderGateway();
  const resilience = getResilienceManager();

  res.json({
    gateway: gateway.getStatus(),
    resilience: resilience.getMetrics(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /cross-border/metrics
 * Prometheus metrics endpoint
 */
router.get('/metrics', (_req, res) => {
  const gateway = getCrossBorderGateway();
  const status = gateway.getStatus();

  // Update gauge metrics
  updateActiveSessions(status.activeSessions);
  updateActivePartners(status.activePartners);

  const metrics = getCrossBorderMetrics();
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.send(metrics.toPrometheus());
});

/**
 * GET /cross-border/partners
 * List all partners
 */
router.get('/partners', (_req, res) => {
  const gateway = getCrossBorderGateway();
  const partners = gateway.getPartners();

  res.json({
    count: partners.length,
    partners: partners.map((p) => ({
      code: p.code,
      name: p.name,
      region: p.region,
      status: p.status,
      languages: p.languages,
      domains: p.capabilities.domains,
      trustLevel: p.trustLevel.level,
    })),
  });
});

/**
 * GET /cross-border/partners/:code
 * Get partner details
 */
router.get('/partners/:code', (req, res) => {
  const gateway = getCrossBorderGateway();
  const partner = gateway.getPartner(req.params.code);

  if (!partner) {
    res.status(404).json({ error: 'Partner not found' });
    return;
  }

  const health = gateway.getPartnerHealth(req.params.code);

  res.json({
    ...partner,
    health,
  });
});

/**
 * GET /cross-border/partners/:code/health
 * Get partner health status
 */
router.get('/partners/:code/health', (req, res) => {
  const gateway = getCrossBorderGateway();
  const health = gateway.getPartnerHealth(req.params.code);

  if (!health) {
    res.status(404).json({ error: 'Partner health not found' });
    return;
  }

  res.json(health);
});

/**
 * POST /cross-border/partners/search
 * Search for partners by criteria
 */
router.post(
  '/partners/search',
  asyncHandler(async (req, res) => {
    const gateway = getCrossBorderGateway();
    const { domain, language, classification, region } = req.body;

    let partners = gateway.getPartners();

    if (domain) {
      partners = gateway.findPartnersByDomain(domain);
    }

    if (language) {
      partners = partners.filter((p) => p.languages.includes(language));
    }

    if (region) {
      partners = partners.filter((p) => p.region === region);
    }

    res.json({
      count: partners.length,
      partners: partners.map((p) => ({
        code: p.code,
        name: p.name,
        region: p.region,
        status: p.status,
        languages: p.languages,
        domains: p.capabilities.domains,
      })),
    });
  })
);

/**
 * POST /cross-border/sessions
 * Create a new cross-border session
 */
router.post(
  '/sessions',
  asyncHandler(async (req, res) => {
    const gateway = getCrossBorderGateway();
    const { targetNation, intent, language, dataClassification } = req.body;

    if (!targetNation || !intent || !language) {
      res.status(400).json({
        error: 'Missing required fields: targetNation, intent, language',
      });
      return;
    }

    const session = await gateway.createSession({
      targetNation,
      intent,
      language,
      context: dataClassification
        ? { dataClassification: dataClassification as DataClassification }
        : undefined,
    });

    res.status(201).json({
      sessionId: session.id,
      state: session.state,
      originNation: session.originNation,
      targetNation: session.targetNation,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    });
  })
);

/**
 * GET /cross-border/sessions
 * List active sessions
 */
router.get('/sessions', (_req, res) => {
  const gateway = getCrossBorderGateway();
  const sessions = gateway.getActiveSessions();

  res.json({
    count: sessions.length,
    sessions: sessions.map((s) => ({
      id: s.id,
      state: s.state,
      originNation: s.originNation,
      targetNation: s.targetNation,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    })),
  });
});

/**
 * GET /cross-border/sessions/:id
 * Get session details
 */
router.get('/sessions/:id', (req, res) => {
  const gateway = getCrossBorderGateway();
  const session = gateway.getSession(req.params.id);

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  res.json(session);
});

/**
 * POST /cross-border/sessions/:id/messages
 * Send a message in a session
 */
router.post(
  '/sessions/:id/messages',
  asyncHandler(async (req, res) => {
    const gateway = getCrossBorderGateway();
    const { content, translate, targetLanguage } = req.body;

    if (!content) {
      res.status(400).json({ error: 'Missing required field: content' });
      return;
    }

    const message = await gateway.sendMessage(req.params.id, content, {
      translate,
      targetLanguage,
    });

    res.status(201).json(message);
  })
);

/**
 * GET /cross-border/sessions/:id/messages
 * Get messages for a session
 */
router.get('/sessions/:id/messages', (req, res) => {
  const gateway = getCrossBorderGateway();
  const messages = gateway.getMessages(req.params.id);

  res.json({
    count: messages.length,
    messages,
  });
});

/**
 * POST /cross-border/sessions/:id/complete
 * Complete a session
 */
router.post(
  '/sessions/:id/complete',
  asyncHandler(async (req, res) => {
    const gateway = getCrossBorderGateway();
    await gateway.completeSession(req.params.id);

    res.json({ success: true });
  })
);

/**
 * POST /cross-border/sessions/:id/handover
 * Initiate handover to another partner
 */
router.post(
  '/sessions/:id/handover',
  asyncHandler(async (req, res) => {
    const gateway = getCrossBorderGateway();
    const { targetNation, reason } = req.body;

    if (!targetNation || !reason) {
      res.status(400).json({
        error: 'Missing required fields: targetNation, reason',
      });
      return;
    }

    const response = await gateway.initiateHandover(
      req.params.id,
      targetNation,
      reason
    );

    res.json(response);
  })
);

/**
 * POST /cross-border/translate
 * Translate text
 */
router.post(
  '/translate',
  asyncHandler(async (req, res) => {
    const gateway = getCrossBorderGateway();
    const { text, targetLanguage, sourceLanguage } = req.body;

    if (!text || !targetLanguage) {
      res.status(400).json({
        error: 'Missing required fields: text, targetLanguage',
      });
      return;
    }

    const translatedText = await gateway.translate(
      text,
      targetLanguage,
      sourceLanguage
    );

    res.json({
      originalText: text,
      translatedText,
      sourceLanguage: sourceLanguage || 'auto',
      targetLanguage,
    });
  })
);

/**
 * POST /cross-border/detect-language
 * Detect language of text
 */
router.post(
  '/detect-language',
  asyncHandler(async (req, res) => {
    const gateway = getCrossBorderGateway();
    const { text } = req.body;

    if (!text) {
      res.status(400).json({ error: 'Missing required field: text' });
      return;
    }

    const detection = await gateway.detectLanguage(text);
    res.json(detection);
  })
);

/**
 * GET /cross-border/languages
 * Get supported languages
 */
router.get('/languages', (_req, res) => {
  const gateway = getCrossBorderGateway();
  const languages = gateway.getSupportedLanguages();

  res.json({
    count: languages.length,
    languages,
  });
});

/**
 * POST /cross-border/handover/accept
 * Accept an incoming handover (called by partner assistants)
 */
router.post(
  '/handover/accept',
  asyncHandler(async (req, res) => {
    const gateway = getCrossBorderGateway();
    const response = await gateway.acceptHandover(req.body);
    res.json(response);
  })
);

/**
 * GET /cross-border/audit
 * Get audit log
 */
router.get('/audit', (req, res) => {
  const gateway = getCrossBorderGateway();
  const { operation, sessionId, since } = req.query;

  const entries = gateway.getAuditLog({
    operation: operation as string | undefined,
    sessionId: sessionId as string | undefined,
    since: since ? new Date(since as string) : undefined,
  });

  res.json({
    count: entries.length,
    entries,
  });
});

/**
 * Error handling middleware
 */
router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Cross-border error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error',
    code: 'CROSS_BORDER_ERROR',
  });
});

export { router as crossBorderRouter };

/**
 * Citizen AI REST API
 */

import express, { Request, Response, NextFunction, Router, Application } from 'express';
import { conversationalAI, ConversationResponse } from './conversational-ai';
import { nluService, NLUAnalysis } from './nlu-service';
import { metrics, runHealthChecks } from './metrics';
import { translationCache } from './cache';

export const router = Router();

// Request timing middleware
const timingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const latency = Date.now() - start;
    const success = res.statusCode < 400;
    metrics.recordRequest(success, latency);
  });
  next();
};

// Health check - basic
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'citizen-ai',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Health check - detailed
router.get('/health/detailed', async (_req: Request, res: Response) => {
  const health = await runHealthChecks();
  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Readiness probe
router.get('/health/ready', (_req: Request, res: Response) => {
  res.json({ ready: true });
});

// Liveness probe
router.get('/health/live', (_req: Request, res: Response) => {
  res.json({ alive: true });
});

// Metrics endpoint
router.get('/metrics', (_req: Request, res: Response) => {
  const cacheStats = translationCache.getStats();
  const snapshot = metrics.getSnapshot(cacheStats);
  res.json(snapshot);
});

/**
 * POST /api/conversation
 * Process a conversation message
 */
router.post('/conversation', async (req: Request, res: Response) => {
  const start = Date.now();
  try {
    const { sessionId, message, language = 'en' } = req.body;

    if (!sessionId || !message) {
      res.status(400).json({ error: 'sessionId and message are required' });
      return;
    }

    const response: ConversationResponse = await conversationalAI.processMessage(
      sessionId,
      message,
      language
    );

    metrics.recordConversation(true, Date.now() - start);

    res.json({
      success: true,
      response,
    });
  } catch (error) {
    metrics.recordConversation(false, Date.now() - start);
    res.status(500).json({ error: 'Failed to process message', details: String(error) });
  }
});

/**
 * GET /api/conversation/:sessionId/history
 * Get conversation history
 */
router.get('/conversation/:sessionId/history', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const history = conversationalAI.getHistory(sessionId);
  res.json({ sessionId, history });
});

/**
 * DELETE /api/conversation/:sessionId
 * Clear conversation session
 */
router.delete('/conversation/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  conversationalAI.clearSession(sessionId);
  res.json({ success: true, message: 'Session cleared' });
});

/**
 * PUT /api/conversation/:sessionId/language
 * Set preferred language for session
 */
router.put('/conversation/:sessionId/language', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { language } = req.body;

  if (!language) {
    res.status(400).json({ error: 'language is required' });
    return;
  }

  conversationalAI.setPreferredLanguage(sessionId, language);
  res.json({ success: true, sessionId, language });
});

/**
 * GET /api/services
 * Get available service categories
 */
router.get('/services', (_req: Request, res: Response) => {
  const services = conversationalAI.getServiceCategories();
  res.json({ services });
});

/**
 * POST /api/nlu/analyze
 * Perform NLU analysis on text
 */
router.post('/nlu/analyze', async (req: Request, res: Response) => {
  const start = Date.now();
  try {
    const { text } = req.body;

    if (!text) {
      res.status(400).json({ error: 'text is required' });
      return;
    }

    const analysis: NLUAnalysis = await nluService.analyze(text);
    metrics.recordNLU(true, Date.now() - start);
    res.json({ success: true, analysis });
  } catch (error) {
    metrics.recordNLU(false, Date.now() - start);
    res.status(500).json({ error: 'NLU analysis failed', details: String(error) });
  }
});

/**
 * POST /api/nlu/detect-language
 * Detect language of text
 */
router.post('/nlu/detect-language', (req: Request, res: Response) => {
  const { text } = req.body;

  if (!text) {
    res.status(400).json({ error: 'text is required' });
    return;
  }

  const detection = nluService.detectLanguage(text);
  res.json({ success: true, detection });
});

/**
 * POST /api/nlu/extract-entities
 * Extract entities from text
 */
router.post('/nlu/extract-entities', (req: Request, res: Response) => {
  const { text, language = 'en' } = req.body;

  if (!text) {
    res.status(400).json({ error: 'text is required' });
    return;
  }

  const entities = nluService.extractEntities(text, language);
  res.json({ success: true, entities });
});

/**
 * POST /api/nlu/classify-intent
 * Classify user intent
 */
router.post('/nlu/classify-intent', (req: Request, res: Response) => {
  const { text, language = 'en' } = req.body;

  if (!text) {
    res.status(400).json({ error: 'text is required' });
    return;
  }

  const intent = nluService.classifyIntent(text, language);
  res.json({ success: true, intent });
});

/**
 * POST /api/nlu/sentiment
 * Analyze sentiment of text
 */
router.post('/nlu/sentiment', (req: Request, res: Response) => {
  const { text, language = 'en' } = req.body;

  if (!text) {
    res.status(400).json({ error: 'text is required' });
    return;
  }

  const sentiment = nluService.analyzeSentiment(text, language);
  res.json({ success: true, sentiment });
});

/**
 * Create Express app
 */
export function createApp(): Application {
  const app = express();

  // Middleware
  app.use(express.json({ limit: '1mb' }));
  app.use(timingMiddleware);

  // CORS headers for public access
  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
  });

  // Routes
  app.use('/api', router);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

/**
 * Start server
 */
export function startServer(port = 3020): void {
  const app = createApp();

  app.listen(port, () => {
    console.log(`Citizen AI Service running on port ${port}`);
  });
}

/**
 * Citizen AI REST API
 */

import express, { Request, Response, Router } from 'express';
import { conversationalAI, ConversationResponse } from './conversational-ai';
import { nluService, NLUAnalysis } from './nlu-service';

export const router = Router();

// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'citizen-ai', version: '1.0.0' });
});

/**
 * POST /api/conversation
 * Process a conversation message
 */
router.post('/conversation', async (req: Request, res: Response) => {
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

    res.json({
      success: true,
      response,
    });
  } catch (error) {
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
  try {
    const { text } = req.body;

    if (!text) {
      res.status(400).json({ error: 'text is required' });
      return;
    }

    const analysis: NLUAnalysis = await nluService.analyze(text);
    res.json({ success: true, analysis });
  } catch (error) {
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
export function createApp(): express.Application {
  const app = express();

  app.use(express.json());
  app.use('/api', router);

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

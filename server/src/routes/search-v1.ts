import express from 'express';
import { RetrievalService } from '../retrieval/RetrievalService.js';
import { RagContextBuilder } from '../retrieval/RagContextBuilder.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import logger from '../utils/logger.js';
import { RetrievalQueryKind, KnowledgeObjectKind } from '../retrieval/types.js';
import { pool } from '../db/pg.js';

const router = express.Router();

// Initialize services lazily or via dependency injection in real app.
// Here we'll instantiate for the route.
const retrievalService = new RetrievalService(pool);
const ragBuilder = new RagContextBuilder(retrievalService);

// POST /api/v1/search/retrieve
router.post('/retrieve', ensureAuthenticated, async (req: any, res) => {
  try {
    const {
      query,
      kind = 'hybrid',
      filters,
      topK = 10
    } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query text is required' });
    }

    const tenantId = req.user.tenantId; // Assumes middleware populates this

    const result = await retrievalService.search({
      tenantId,
      queryText: query,
      queryKind: kind as RetrievalQueryKind,
      filters: {
        kinds: filters?.kinds as KnowledgeObjectKind[],
        timeRange: filters?.timeRange,
        metadata: filters?.metadata
      },
      topK,
      includeContent: req.body.includeContent ?? false
    });

    res.json(result);
  } catch (error: any) {
    logger.error({ error }, 'Search retrieval failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/search/rag-context
router.post('/rag-context', ensureAuthenticated, async (req: any, res) => {
  try {
    const {
      query,
      maxTokens = 2000,
      retrievalConfig
    } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query text is required' });
    }

    const tenantId = req.user.tenantId;

    const context = await ragBuilder.buildContext({
      tenantId,
      queryText: query,
      maxTokens,
      retrievalConfig: {
        topK: retrievalConfig?.topK,
        queryKind: retrievalConfig?.queryKind,
        kinds: retrievalConfig?.kinds
      }
    });

    res.json(context);
  } catch (error: any) {
    logger.error({ error }, 'RAG context build failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

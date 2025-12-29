import express from 'express';
import { VectorStoreService } from '../services/VectorStoreService.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import { z } from 'zod';

const router = express.Router();

// Validation Schemas
const IngestSchema = z.object({
  content: z.string().min(1),
  title: z.string().optional(),
  sourceId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const SearchSchema = z.object({
  query: z.string().min(1),
  limit: z.coerce.number().min(1).max(100).optional().default(5),
  threshold: z.coerce.number().min(0).max(1).optional().default(0.7),
  metadataFilter: z.record(z.any()).optional(),
});

// Helper for async handlers
const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const vectorStore = VectorStoreService.getInstance();

/**
 * POST /ingest
 * Ingest a document
 */
router.post(
  '/ingest',
  ensureAuthenticated,
  asyncHandler(async (req: any, res: any) => {
    const user = req.user;
    if (!user || !user.tenantId) {
      return res.status(401).json({ error: 'Unauthorized: No tenant context' });
    }

    const validation = IngestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.format() });
    }

    const result = await vectorStore.ingestDocument(
      user.tenantId,
      validation.data
    );

    res.json(result);
  })
);

/**
 * POST /search
 * Semantic search
 */
router.post(
  '/search',
  ensureAuthenticated,
  asyncHandler(async (req: any, res: any) => {
    const user = req.user;
    if (!user || !user.tenantId) {
        return res.status(401).json({ error: 'Unauthorized: No tenant context' });
    }

    const validation = SearchSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.format() });
    }

    const results = await vectorStore.search(validation.data.query, {
      limit: validation.data.limit,
      threshold: validation.data.threshold,
      metadataFilter: validation.data.metadataFilter,
      tenantId: user.tenantId,
    });

    res.json({ results });
  })
);

/**
 * DELETE /documents/:id
 * Delete a document and its chunks
 */
router.delete(
    '/documents/:id',
    ensureAuthenticated,
    asyncHandler(async (req: any, res: any) => {
        const user = req.user;
        const { id } = req.params;

        if (!user || !user.tenantId) {
            return res.status(401).json({ error: 'Unauthorized: No tenant context' });
        }

        const success = await vectorStore.deleteDocument(id, user.tenantId);

        if (!success) {
            return res.status(404).json({ error: 'Document not found' });
        }

        res.json({ success: true });
    })
);

export default router;

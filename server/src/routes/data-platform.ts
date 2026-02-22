import express from 'express';
import { IngestionService } from '../lib/data-platform/ingest/service.js';
import { RetrievalService } from '../lib/data-platform/retrieval/service.js';
import { RagService } from '../lib/data-platform/rag/service.js';
import { pg } from '../db/pg';

const router = express.Router();
const ingestionService = new IngestionService();
const retrievalService = new RetrievalService();
const ragService = new RagService();

const ensureTenant = (req: any, res: any, next: any) => {
    if (!req.user && !req.headers['x-tenant-id']) {
        req.user = { tenantId: 'default-tenant' };
    } else if (req.headers['x-tenant-id']) {
        req.user = { ...req.user, tenantId: req.headers['x-tenant-id'] };
    }
    next();
};

router.use(ensureTenant);

// --- Collections ---

router.post('/collections', async (req: any, res) => {
    try {
        const { name, description, sensitivity } = req.body;
        const tenantId = req.user.tenantId;

        const result = await pg.oneOrNone(
            `INSERT INTO doc_collections (tenant_id, name, description, sensitivity)
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [tenantId, name, description, sensitivity],
            { tenantId, forceWrite: true }
        );
        res.json({ id: result.id });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/collections', async (req: any, res) => {
    try {
        const tenantId = req.user.tenantId;
        const rows = await pg.many(
            `SELECT * FROM doc_collections WHERE tenant_id = $1 ORDER BY created_at DESC`,
            [tenantId],
            { tenantId }
        );
        res.json(rows);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- Ingestion ---

router.post('/documents/upload', async (req: any, res) => {
    try {
        const { collectionId, title, sourceUri, mimeType, contentBase64 } = req.body;
        const tenantId = req.user.tenantId;
        const content = Buffer.from(contentBase64, 'base64');

        const docId = await ingestionService.createDocument(
            tenantId, collectionId, title, sourceUri, mimeType, content
        );

        res.json({ documentId: docId, status: 'pending' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/documents/:id', async (req: any, res) => {
    try {
        const doc = await pg.oneOrNone(
            `SELECT * FROM documents WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, req.user.tenantId],
            { tenantId: req.user.tenantId }
        );
        if (!doc) return res.status(404).json({ error: "Not found" });
        res.json(doc);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- Retrieval ---

router.post('/retrieve', async (req: any, res) => {
    try {
        const { query, topK, collectionIds } = req.body;
        const result = await retrievalService.retrieve({
            tenantId: req.user.tenantId,
            query,
            topK: topK || 5,
            collectionIds
        });
        res.json(result);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- RAG ---

router.post('/rag/answer', async (req: any, res) => {
    try {
        const { question, collectionIds, model } = req.body;
        const result = await ragService.answer({
            tenantId: req.user.tenantId,
            principalId: req.user.id || 'anon',
            question,
            retrieval: {
                tenantId: req.user.tenantId,
                query: question,
                topK: 5,
                collectionIds
            },
            generationConfig: {
                model
            }
        });
        res.json(result);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;

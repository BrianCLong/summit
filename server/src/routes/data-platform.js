"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const service_js_1 = require("../lib/data-platform/ingest/service.js");
const service_js_2 = require("../lib/data-platform/retrieval/service.js");
const service_js_3 = require("../lib/data-platform/rag/service.js");
const pg_js_1 = require("../db/pg.js");
const router = express_1.default.Router();
const ingestionService = new service_js_1.IngestionService();
const retrievalService = new service_js_2.RetrievalService();
const ragService = new service_js_3.RagService();
const ensureTenant = (req, res, next) => {
    if (!req.user && !req.headers['x-tenant-id']) {
        req.user = { tenantId: 'default-tenant' };
    }
    else if (req.headers['x-tenant-id']) {
        req.user = { ...req.user, tenantId: req.headers['x-tenant-id'] };
    }
    next();
};
router.use(ensureTenant);
// --- Collections ---
router.post('/collections', async (req, res) => {
    try {
        const { name, description, sensitivity } = req.body;
        const tenantId = req.user.tenantId;
        const result = await pg_js_1.pg.oneOrNone(`INSERT INTO doc_collections (tenant_id, name, description, sensitivity)
             VALUES ($1, $2, $3, $4) RETURNING id`, [tenantId, name, description, sensitivity], { tenantId, forceWrite: true });
        res.json({ id: result.id });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.get('/collections', async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const rows = await pg_js_1.pg.many(`SELECT * FROM doc_collections WHERE tenant_id = $1 ORDER BY created_at DESC`, [tenantId], { tenantId });
        res.json(rows);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// --- Ingestion ---
router.post('/documents/upload', async (req, res) => {
    try {
        const { collectionId, title, sourceUri, mimeType, contentBase64 } = req.body;
        const tenantId = req.user.tenantId;
        const content = Buffer.from(contentBase64, 'base64');
        const docId = await ingestionService.createDocument(tenantId, collectionId, title, sourceUri, mimeType, content);
        res.json({ documentId: docId, status: 'pending' });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.get('/documents/:id', async (req, res) => {
    try {
        const doc = await pg_js_1.pg.oneOrNone(`SELECT * FROM documents WHERE id = $1 AND tenant_id = $2`, [req.params.id, req.user.tenantId], { tenantId: req.user.tenantId });
        if (!doc)
            return res.status(404).json({ error: "Not found" });
        res.json(doc);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// --- Retrieval ---
router.post('/retrieve', async (req, res) => {
    try {
        const { query, topK, collectionIds } = req.body;
        const result = await retrievalService.retrieve({
            tenantId: req.user.tenantId,
            query,
            topK: topK || 5,
            collectionIds
        });
        res.json(result);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
// --- RAG ---
router.post('/rag/answer', async (req, res) => {
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
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
exports.default = router;

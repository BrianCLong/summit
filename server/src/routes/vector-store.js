"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const VectorStoreService_js_1 = require("../services/VectorStoreService.js");
const auth_js_1 = require("../middleware/auth.js");
const zod_1 = require("zod");
const router = express_1.default.Router();
// Validation Schemas
const IngestSchema = zod_1.z.object({
    content: zod_1.z.string().min(1),
    title: zod_1.z.string().optional(),
    sourceId: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
const SearchSchema = zod_1.z.object({
    query: zod_1.z.string().min(1),
    limit: zod_1.z.coerce.number().min(1).max(100).optional().default(5),
    threshold: zod_1.z.coerce.number().min(0).max(1).optional().default(0.7),
    metadataFilter: zod_1.z.record(zod_1.z.any()).optional(),
});
// Helper for async handlers
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const vectorStore = VectorStoreService_js_1.VectorStoreService.getInstance();
/**
 * POST /ingest
 * Ingest a document
 */
router.post('/ingest', auth_js_1.ensureAuthenticated, asyncHandler(async (req, res) => {
    const user = req.user;
    if (!user || !user.tenantId) {
        return res.status(401).json({ error: 'Unauthorized: No tenant context' });
    }
    const validation = IngestSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ error: validation.error.format() });
    }
    const result = await vectorStore.ingestDocument(user.tenantId, validation.data);
    res.json(result);
}));
/**
 * POST /search
 * Semantic search
 */
router.post('/search', auth_js_1.ensureAuthenticated, asyncHandler(async (req, res) => {
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
}));
/**
 * DELETE /documents/:id
 * Delete a document and its chunks
 */
router.delete('/documents/:id', auth_js_1.ensureAuthenticated, asyncHandler(async (req, res) => {
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
}));
exports.default = router;

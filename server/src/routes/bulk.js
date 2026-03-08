"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const BulkOperationService_js_1 = require("../bulk/BulkOperationService.js");
const auth_js_1 = require("../middleware/auth.js"); // Assuming this exists, based on nlp.js
const crypto_1 = require("crypto");
const router = express_1.default.Router();
const bulkService = new BulkOperationService_js_1.BulkOperationService();
router.use(auth_js_1.ensureAuthenticated);
const handleBulkRequest = (operationType) => async (req, res) => {
    try {
        const { items, requestId, dryRun, atomic, ...params } = req.body;
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ error: 'items array is required' });
        }
        const payload = {
            items,
            requestId: requestId || (0, crypto_1.randomUUID)(),
            dryRun: !!dryRun,
            atomic: !!atomic,
            operationType,
            params // Rest of body is params
        };
        const context = {
            tenantId: req.headers['x-tenant-id'],
            userId: req.user?.id,
            requestId: payload.requestId,
            pgPool: null // Service grabs its own pool
        };
        const result = await bulkService.process(context, payload);
        res.json(result);
    }
    catch (err) {
        if (err.message.includes('Unsupported')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};
router.post('/tags/apply', handleBulkRequest('tags/apply'));
router.post('/annotations/delete', handleBulkRequest('annotations/delete'));
router.post('/triage/assign', handleBulkRequest('triage/assign'));
exports.default = router;

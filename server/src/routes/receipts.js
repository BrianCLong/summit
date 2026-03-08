"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ReceiptService_js_1 = require("../services/ReceiptService.js");
const bundle_exporter_js_1 = require("../exports/bundle-exporter.js");
const router = express_1.default.Router();
// GET /receipts/:id/export - Export evidence bundle for a receipt
router.get('/:id/export', async (req, res) => {
    try {
        const id = req.params.id;
        const tenantId = req.user?.tenantId || req.user?.tenant_id;
        if (!tenantId) {
            return res.status(401).json({ error: 'Tenant context required' });
        }
        const bundle = await bundle_exporter_js_1.bundleExporter.exportReceipt(id, tenantId);
        res.json(bundle);
    }
    catch (error) {
        console.error('Export failed:', error);
        res.status(500).json({ error: 'Export failed', message: error.message });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const service = ReceiptService_js_1.ReceiptService.getInstance();
        const receipt = await service.getReceipt(id);
        if (!receipt) {
            // Mock fallback for now as we don't have DB wiring for getReceipt
            return res.json({
                id,
                timestamp: new Date().toISOString(),
                action: 'mock_action',
                actor: 'mock_actor',
                resource: 'mock_resource',
                inputHash: 'mock_hash',
                signature: 'mock_signature',
                signerKeyId: 'mock_key_id',
                note: 'This is a synthetic receipt for demonstration.'
            });
        }
        res.json(receipt);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;

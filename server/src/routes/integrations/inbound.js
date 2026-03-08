"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const service_js_1 = require("../../integrations/inbound/service.js");
const router = express_1.default.Router();
const service = new service_js_1.InboundAlertService();
// Public webhook endpoint (protected by signature/secret)
router.post('/integrations/inbound/:configId', async (req, res) => {
    try {
        const { configId } = req.params;
        const signature = req.headers['x-switchboard-signature'] || req.query.secret; // Simplified
        const tenantId = req.headers['x-tenant-id']; // Or derive from configId lookup
        if (!tenantId) {
            return res.status(400).json({ error: 'Tenant ID required' });
        }
        const alert = await service.processAlert(tenantId, configId, req.body, signature);
        res.status(202).json({ message: 'Alert received', id: alert.id });
    }
    catch (error) {
        res.status(403).json({ error: error.message });
    }
});
exports.default = router;

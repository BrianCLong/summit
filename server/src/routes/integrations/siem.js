"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const exporter_js_1 = require("../../integrations/splunk/exporter.js");
const unifiedAuth_js_1 = require("../../middleware/unifiedAuth.js");
const rbac_js_1 = require("../../middleware/rbac.js");
const router = express_1.default.Router();
router.post('/tenants/:tenantId/integrations/siem/test', unifiedAuth_js_1.requireAuth, (0, rbac_js_1.requireRole)('admin'), async (req, res) => {
    try {
        const config = req.body;
        const sink = new exporter_js_1.SplunkSIEMSink(config);
        const success = await sink.testConnection();
        if (success) {
            res.json({ message: 'Connection successful' });
        }
        else {
            res.status(400).json({ error: 'Connection failed' });
        }
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;

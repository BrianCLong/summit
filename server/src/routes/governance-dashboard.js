"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const GovernanceDashboardService_js_1 = require("../services/GovernanceDashboardService.js");
const router = express_1.default.Router();
router.get('/dashboard', async (req, res) => {
    try {
        // Check for tenant context
        const tenantId = req.user?.tenant_id || req.context?.tenantId;
        if (!tenantId) {
            // Fallback for development/testing if no tenant is present
            return res.status(400).json({ error: 'Tenant ID required' });
        }
        const data = await GovernanceDashboardService_js_1.governanceDashboardService.getDashboardData(tenantId);
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;

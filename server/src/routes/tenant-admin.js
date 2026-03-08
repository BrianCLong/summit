"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const TenantAdminService_js_1 = require("../services/TenantAdminService.js");
const router = express_1.default.Router();
const service = new TenantAdminService_js_1.TenantAdminService();
// Middleware to extract tenantId would be here (e.g. from req.user or header)
// For now assuming req.headers['x-tenant-id']
router.get('/plan', async (req, res) => {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId)
        return res.status(400).json({ error: 'Missing tenant ID' });
    try {
        const plan = await service.getPlan(tenantId);
        res.json(plan);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.post('/plan', async (req, res) => {
    const tenantId = req.headers['x-tenant-id'];
    const { planId } = req.body;
    if (!tenantId || !planId)
        return res.status(400).json({ error: 'Missing params' });
    try {
        await service.updatePlan(tenantId, planId);
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.post('/residency', async (req, res) => {
    const tenantId = req.headers['x-tenant-id'];
    const { region, reason } = req.body;
    if (!tenantId || !region)
        return res.status(400).json({ error: 'Missing params' });
    try {
        const request = await service.requestResidencyChange(tenantId, region, reason);
        res.json(request);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.get('/residency', async (req, res) => {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId)
        return res.status(400).json({ error: 'Missing tenant ID' });
    try {
        const requests = await service.getResidencyRequests(tenantId);
        res.json(requests);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
});
router.get('/invoice', async (req, res) => {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId)
        return res.status(400).json({ error: 'Missing tenant ID' });
    // Simulate Invoice Generation
    const invoiceData = `
    INVOICE
    -------
    Tenant: ${tenantId}
    Date: ${new Date().toISOString()}
    Plan: Pro ($49/mo)
    Usage:
    - API Calls: 450,000 (included)
    - Storage: 12GB (included)
    - Egress: 89GB ($0.09/GB overage: $0.00)

    Total: $49.00

    Status: PAID
    Transaction ID: txn_${Math.random().toString(36).substring(7)}
    `;
    // Sign it (Mock)
    const crypto = await Promise.resolve().then(() => __importStar(require('crypto')));
    const signature = crypto.createHmac('sha256', 'secret').update(invoiceData).digest('hex');
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('X-Invoice-Signature', signature);
    res.send(invoiceData);
});
exports.default = router;

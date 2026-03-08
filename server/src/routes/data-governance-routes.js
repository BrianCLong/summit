"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const DataCatalogService_js_1 = require("../data-governance/catalog/DataCatalogService.js");
const DataQualityService_js_1 = require("../data-governance/quality/DataQualityService.js");
const PolicyEngine_js_1 = require("../data-governance/policy/PolicyEngine.js");
const DataLineageService_js_1 = require("../data-governance/lineage/DataLineageService.js");
const auth_js_1 = require("../middleware/auth.js");
const router = express_1.default.Router();
const catalog = DataCatalogService_js_1.DataCatalogService.getInstance();
const quality = DataQualityService_js_1.DataQualityService.getInstance();
const policy = PolicyEngine_js_1.PolicyEngine.getInstance();
const lineage = DataLineageService_js_1.DataLineageService.getInstance();
// Middleware to ensure tenant ID is present
const ensureTenant = (req, res, next) => {
    if (!req.user || !req.user.tenantId) {
        return res.status(403).json({ error: 'Tenant context required' });
    }
    next();
};
// --- Catalog Routes ---
// Register an asset
router.post('/catalog/assets', auth_js_1.ensureAuthenticated, ensureTenant, async (req, res) => {
    try {
        const asset = await catalog.registerAsset({
            ...req.body,
            tenantId: req.user.tenantId
        });
        res.status(201).json(asset);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Search assets
router.get('/catalog/assets', auth_js_1.ensureAuthenticated, ensureTenant, async (req, res) => {
    try {
        const query = req.query.q || '';
        const assets = await catalog.searchAssets(req.user.tenantId, query);
        res.json(assets);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Get specific asset
router.get('/catalog/assets/:id', auth_js_1.ensureAuthenticated, ensureTenant, async (req, res) => {
    try {
        const asset = await catalog.getAsset(req.params.id);
        if (!asset || asset.tenantId !== req.user.tenantId) {
            return res.status(404).json({ error: 'Asset not found' });
        }
        res.json(asset);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- Quality Routes ---
// Define a rule
router.post('/quality/rules', auth_js_1.ensureAuthenticated, ensureTenant, async (req, res) => {
    try {
        const rule = await quality.defineRule({
            ...req.body,
            tenantId: req.user.tenantId
        });
        res.status(201).json(rule);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Run checks for an asset
router.post('/quality/assets/:id/run-checks', auth_js_1.ensureAuthenticated, ensureTenant, async (req, res) => {
    try {
        // Enforce tenant check via the service
        const results = await quality.runChecks(req.params.id, req.user.tenantId);
        res.json(results);
    }
    catch (err) {
        if (err.message.includes('Access denied')) {
            return res.status(403).json({ error: err.message });
        }
        if (err.message.includes('Asset not found')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
});
// --- Policy Routes ---
// Create a policy
router.post('/governance/policies', auth_js_1.ensureAuthenticated, ensureTenant, async (req, res) => {
    try {
        const newPolicy = await policy.createPolicy({
            ...req.body,
            tenantId: req.user.tenantId
        });
        res.status(201).json(newPolicy);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Evaluate asset compliance
router.get('/governance/assets/:id/compliance', auth_js_1.ensureAuthenticated, ensureTenant, async (req, res) => {
    try {
        const asset = await catalog.getAsset(req.params.id);
        if (!asset || asset.tenantId !== req.user.tenantId) {
            return res.status(404).json({ error: 'Asset not found' });
        }
        const result = await policy.evaluateAsset(asset);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- Lineage Routes ---
router.get('/lineage/assets/:id', auth_js_1.ensureAuthenticated, ensureTenant, async (req, res) => {
    try {
        // Verify tenant ownership of the requested asset first
        const asset = await catalog.getAsset(req.params.id);
        if (!asset || asset.tenantId !== req.user.tenantId) {
            return res.status(404).json({ error: 'Asset not found' });
        }
        // Pass tenantId to service for filtered graph traversal
        const result = await lineage.getLineage(req.params.id, req.user.tenantId);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/lineage/nodes', auth_js_1.ensureAuthenticated, ensureTenant, async (req, res) => {
    try {
        const node = await lineage.createNode({
            ...req.body,
            tenantId: req.user.tenantId
        });
        res.status(201).json(node);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/lineage/edges', auth_js_1.ensureAuthenticated, ensureTenant, async (req, res) => {
    try {
        const edge = await lineage.createEdge({
            ...req.body,
            tenantId: req.user.tenantId
        });
        res.status(201).json(edge);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;

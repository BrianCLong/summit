
import express from 'express';
import { DataCatalogService } from '../data-governance/catalog/DataCatalogService.js';
import { DataQualityService } from '../data-governance/quality/DataQualityService.js';
import { PolicyEngine } from '../data-governance/policy/PolicyEngine.js';
import { DataLineageService } from '../data-governance/lineage/DataLineageService.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import { DataAsset, QualityRule, GovernancePolicy } from '../data-governance/types.js';

const router = express.Router();

const catalog = DataCatalogService.getInstance();
const quality = DataQualityService.getInstance();
const policy = PolicyEngine.getInstance();
const lineage = DataLineageService.getInstance();

// Middleware to ensure tenant ID is present
const ensureTenant = (req: any, res: any, next: any) => {
    if (!req.user || !req.user.tenantId) {
        return res.status(403).json({ error: 'Tenant context required' });
    }
    next();
};

// --- Catalog Routes ---

// Register an asset
router.post('/catalog/assets', ensureAuthenticated, ensureTenant, async (req, res) => {
    try {
        const asset = await catalog.registerAsset({
            ...req.body,
            tenantId: req.user.tenantId
        });
        res.status(201).json(asset);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Search assets
router.get('/catalog/assets', ensureAuthenticated, ensureTenant, async (req, res) => {
    try {
        const query = req.query.q as string || '';
        const assets = await catalog.searchAssets(req.user.tenantId, query);
        res.json(assets);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get specific asset
router.get('/catalog/assets/:id', ensureAuthenticated, ensureTenant, async (req, res) => {
    try {
        const asset = await catalog.getAsset(req.params.id);
        if (!asset || asset.tenantId !== req.user.tenantId) {
            return res.status(404).json({ error: 'Asset not found' });
        }
        res.json(asset);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- Quality Routes ---

// Define a rule
router.post('/quality/rules', ensureAuthenticated, ensureTenant, async (req, res) => {
    try {
        const rule = await quality.defineRule({
            ...req.body,
            tenantId: req.user.tenantId
        });
        res.status(201).json(rule);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Run checks for an asset
router.post('/quality/assets/:id/run-checks', ensureAuthenticated, ensureTenant, async (req, res) => {
    try {
        const results = await quality.runChecks(req.params.id);
        res.json(results);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- Policy Routes ---

// Create a policy
router.post('/governance/policies', ensureAuthenticated, ensureTenant, async (req, res) => {
    try {
        const newPolicy = await policy.createPolicy({
            ...req.body,
            tenantId: req.user.tenantId
        });
        res.status(201).json(newPolicy);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Evaluate asset compliance
router.get('/governance/assets/:id/compliance', ensureAuthenticated, ensureTenant, async (req, res) => {
    try {
        const asset = await catalog.getAsset(req.params.id);
         if (!asset || asset.tenantId !== req.user.tenantId) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        const result = await policy.evaluateAsset(asset);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- Lineage Routes ---

router.get('/lineage/assets/:id', ensureAuthenticated, ensureTenant, async (req, res) => {
    try {
        const result = await lineage.getLineage(req.params.id);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/lineage/nodes', ensureAuthenticated, ensureTenant, async (req, res) => {
    try {
        const node = await lineage.createNode({
            ...req.body,
            tenantId: req.user.tenantId
        });
        res.status(201).json(node);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/lineage/edges', ensureAuthenticated, ensureTenant, async (req, res) => {
    try {
        const edge = await lineage.createEdge({
            ...req.body,
            tenantId: req.user.tenantId
        });
        res.status(201).json(edge);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;

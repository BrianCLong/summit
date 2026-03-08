"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const algorithms_js_1 = require("../graph/algorithms.js");
const InfluenceDetectionService_js_1 = require("../services/InfluenceDetectionService.js");
const auth_js_1 = require("../middleware/auth.js");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// Define Zod schemas for validation
const ShortestPathSchema = zod_1.z.object({
    startNodeId: zod_1.z.string(),
    endNodeId: zod_1.z.string()
});
const TimeWindowSchema = zod_1.z.object({
    minutes: zod_1.z.coerce.number().default(60)
});
router.use(auth_js_1.authenticate);
/**
 * @route GET /api/graph/centrality
 * @desc Calculate Degree Centrality (Influence)
 */
router.get('/centrality', async (req, res) => {
    try {
        const authReq = req;
        const tenantId = authReq.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: 'Tenant ID missing' });
        const results = await (0, algorithms_js_1.calculateDegreeCentrality)(tenantId);
        res.json(results);
    }
    catch (error) {
        console.error('Graph Algorithm Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
/**
 * @route GET /api/graph/betweenness
 * @desc Calculate Betweenness Centrality (Bridges)
 */
router.get('/betweenness', async (req, res) => {
    try {
        const authReq = req;
        const tenantId = authReq.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: 'Tenant ID missing' });
        const results = await (0, algorithms_js_1.calculateBetweenness)(tenantId);
        res.json(results);
    }
    catch (error) {
        console.error('Graph Algorithm Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
/**
 * @route GET /api/graph/communities
 * @desc Detect Communities (Clusters)
 */
router.get('/communities', async (req, res) => {
    try {
        const authReq = req;
        const tenantId = authReq.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: 'Tenant ID missing' });
        const results = await (0, algorithms_js_1.detectCommunities)(tenantId);
        res.json(results);
    }
    catch (error) {
        console.error('Graph Algorithm Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
/**
 * @route POST /api/graph/path
 * @desc Find shortest path
 */
router.post('/path', async (req, res) => {
    try {
        const authReq = req;
        const tenantId = authReq.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: 'Tenant ID missing' });
        const { startNodeId, endNodeId } = ShortestPathSchema.parse(req.body);
        const result = await (0, algorithms_js_1.findShortestPath)(tenantId, startNodeId, endNodeId);
        res.json(result);
    }
    catch (error) {
        console.error('Graph Algorithm Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
/**
 * @route GET /api/graph/influence/bots
 * @desc Detect potential bots
 */
router.get('/influence/bots', async (req, res) => {
    try {
        const authReq = req;
        const tenantId = authReq.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: 'Tenant ID missing' });
        const results = await InfluenceDetectionService_js_1.InfluenceDetectionService.detectBots(tenantId);
        res.json(results);
    }
    catch (error) {
        console.error('Influence Detection Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
/**
 * @route GET /api/graph/influence/coordinated
 * @desc Detect coordinated behavior
 */
router.get('/influence/coordinated', async (req, res) => {
    try {
        const authReq = req;
        const tenantId = authReq.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: 'Tenant ID missing' });
        const { minutes } = TimeWindowSchema.parse(req.query);
        const results = await InfluenceDetectionService_js_1.InfluenceDetectionService.detectCoordinatedBehavior(tenantId, minutes);
        res.json(results);
    }
    catch (error) {
        console.error('Influence Detection Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
/**
 * @route GET /api/graph/influence/amplification
 * @desc Identify amplification networks
 */
router.get('/influence/amplification', async (req, res) => {
    try {
        const authReq = req;
        const tenantId = authReq.user?.tenantId;
        if (!tenantId)
            return res.status(400).json({ error: 'Tenant ID missing' });
        const results = await InfluenceDetectionService_js_1.InfluenceDetectionService.identifyAmplificationNetworks(tenantId);
        res.json(results);
    }
    catch (error) {
        console.error('Influence Detection Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.default = router;

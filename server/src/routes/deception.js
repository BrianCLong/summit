"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deceptionRouter = void 0;
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const DeceptionService_js_1 = require("../services/DeceptionService.js");
const zod_1 = require("zod");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const config_js_1 = require("../config.js");
const router = express_1.default.Router();
const deceptionService = new DeceptionService_js_1.DeceptionService();
// Validation schemas
const deployHoneypotSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    type: zod_1.z.enum(['SSH', 'HTTP', 'DATABASE', 'FILE_SERVER']),
    vulnerabilities: zod_1.z.array(zod_1.z.string()),
    location: zod_1.z.string()
});
const logInteractionSchema = zod_1.z.object({
    honeypotId: zod_1.z.string().uuid(),
    sourceIp: zod_1.z.string().ip(),
    payload: zod_1.z.string(),
    method: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
// Middleware to ensure tenantId
const ensureTenant = (req, res, next) => {
    // Strictly require authenticated user for tenant context in production
    if (req.user?.tenantId) {
        req.tenantId = req.user.tenantId;
        return next();
    }
    // Allow header override only in development
    if (config_js_1.cfg.NODE_ENV !== 'production' && req.headers['x-tenant-id']) {
        req.tenantId = req.headers['x-tenant-id'];
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized: Tenant context missing' });
};
router.use(ensureTenant);
// POST /api/deception/honeypots
router.post('/honeypots', async (req, res) => {
    try {
        const validatedData = deployHoneypotSchema.parse(req.body);
        const id = await deceptionService.deployHoneypot(validatedData, req.tenantId);
        res.status(201).json({ id, message: 'Honeypot deployed successfully' });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        logger_js_1.default.error('Error in POST /honeypots:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/deception/interactions
router.post('/interactions', async (req, res) => {
    try {
        const validatedData = logInteractionSchema.parse(req.body);
        const { honeypotId, ...data } = validatedData;
        const interactionData = {
            sourceIp: data.sourceIp,
            payload: data.payload,
            method: data.method,
            timestamp: new Date(),
            metadata: data.metadata
        };
        try {
            const id = await deceptionService.logInteraction(honeypotId, interactionData, req.tenantId);
            res.status(201).json({ id, message: 'Interaction logged' });
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            if (errorMessage === 'Honeypot not found') {
                return res.status(404).json({ error: 'Honeypot not found' });
            }
            throw err;
        }
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        logger_js_1.default.error('Error in POST /interactions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/deception/profiles
router.get('/profiles', async (req, res) => {
    const ip = req.query.ip;
    if (!ip || typeof ip !== 'string' || !zod_1.z.string().ip().safeParse(ip).success) {
        return res.status(400).json({ error: 'Valid IP address required' });
    }
    try {
        const profile = await deceptionService.profileAttacker(ip, req.tenantId);
        res.json(profile);
    }
    catch (error) {
        logger_js_1.default.error('Error in GET /profiles:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /api/deception/threat-intel
router.get('/threat-intel', async (req, res) => {
    try {
        const report = await deceptionService.generateThreatIntelligence(req.tenantId);
        res.json(report);
    }
    catch (error) {
        logger_js_1.default.error('Error in GET /threat-intel:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.deceptionRouter = router;

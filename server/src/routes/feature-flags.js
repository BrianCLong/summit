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
// @ts-nocheck
const express_1 = __importDefault(require("express"));
const setup_js_1 = require("../feature-flags/setup.js");
const postgres_js_1 = require("../db/postgres.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const auth_js_1 = require("../middleware/auth.js");
const router = express_1.default.Router();
// Middleware to ensure admin role for mutation operations
const ensureAdmin = [auth_js_1.ensureAuthenticated, (0, auth_js_1.ensureRole)(['admin'])];
// Get all flags (Admin)
router.get('/', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const service = (0, setup_js_1.getFeatureFlagService)();
        // Assuming listFlags is exposed or we go direct to DB/Provider for admin listing if service doesn't expose it well
        // The service.listFlags() calls provider.listFlags()
        const flags = await service.listFlags();
        res.json(flags);
    }
    catch (error) {
        logger_js_1.default.error('Error fetching feature flags', error);
        res.status(500).json({ error: 'Failed to fetch feature flags' });
    }
});
// Get single flag
router.get('/:key', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const service = (0, setup_js_1.getFeatureFlagService)();
        const flag = await service.getFlagDefinition(req.params.key);
        if (!flag) {
            return res.status(404).json({ error: 'Flag not found' });
        }
        res.json(flag);
    }
    catch (error) {
        logger_js_1.default.error(`Error fetching flag ${req.params.key}`, error);
        res.status(500).json({ error: 'Failed to fetch flag' });
    }
});
// Create/Update flag (Admin)
router.post('/', ensureAdmin, async (req, res) => {
    const { key, description, type, enabled, defaultValue, variations, rules, tenantId } = req.body;
    // Validation
    if (!key || !type) {
        return res.status(400).json({ error: 'Key and type are required' });
    }
    const pool = (0, postgres_js_1.getPostgresPool)();
    try {
        await pool.query(`INSERT INTO feature_flags (key, description, type, enabled, default_value, variations, rollout_rules, tenant_id, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (key) DO UPDATE SET
         description = EXCLUDED.description,
         type = EXCLUDED.type,
         enabled = EXCLUDED.enabled,
         default_value = EXCLUDED.default_value,
         variations = EXCLUDED.variations,
         rollout_rules = EXCLUDED.rollout_rules,
         tenant_id = EXCLUDED.tenant_id,
         updated_at = NOW()
       RETURNING *`, [key, description, type, enabled, defaultValue, JSON.stringify(variations || []), JSON.stringify(rules || []), tenantId]);
        // Trigger update in provider via Redis is handled by PostgresProvider listening to its own changes?
        // No, we need to publish the update event so other instances (and this one) reload.
        // We can publish to Redis if available.
        if (process.env.REDIS_URL) {
            const Redis = (await Promise.resolve().then(() => __importStar(require('ioredis')))).default;
            const pubsub = new Redis(process.env.REDIS_URL);
            await pubsub.publish('feature_flag_updates', JSON.stringify({ key, action: 'update' }));
            pubsub.quit();
        }
        res.json({ success: true, key });
    }
    catch (error) {
        logger_js_1.default.error('Error upserting feature flag', error);
        res.status(500).json({ error: 'Failed to upsert feature flag' });
    }
});
// Delete flag (Admin)
router.delete('/:key', ensureAdmin, async (req, res) => {
    const { key } = req.params;
    const pool = (0, postgres_js_1.getPostgresPool)();
    try {
        await pool.query('DELETE FROM feature_flags WHERE key = $1', [key]);
        if (process.env.REDIS_URL) {
            const Redis = (await Promise.resolve().then(() => __importStar(require('ioredis')))).default;
            const pubsub = new Redis(process.env.REDIS_URL);
            await pubsub.publish('feature_flag_updates', JSON.stringify({ key, action: 'delete' }));
            pubsub.quit();
        }
        res.json({ success: true });
    }
    catch (error) {
        logger_js_1.default.error('Error deleting feature flag', error);
        res.status(500).json({ error: 'Failed to delete feature flag' });
    }
});
// Evaluate flags for context (Client/Frontend)
router.post('/evaluate', async (req, res) => {
    try {
        const context = req.body.context || {};
        // Augment context with authenticated user info if available
        if (req.user) {
            context.userId = req.user.id || req.user.sub;
            context.userEmail = req.user.email;
            context.userRole = req.user.role;
            context.tenantId = req.user.tenantId || req.user.tenant_id;
        }
        const service = (0, setup_js_1.getFeatureFlagService)();
        const flags = await service.getAllFlags(context);
        res.json(flags);
    }
    catch (error) {
        logger_js_1.default.error('Error evaluating flags', error);
        res.status(500).json({ error: 'Failed to evaluate flags' });
    }
});
exports.default = router;

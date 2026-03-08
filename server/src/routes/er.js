"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const EntityResolutionV2Service_js_1 = require("../services/er/EntityResolutionV2Service.js");
const database_js_1 = require("../config/database.js");
const router = express_1.default.Router();
const erService = new EntityResolutionV2Service_js_1.EntityResolutionV2Service();
// GET /er/candidates
// Returns potential merge candidates
router.get('/candidates', async (req, res) => {
    const driver = (0, database_js_1.getNeo4jDriver)();
    const session = driver.session();
    try {
        const candidates = await erService.findCandidates(session);
        res.json(candidates);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
    finally {
        await session.close();
    }
});
// POST /er/merge
// Merges entities. Body: { masterId, mergeIds, rationale }
router.post('/merge', async (req, res) => {
    const driver = (0, database_js_1.getNeo4jDriver)();
    const session = driver.session();
    try {
        const { masterId, mergeIds, rationale, guardrailDatasetId, guardrailOverrideReason, mergeId, idempotencyKey, } = req.body;
        // Assuming req.user is populated by auth middleware
        const userContext = req.user || { userId: 'anonymous' };
        const result = await erService.merge(session, {
            masterId,
            mergeIds,
            userContext,
            rationale,
            guardrailDatasetId,
            guardrailOverrideReason,
            mergeId,
            idempotencyKey,
        });
        res.json({ success: true, ...result, guardrails: result.guardrails, overrideUsed: result.overrideUsed });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
    finally {
        await session.close();
    }
});
// GET /er/guardrails
// Returns guardrail evaluation metrics for current fixtures
router.get('/guardrails', async (req, res) => {
    try {
        const datasetId = req.query.datasetId;
        const guardrails = erService.evaluateGuardrails(datasetId);
        res.json(guardrails);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// POST /er/split
// Reverses a merge. Body: { decisionId }
router.post('/split', async (req, res) => {
    const driver = (0, database_js_1.getNeo4jDriver)();
    const session = driver.session();
    try {
        const { decisionId } = req.body;
        const userContext = req.user || { userId: 'anonymous' };
        await erService.split(session, decisionId, userContext);
        res.json({ success: true });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
    finally {
        await session.close();
    }
});
// POST /er/explain
// Explains similarity. Body: { entityA, entityB }
router.post('/explain', (req, res) => {
    try {
        const { entityA, entityB } = req.body;
        const explanation = erService.explain(entityA, entityB);
        res.json(explanation);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;

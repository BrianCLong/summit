"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const RunbookEngine_js_1 = require("../runbooks/engine/RunbookEngine.js");
const router = express_1.default.Router();
// List all runbook definitions
router.get('/list', (req, res) => {
    const definitions = RunbookEngine_js_1.runbookEngine.listDefinitions();
    res.json(definitions);
});
// Execute a runbook
router.post('/execute', async (req, res) => {
    const { runbookId, inputs } = req.body;
    const userId = req.user?.sub || 'anonymous';
    const tenantId = req.user?.tenantId || 'default';
    try {
        const runId = await RunbookEngine_js_1.runbookEngine.executeRunbook(runbookId, inputs, userId, tenantId);
        res.json({ runId, status: 'started' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Get status of a run
router.get('/status/:runId', (req, res) => {
    const status = RunbookEngine_js_1.runbookEngine.getStatus(req.params.runId);
    if (!status) {
        return res.status(404).json({ error: 'Run not found' });
    }
    res.json(status);
});
// Replay logs for a run
router.get('/replay/:runId', async (req, res) => {
    const tenantId = req.user?.tenantId || 'default';
    try {
        const logs = await RunbookEngine_js_1.runbookEngine.replay(req.params.runId, tenantId);
        res.json(logs);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const orchestrator_js_1 = require("../llm/orchestrator.js");
const registry_js_1 = require("../llm/prompts/registry.js");
const router = (0, express_1.Router)();
const orchestrator = new orchestrator_js_1.SummitLlmOrchestrator();
// POST /api/v1/llm/chat
router.post('/chat', async (req, res) => {
    try {
        const { messages, purpose = 'other', riskLevel = 'medium' } = req.body;
        // Assume req.user is populated by auth middleware
        const tenantId = req.user?.tenantId || 'default-tenant';
        const result = await orchestrator.chat({
            tenantId,
            purpose,
            riskLevel,
            messages
        });
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// POST /api/v1/llm/render-prompt
router.post('/render-prompt', async (req, res) => {
    try {
        const { templateId, params, version } = req.body;
        const rendered = await registry_js_1.promptService.render(templateId, params, version);
        res.json(rendered);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
exports.default = router;


import { Router } from 'express';
import { SummitLlmOrchestrator } from '../llm/orchestrator';
import { promptService } from '../llm/prompts/registry';

const router = Router();
const orchestrator = new SummitLlmOrchestrator();

// POST /api/v1/llm/chat
router.post('/chat', async (req, res) => {
    try {
        const { messages, purpose = 'other', riskLevel = 'medium' } = req.body;
        // Assume req.user is populated by auth middleware
        const tenantId = (req as any).user?.tenantId || 'default-tenant';

        const result = await orchestrator.chat({
            tenantId,
            purpose,
            riskLevel,
            messages
        });

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/v1/llm/render-prompt
router.post('/render-prompt', async (req, res) => {
    try {
        const { templateId, params, version } = req.body;
        const rendered = await promptService.render(templateId, params, version);
        res.json(rendered);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;

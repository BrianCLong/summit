import { Router } from 'express';
import { ActivationService } from '../activation/ActivationService.js';
import { canonicalEventSchema } from '../activation/events.js';

const router = Router();
const activationService = new ActivationService();

router.post('/event', (req, res) => {
  try {
    const parsed = canonicalEventSchema.parse(req.body);
    const result = activationService.recordEvent(parsed);
    res.status(202).json({
      status: 'accepted',
      event: result.event,
      checklist: result.checklist,
      prompt: result.prompt,
      fixIt: result.fixIt,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/metrics', (_req, res) => {
  res.json(activationService.getMetrics());
});

router.get('/checklists/:workspaceId', (req, res) => {
  res.json(activationService.getChecklist(req.params.workspaceId));
});

router.get('/fix-it/:workspaceId', (req, res) => {
  res.json({ actions: activationService.getFixIt(req.params.workspaceId) });
});

router.post('/validate/workspace', (req, res) => {
  const result = activationService.validateWorkspace(req.body);
  res.status(result.valid ? 200 : 422).json(result);
});

router.post('/validate/integration', (req, res) => {
  const result = activationService.validateIntegration(req.body);
  res.status(result.valid ? 200 : 422).json(result);
});

export default router;

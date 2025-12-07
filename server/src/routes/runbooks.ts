import express from 'express';
import { runbookEngine } from '../runbooks/engine/RunbookEngine.js';

const router = express.Router();

// List all runbook definitions
router.get('/list', (req, res) => {
  const definitions = runbookEngine.listDefinitions();
  res.json(definitions);
});

// Execute a runbook
router.post('/execute', async (req, res) => {
  const { runbookId, inputs } = req.body;
  const userId = (req as any).user?.sub || 'anonymous';
  const tenantId = (req as any).user?.tenantId || 'default';

  try {
    const runId = await runbookEngine.executeRunbook(runbookId, inputs, userId, tenantId);
    res.json({ runId, status: 'started' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get status of a run
router.get('/status/:runId', (req, res) => {
  const status = runbookEngine.getStatus(req.params.runId);
  if (!status) {
    return res.status(404).json({ error: 'Run not found' });
  }
  res.json(status);
});

// Replay logs for a run
router.get('/replay/:runId', async (req, res) => {
  const tenantId = (req as any).user?.tenantId || 'default';
  try {
    const logs = await runbookEngine.replay(req.params.runId, tenantId);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

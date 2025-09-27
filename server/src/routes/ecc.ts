import express from 'express';
import {
  EmergencyContainmentController,
  type ECCKillRequest,
} from '../conductor/resilience/ecc-controller.js';

const router = express.Router();
const controller = new EmergencyContainmentController();

router.use(express.json());

router.post('/ecc/actions', (req, res) => {
  try {
    const payload = req.body as ECCKillRequest;
    const result = controller.executeKillPlan(payload);
    res.status(202).json(result);
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: (error as Error).message,
    });
  }
});

router.post('/ecc/rollback', (req, res) => {
  const { actionId, initiatedBy } = req.body ?? {};
  if (!actionId || typeof actionId !== 'string') {
    return res.status(400).json({ ok: false, error: 'actionId is required' });
  }

  try {
    const result = controller.rollback(actionId, initiatedBy?.toString() ?? 'rollback');
    res.status(200).json(result);
  } catch (error) {
    if ((error as Error).message === 'Action not found') {
      res.status(404).json({ ok: false, error: 'action not found' });
    } else {
      res.status(500).json({ ok: false, error: (error as Error).message });
    }
  }
});

router.get('/ecc/status', (_req, res) => {
  res.json({ ok: true, status: controller.getStatus() });
});

router.post('/ecc/validate', (req, res) => {
  const { type, name } = req.body ?? {};
  if (!type || !name) {
    return res.status(400).json({ ok: false, error: 'type and name are required' });
  }

  const result = controller.validateTarget(type, name);
  res.status(200).json({ ok: true, ...result });
});

export default router;


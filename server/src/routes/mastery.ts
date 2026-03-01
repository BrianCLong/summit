import express from 'express';
import { masteryService } from '../mastery/MasteryService.js';
import { ensureAuthenticated, ensureRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/labs', ensureAuthenticated, (req, res) => {
  res.json(masteryService.getLabs());
});

router.post('/labs/:labId/start', ensureAuthenticated, (req, res) => {
  try {
    const run = masteryService.startLab(req.params.labId, (req as any).user.id, (req as any).user.tenantId);
    res.json(run);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/runs', ensureAuthenticated, (req, res) => {
    const runs = masteryService.getUserRuns((req as any).user.id);
    res.json(runs);
});

router.get('/runs/:runId', ensureAuthenticated, (req, res) => {
  const run = masteryService.getRun(req.params.runId);
  if (!run || run.userId !== (req as any).user.id) {
    return res.status(404).json({ error: 'Run not found' });
  }
  res.json(run);
});

router.post('/runs/:runId/steps/:stepId/validate', ensureAuthenticated, async (req, res) => {
  const run = masteryService.getRun(req.params.runId);
  if (!run || run.userId !== (req as any).user.id) {
    return res.status(404).json({ error: 'Run not found' });
  }

  try {
    const result = await masteryService.validateStep(req.params.runId, req.params.stepId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/certificates', ensureAuthenticated, async (req, res) => {
  try {
    const certs = await masteryService.getUserCertificates((req as any).user.id, (req as any).user.tenantId);
    res.json(certs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch certificates' });
  }
});

router.get('/coaching', ensureAuthenticated, (req, res) => {
    const tripwire = req.query.tripwire as string;
    if (tripwire) {
        res.json(masteryService.getSuggestedLabs(tripwire));
    } else {
        res.json([]);
    }
});

router.get('/admin/stats', ensureAuthenticated, ensureRole('admin'), (req, res) => {
    const runs = masteryService.getAllRuns();
    // Aggregate stats
    const stats = {
        totalRuns: runs.length,
        completedRuns: runs.filter(r => r.status === 'completed').length,
        byLab: {} as Record<string, { started: number, completed: number }>
    };

    runs.forEach(r => {
        if (!stats.byLab[r.labId]) stats.byLab[r.labId] = { started: 0, completed: 0 };
        stats.byLab[r.labId].started++;
        if (r.status === 'completed') stats.byLab[r.labId].completed++;
    });

    res.json(stats);
});

export default router;

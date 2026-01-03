import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';
import { runSpanAggregator } from '../observability/run-spans/run-span-aggregator.js';
import { RunAggregateFilters } from '../observability/run-spans/types.js';

const router = Router();
const isEnabled = () => (process.env.OBS_RUNS_UI_ENABLED || '').toLowerCase() === 'true';

router.get(
  '/observability/runs',
  asyncHandler(async (req, res) => {
    if (!isEnabled()) {
      return res.status(404).json({ message: 'Observability runs UI disabled' });
    }

    const filters: RunAggregateFilters = {};
    if (req.query.status && typeof req.query.status === 'string') {
      filters.status = req.query.status === 'error' ? 'error' : 'ok';
    }
    if (req.query.minWastedQueueMs) {
      filters.minWastedQueueMs = Number(req.query.minWastedQueueMs);
    }
    if (req.query.since) {
      filters.since = new Date(String(req.query.since));
    }
    if (req.query.until) {
      filters.until = new Date(String(req.query.until));
    }
    if (req.query.limit) {
      filters.limit = Number(req.query.limit);
    }
    if (req.query.offset) {
      filters.offset = Number(req.query.offset);
    }

    const runs = await runSpanAggregator.listAggregates(filters);
    res.json({ runs });
  }),
);

router.get(
  '/observability/runs/:runId',
  asyncHandler(async (req, res) => {
    if (!isEnabled()) {
      return res.status(404).json({ message: 'Observability runs UI disabled' });
    }

    const run = await runSpanAggregator.getRun(req.params.runId);
    if (!run) {
      return res.status(404).json({ message: 'No spans found for run' });
    }

    res.json(run);
  }),
);

export default router;

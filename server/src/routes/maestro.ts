import express from 'express';
import pipelinesRouter from '../maestro/pipelines/pipelines-api.js';
import runsRouter from '../maestro/runs/runs-api.js';
import executorsRouter from '../maestro/executors/executors-api.js';

const router = express.Router();

// Mount sub-routers
// Note: These routers define their own paths (e.g. /pipelines, /runs),
// so we mount them at the root of this router.
// If this router is mounted at /api/maestro, the full paths will be:
// /api/maestro/pipelines
// /api/maestro/runs
// /api/maestro/executors

router.use('/', pipelinesRouter);
router.use('/', runsRouter);
router.use('/', executorsRouter);

// Alias /workflows to /pipelines for SM-101 compliance if needed,
// but currently the code implementation uses "pipelines".
// If strict /workflows support is needed, we would need to modify pipelines-api.ts
// or do a URL rewrite here. For now, we stick to the implementation.

export default router;

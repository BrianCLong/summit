import express from 'express';
import { pipelineSmokeService } from '../services/PipelineSmokeService.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';

const router = express.Router();
router.use(express.json());
router.use(ensureAuthenticated);

/**
 * Trigger a smoke test manually.
 * Requires admin permission.
 */
router.post(
  '/admin/smoke-test',
  requirePermission('admin:access'),
  async (req, res) => {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenant || 'default';
      const pipelineId = req.body.pipelineId || 'smoke-test-pipeline';
      const timeoutMs = req.body.timeoutMs || 60000;

      const result = await pipelineSmokeService.runSmokeTest(
        tenantId,
        pipelineId,
        timeoutMs,
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

export default router;

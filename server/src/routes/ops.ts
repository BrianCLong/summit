
import { Router } from 'express';
import { runMaintenance } from '../scripts/maintenance.js';
import { BackupService } from '../backup/BackupService.js';
import { DisasterRecoveryService } from '../dr/DisasterRecoveryService.js';
import { ensureAuthenticated, ensureRole } from '../middleware/auth.js';
import logger from '../config/logger.js';
import { evidenceIntegrityService } from '../evidence/integrity-service.js';
import { policyHotReloadService } from '../policy/hotReloadService.js';
import { policyBundleStore } from '../policy/bundleStore.js';
import { releaseReadinessService } from '../services/releaseReadinessService.js';

const router = Router();
const backupService = new BackupService();
const drService = new DisasterRecoveryService();

const isHotReloadEnabled = () =>
  (process.env.POLICY_HOT_RELOAD || '').toLowerCase() === 'true';

// Protected by 'admin' role (assuming ensureRole middleware checks for this)
// For now, we'll keep it open or assume the caller handles auth if not strictly enforced here in the prototype
// In production: router.use(ensureRole('admin'));

/**
 * @route POST /ops/maintenance
 * @description Trigger system maintenance tasks (partitioning, cleanup)
 */
router.post('/maintenance', async (req, res) => {
    try {
        // Run asynchronously to avoid timeout
        runMaintenance().catch(err => logger.error('Async maintenance failed', err));
        res.json({ message: 'Maintenance task started' });
    } catch (error: any) {
        logger.error('Failed to trigger maintenance', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post(
  '/ops/policy/reload',
  ensureAuthenticated,
  ensureRole(['ADMIN', 'admin']),
  async (req, res) => {
    if (!isHotReloadEnabled()) {
      return res.status(403).json({ error: 'POLICY_HOT_RELOAD is disabled' });
    }

    const { bundlePath, signaturePath } = req.body || {};
    if (!bundlePath) {
      return res.status(400).json({ error: 'bundlePath is required' });
    }

    try {
      const version = await policyHotReloadService.reload(bundlePath, signaturePath);
      res.json({
        ok: true,
        currentPolicyVersionId: policyBundleStore.currentPolicyVersionId,
        version,
      });
    } catch (error: any) {
      logger.error('Failed to reload policy bundle', error);
      res.status(500).json({ error: error?.message || 'reload failed' });
    }
  },
);

router.post(
  '/ops/policy/rollback',
  ensureAuthenticated,
  ensureRole(['ADMIN', 'admin']),
  async (req, res) => {
    if (!isHotReloadEnabled()) {
      return res.status(403).json({ error: 'POLICY_HOT_RELOAD is disabled' });
    }

    const toVersion = (req.query.toVersion as string) || req.body?.toVersion;
    if (!toVersion) {
      return res.status(400).json({ error: 'toVersion is required' });
    }

    try {
      const version = await policyHotReloadService.rollback(toVersion);
      res.json({
        ok: true,
        currentPolicyVersionId: policyBundleStore.currentPolicyVersionId,
        version,
      });
    } catch (error: any) {
      const status = /not found/.test(error?.message || '') ? 404 : 500;
      logger.error('Failed to rollback policy bundle', error);
      res.status(status).json({ error: error?.message || 'rollback failed' });
    }
  },
);

/**
 * @route POST /ops/backup/:type
 * @description Trigger a specific backup
 */
router.post('/backup/:type', async (req, res) => {
    const { type } = req.params;
    const { uploadToS3 } = req.body;

    try {
        let result: string;
        switch (type) {
            case 'postgres':
                result = await backupService.backupPostgres({ uploadToS3 });
                break;
            case 'neo4j':
                result = await backupService.backupNeo4j({ uploadToS3 });
                break;
            case 'redis':
                result = await backupService.backupRedis({ uploadToS3 });
                break;
            default:
                return res.status(400).json({ error: 'Invalid backup type. Use postgres, neo4j, or redis.' });
        }
        res.json({ message: 'Backup completed', path: result });
    } catch (error: any) {
        logger.error(`Failed to backup ${type}`, error);
        res.status(500).json({ error: `Backup failed: ${(error as Error).message}` });
    }
});

/**
 * @route POST /ops/dr/drill
 * @description Trigger a DR drill simulation
 */
router.post('/dr/drill', async (req, res) => {
    const { target } = req.body; // 'postgres' or 'neo4j'

    if (target && target !== 'postgres' && target !== 'neo4j') {
         return res.status(400).json({ error: 'Invalid target. Use postgres or neo4j.' });
    }

    try {
        const success = await drService.runDrill(target || 'postgres');
        if (success) {
            res.json({ message: 'DR Drill completed successfully' });
        } else {
            res.status(500).json({ error: 'DR Drill failed' });
        }
    } catch (error: any) {
        logger.error('DR drill error', error);
        res.status(500).json({ error: 'DR Drill execution error' });
    }
});

/**
 * @route GET /ops/dr/status
 * @description Get DR status
 */
router.get('/dr/status', async (req, res) => {
    try {
        const status = await drService.getStatus();
        res.json(status);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to get DR status' });
    }
});

/**
 * @route POST /ops/evidence/verify
 * @description Trigger chunked evidence re-hashing for integrity verification
 */
router.post('/evidence/verify', async (req, res) => {
    if (process.env.EVIDENCE_INTEGRITY !== 'true') {
        return res.status(503).json({ ok: false, error: 'Evidence integrity verification is disabled' });
    }

    const chunkSize = Number(req.body?.chunkSize ?? process.env.EVIDENCE_INTEGRITY_CHUNK ?? 50);
    const rateLimitPerSecond = Number(req.body?.rateLimitPerSecond ?? process.env.EVIDENCE_INTEGRITY_RPS ?? 5);
    const emitIncidents = req.body?.emitIncidents ?? process.env.EVIDENCE_INTEGRITY_INCIDENTS === 'true';

    try {
        const result = await evidenceIntegrityService.verifyAll({
            chunkSize: Number.isFinite(chunkSize) ? chunkSize : undefined,
            rateLimitPerSecond: Number.isFinite(rateLimitPerSecond) ? rateLimitPerSecond : undefined,
            emitIncidents,
        });

        return res.json({ ok: true, ...result });
    } catch (error: any) {
        logger.error('Failed to run evidence integrity verification', error);
        return res.status(500).json({ ok: false, error: 'Failed to verify evidence integrity' });
    }
});

/**
 * @route GET /ops/release-readiness/summary
 * @description Get release readiness summary with governance checks
 */
router.get(
  '/release-readiness/summary',
  ensureAuthenticated,
  ensureRole(['ADMIN', 'OPERATOR']),
  async (req, res) => {
    try {
      const summary = await releaseReadinessService.getSummary();
      res.json(summary);
    } catch (error: any) {
      logger.error('Failed to get release readiness summary', error);
      res.status(500).json({ error: 'Failed to retrieve release readiness summary' });
    }
  },
);

/**
 * @route GET /ops/release-readiness/evidence-index
 * @description Get structured evidence index from governance artifacts
 */
router.get(
  '/release-readiness/evidence-index',
  ensureAuthenticated,
  ensureRole(['ADMIN', 'OPERATOR']),
  async (req, res) => {
    try {
      const evidenceIndex = await releaseReadinessService.getEvidenceIndex();
      res.json(evidenceIndex);
    } catch (error: any) {
      logger.error('Failed to get evidence index', error);
      res.status(500).json({ error: 'Failed to retrieve evidence index' });
    }
  },
);

export default router;

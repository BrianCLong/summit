
import { Router } from 'express';
import { runMaintenance } from '../scripts/maintenance.js';
import { BackupService } from '../backup/BackupService.js';
import { DisasterRecoveryService } from '../dr/DisasterRecoveryService.js';
import { ensureRole } from '../middleware/auth.js';
import logger from '../config/logger.js';
import { policyBundleStore } from '../policy/bundleStore.js';

const router = Router();
const backupService = new BackupService();
const drService = new DisasterRecoveryService();

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
    } catch (error) {
        logger.error('Failed to trigger maintenance', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
        res.status(500).json({ error: 'Failed to get DR status' });
    }
});

function policyHotReloadGuard(req, res, next) {
    const enabled = (process.env.POLICY_HOT_RELOAD || 'false').toLowerCase() === 'true';
    if (!enabled) {
        return res.status(403).json({ error: 'Policy hot reload is disabled' });
    }
    return next();
}

router.post('/policy/reload', ensureRole('admin'), policyHotReloadGuard, async (req, res) => {
    const { bundlePath, sigPath, versionId } = req.body || {};
    if (!bundlePath) {
        return res.status(400).json({ error: 'bundlePath is required' });
    }

    try {
        const record = await policyBundleStore.loadBundle({
            bundlePath,
            sigPath,
            versionId,
            loader: req.user?.id || 'admin',
        });
        logger.info({ event: 'policy_reload', versionId: record.versionId }, 'policy reload completed');
        res.json({
            ok: true,
            currentVersionId: policyBundleStore.getCurrentVersionId(),
            loaded: record,
        });
    } catch (error) {
        logger.error('Failed to reload policy bundle', error);
        res.status(400).json({ error: (error as Error).message });
    }
});

router.post('/policy/rollback', ensureRole('admin'), policyHotReloadGuard, async (req, res) => {
    const target = req.query.toVersion as string;
    if (!target) {
        return res.status(400).json({ error: 'toVersion query parameter is required' });
    }
    try {
        const record = policyBundleStore.rollback(target);
        logger.warn({ event: 'policy_rollback', target }, 'policy rollback executed');
        res.json({ ok: true, currentVersionId: record.versionId, restored: record });
    } catch (error) {
        logger.error('Failed to rollback policy bundle', error);
        res.status(400).json({ error: (error as Error).message });
    }
});

export default router;

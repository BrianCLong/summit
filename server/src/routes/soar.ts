
import { Router } from 'express';
import { ensureAuthenticated } from '../middleware/auth.js';
import { getPostgresPool } from '../config/database.js';
import { SoarService } from '../soar/SoarService.js';
import { IntegrationRegistry } from '../soar/IntegrationRegistry.js';
import logger from '../config/logger.js';

const router = Router();
// Cast ManagedPostgresPool to any to allow it to be passed to SoarService which expects Pool
// In a real scenario, we should update SoarService to accept ManagedPostgresPool
const service = new SoarService(getPostgresPool() as any);

// Get available actions/integrations
router.get('/actions', ensureAuthenticated, async (req, res) => {
    const registry = IntegrationRegistry.getInstance();
    res.json(registry.getAllActions());
});

// Create Playbook
router.post('/playbooks', ensureAuthenticated, async (req, res) => {
    try {
        const user = (req as any).user;
        const playbook = await service.createPlaybook({
            ...req.body,
            tenantId: user!.tenantId,
            createdBy: user!.id
        });
        res.status(201).json(playbook);
    } catch (err: any) {
        logger.error(err);
        res.status(500).json({ error: err.message });
    }
});

// List Playbooks
router.get('/playbooks', ensureAuthenticated, async (req, res) => {
    try {
        const user = (req as any).user;
        const playbooks = await service.listPlaybooks(user!.tenantId);
        res.json(playbooks);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get Playbook
router.get('/playbooks/:id', ensureAuthenticated, async (req, res) => {
    try {
        const user = (req as any).user;
        const playbook = await service.getPlaybook(req.params.id, user!.tenantId);
        if (!playbook) return res.status(404).json({ error: 'Not found' });
        res.json(playbook);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Run Playbook
router.post('/playbooks/:id/run', ensureAuthenticated, async (req, res) => {
    try {
        const user = (req as any).user;
        const run = await service.runPlaybook(
            req.params.id,
            user!.tenantId,
            req.body.context || {},
            user!.id,
            req.body.caseId
        );
        res.status(201).json(run);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// List Runs
router.get('/runs', ensureAuthenticated, async (req, res) => {
    try {
        const user = (req as any).user;
        const runs = await service.listRuns(user!.tenantId, {
            playbookId: req.query.playbookId as string,
            caseId: req.query.caseId as string
        });
        res.json(runs);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;

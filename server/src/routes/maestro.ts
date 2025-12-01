import { Router } from 'express';
import { maestroService } from '../maestro/MaestroService.js';
import { runsRepo } from '../maestro/runs/runs-repo.js';

const router = Router();

// Middleware to ensure tenant context
const ensureTenant = (req: any, res: any, next: any) => {
  if (!req.user || !req.user.tenant_id) {
    // Fallback for dev/local if needed, or error
    if (process.env.NODE_ENV !== 'production') {
       req.user = req.user || {};
       req.user.tenant_id = 'default-tenant';
    } else {
       return res.status(401).json({ error: 'Tenant context required' });
    }
  }
  next();
};

router.use(ensureTenant);

// --- Dashboard ---
router.get('/dashboard', async (req: any, res) => {
  try {
    const health = await maestroService.getHealthSnapshot(req.user.tenant_id);
    const stats = await maestroService.getDashboardStats(req.user.tenant_id);
    const loops = await maestroService.getControlLoops();

    // Calculate active loops count
    const activeLoops = loops.filter(l => l.status === 'active').length;

    res.json({
      health,
      stats,
      autonomic: {
        activeLoops,
        totalLoops: loops.length,
        recentDecisions: loops.map(l => l.lastDecision).slice(0, 5)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Runs ---
router.get('/runs', async (req: any, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const runs = await runsRepo.list(req.user.tenant_id, limit, offset);
    res.json(runs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/runs/:id', async (req: any, res) => {
  try {
    const run = await runsRepo.get(req.params.id, req.user.tenant_id);
    if (!run) return res.status(404).json({ error: 'Run not found' });
    res.json(run);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/runs/:id/graph', async (req: any, res) => {
  // Mock graph data for now as tasks table isn't strictly defined in repo yet
  // In real impl, query tasks table
  res.json({
    nodes: [
      { id: '1', label: 'Plan', status: 'success' },
      { id: '2', label: 'Execute', status: 'running' },
      { id: '3', label: 'Verify', status: 'pending' }
    ],
    edges: [
      { source: '1', target: '2' },
      { source: '2', target: '3' }
    ]
  });
});

// --- Agents ---
router.get('/agents', async (req: any, res) => {
  try {
    const agents = await maestroService.getAgents();
    res.json(agents);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/agents/:id', async (req: any, res) => {
  try {
    // RBAC check: Only admins/operators
    if (req.user.role === 'viewer') return res.status(403).json({ error: 'ReadOnly access' });

    const agent = await maestroService.updateAgent(req.params.id, req.body, req.user.sub);
    res.json(agent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Autonomic ---
router.get('/autonomic/loops', async (req: any, res) => {
  try {
    const loops = await maestroService.getControlLoops();
    res.json(loops);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/autonomic/loops/:id/toggle', async (req: any, res) => {
  try {
    if (req.user.role === 'viewer') return res.status(403).json({ error: 'ReadOnly access' });
    const success = await maestroService.toggleLoop(req.params.id, req.body.status, req.user.sub);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Merge Trains ---
router.get('/merge-trains', async (req: any, res) => {
  try {
    const status = await maestroService.getMergeTrainStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Experiments ---
router.get('/experiments', async (req: any, res) => {
  try {
    const exps = await maestroService.getExperiments();
    res.json(exps);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Audit ---
router.get('/audit/log', async (req: any, res) => {
  try {
    const logs = await maestroService.getAuditLog();
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

import express from 'express';
import { ensureAuthenticated, ensureRole } from '../middleware/auth.js';
import TurnaroundService from '../services/TurnaroundService.js';

export const buildTurnaroundRouter = (service: TurnaroundService = new TurnaroundService()) => {
  const router = express.Router();

  router.use(ensureAuthenticated);

  router.get('/forecast', async (_req, res) => {
    try {
      const forecast = await service.getForecast();
      res.json(forecast);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/forecast/actuals', async (req, res) => {
    const { week, actualIn, actualOut, note } = req.body;
    if (!week || actualIn === undefined || actualOut === undefined) {
      return res.status(400).json({ error: 'week, actualIn, and actualOut are required' });
    }
    try {
      const updated = await service.recordActuals(Number(week), Number(actualIn), Number(actualOut), note);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/forecast/:week/review', async (req, res) => {
    const week = Number(req.params.week);
    if (!week) {
      return res.status(400).json({ error: 'week is required' });
    }
    try {
      const review = await service.reviewWeekAndApplyDividend(week);
      res.json(review);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/spend-freeze', ensureRole(['admin', 'cfo', 'finance_manager']), async (req, res) => {
    const { active, killList } = req.body;
    if (typeof active !== 'boolean' || !Array.isArray(killList)) {
      return res.status(400).json({ error: 'active must be boolean and killList must be an array' });
    }
    try {
      const freeze = await service.toggleSpendFreeze(active, killList);
      res.json(freeze);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/procurements', async (req, res) => {
    const { vendor, description, recurring, monthlyAmount } = req.body;
    const requestedBy = (req as any).user?.id || 'unknown';
    if (!vendor || !description || monthlyAmount === undefined) {
      return res.status(400).json({ error: 'vendor, description, and monthlyAmount are required' });
    }
    try {
      const request = await service.createProcurementRequest({
        vendor,
        description,
        recurring,
        monthlyAmount: Number(monthlyAmount),
        requestedBy,
      });
      res.status(201).json(request);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/procurements/:id/approve', ensureRole(['cfo', 'gc']), async (req, res) => {
    try {
      const updated = await service.approveProcurement(req.params.id, (req as any).user.role);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.patch('/vendors/:id', ensureRole(['cfo', 'finance_manager']), async (req, res) => {
    try {
      const updated = await service.updateVendorRenegotiation(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/collections/:id/pay', ensureRole(['finance_manager', 'cfo']), async (req, res) => {
    const { amount } = req.body;
    if (amount === undefined) {
      return res.status(400).json({ error: 'amount is required' });
    }
    try {
      const updated = await service.recordCollectionPayment(req.params.id, Number(amount));
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/collections/:id/escalate', ensureRole(['finance_manager', 'cfo']), async (req, res) => {
    const { level } = req.body;
    if (!['none', 'dunning', 'exec'].includes(level)) {
      return res.status(400).json({ error: 'level must be none, dunning, or exec' });
    }
    try {
      const updated = await service.escalateCollection(req.params.id, level);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/shelfware/reclaim', ensureRole(['admin', 'it']), async (req, res) => {
    const { application, seatsReclaimed, monthlyCostPerSeat, owner } = req.body;
    if (!application || seatsReclaimed === undefined || monthlyCostPerSeat === undefined || !owner) {
      return res
        .status(400)
        .json({ error: 'application, seatsReclaimed, monthlyCostPerSeat, and owner are required' });
    }
    try {
      const record = await service.reclaimShelfware({
        application,
        seatsReclaimed: Number(seatsReclaimed),
        monthlyCostPerSeat: Number(monthlyCostPerSeat),
        owner,
      });
      res.status(201).json(record);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/cloud/rightsizing', ensureRole(['admin', 'sre', 'platform']), async (req, res) => {
    const { description, monthlySavings, owner } = req.body;
    if (!description || monthlySavings === undefined || !owner) {
      return res.status(400).json({ error: 'description, monthlySavings, and owner are required' });
    }
    try {
      const record = await service.applyCloudRightsizing({
        description,
        monthlySavings: Number(monthlySavings),
        owner,
      });
      res.status(201).json(record);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get('/dashboard', async (_req, res) => {
    try {
      const dashboard = await service.getDashboard();
      res.json(dashboard);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/anomalies/detect', async (_req, res) => {
    try {
      const tickets = await service.detectCostAnomalies();
      res.json({ tickets });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/anomalies', async (_req, res) => {
    try {
      const tickets = await service.listAnomalies();
      res.json({ tickets });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/epics', async (_req, res) => {
    try {
      const epics = await service.listEpics();
      res.json({ epics });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.patch('/epics/:epicId/tasks/:taskId', async (req, res) => {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }
    try {
      const task = await service.updateTaskStatus(req.params.epicId, req.params.taskId, status);
      res.json(task);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  return router;
};

const router = buildTurnaroundRouter();
export default router;

import express, { Request, Response } from 'express';
import { KPIEngine } from '../summitsight/engine/KPIEngine';
import { RiskEngine } from '../summitsight/engine/RiskEngine';
import { ForecastingEngine } from '../summitsight/engine/ForecastingEngine';
import { CorrelationEngine } from '../summitsight/engine/CorrelationEngine';
import { SummitsightDataService } from '../summitsight/SummitsightDataService';
import { ensureAuthenticated } from '../middleware/auth';

const router = express.Router();

const kpiEngine = KPIEngine.getInstance();
const riskEngine = new RiskEngine();
const forecastingEngine = new ForecastingEngine();
const correlationEngine = new CorrelationEngine();
const dataService = new SummitsightDataService();

// --- KPI Endpoints ---

router.get('/kpi', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const definitions = await dataService.getKPIDefinitions(req.query.category as string);
    res.json(definitions);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/kpi/:id/status', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId; // Assuming auth middleware attaches user
    const status = await kpiEngine.getKPIStatus(req.params.id, tenantId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/kpi/:id/history', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const values = await dataService.getKPIValues(req.params.id, tenantId, 'daily', 30);
    res.json(values);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// --- Dashboard Endpoints ---

router.get('/exec-dashboard/:role', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    // Return curated list of KPIs based on role
    const role = req.params.role;
    let kpisOfInterest: string[] = [];

    switch (role) {
      case 'CTO':
        kpisOfInterest = ['eng.deployment_freq', 'eng.change_fail_rate', 'eng.lead_time'];
        break;
      case 'CISO':
        kpisOfInterest = ['sec.incident_rate', 'sec.mttd'];
        break;
      case 'CEO':
        kpisOfInterest = ['biz.churn_prob', 'biz.margin', 'eng.deployment_freq', 'sec.incident_rate'];
        break;
      default:
        kpisOfInterest = ['eng.deployment_freq'];
    }

    const tenantId = (req as any).user?.tenantId;
    const dashboardData = await Promise.all(kpisOfInterest.map(id => kpiEngine.getKPIStatus(id, tenantId)));
    res.json({ role, metrics: dashboardData });

  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/warroom', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    // War room needs real-time critical stats
    const tenantId = (req as any).user?.tenantId;

    // 1. Critical KPIs
    const criticalKPIs = ['sec.incident_rate', 'eng.change_fail_rate'];
    const kpiData = await Promise.all(criticalKPIs.map(id => kpiEngine.getKPIStatus(id, tenantId)));

    // 2. Risk Assessment
    const riskData = await riskEngine.assessTenantRisk(tenantId || 'global'); // Fallback if needed

    res.json({
        mode: 'active',
        timestamp: new Date(),
        kpis: kpiData,
        risks: riskData
    });

  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// --- Advanced Analytics Endpoints ---

router.get('/forecast/:kpiId', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const forecast = await forecastingEngine.generateForecast(req.params.kpiId, tenantId);
    res.json(forecast);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/correlation', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const { kpiA, kpiB } = req.query;

    if (!kpiA || !kpiB) {
        return res.status(400).json({ error: 'kpiA and kpiB are required' });
    }

    const result = await correlationEngine.correlateKPIs(kpiA as string, kpiB as string, tenantId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const KPIEngine_js_1 = require("../summitsight/engine/KPIEngine.js");
const RiskEngine_js_1 = require("../summitsight/engine/RiskEngine.js");
const ForecastingEngine_js_1 = require("../summitsight/engine/ForecastingEngine.js");
const CorrelationEngine_js_1 = require("../summitsight/engine/CorrelationEngine.js");
const SummitsightDataService_js_1 = require("../summitsight/SummitsightDataService.js");
const auth_js_1 = require("../middleware/auth.js");
const http_param_js_1 = require("../utils/http-param.js");
const router = express_1.default.Router();
const kpiEngine = KPIEngine_js_1.KPIEngine.getInstance();
const riskEngine = new RiskEngine_js_1.RiskEngine();
const forecastingEngine = new ForecastingEngine_js_1.ForecastingEngine();
const correlationEngine = new CorrelationEngine_js_1.CorrelationEngine();
const dataService = new SummitsightDataService_js_1.SummitsightDataService();
// --- KPI Endpoints ---
router.get('/kpi', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const definitions = await dataService.getKPIDefinitions((0, http_param_js_1.firstString)(req.query.category));
        res.json(definitions);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/kpi/:id/status', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId; // Assuming auth middleware attaches user
        const status = await kpiEngine.getKPIStatus((0, http_param_js_1.firstStringOr)(req.params.id, ''), tenantId);
        res.json(status);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/kpi/:id/history', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const values = await dataService.getKPIValues((0, http_param_js_1.firstStringOr)(req.params.id, ''), tenantId, 'daily', 30);
        res.json(values);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// --- Dashboard Endpoints ---
router.get('/exec-dashboard/:role', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        // Return curated list of KPIs based on role
        const role = (0, http_param_js_1.firstStringOr)(req.params.role, '');
        let kpisOfInterest = [];
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
        const tenantId = req.user?.tenantId;
        const dashboardData = await Promise.all(kpisOfInterest.map(id => kpiEngine.getKPIStatus(id, tenantId)));
        res.json({ role, metrics: dashboardData });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/warroom', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        // War room needs real-time critical stats
        const tenantId = req.user?.tenantId;
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// --- Advanced Analytics Endpoints ---
router.get('/forecast/:kpiId', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const forecast = await forecastingEngine.generateForecast((0, http_param_js_1.firstStringOr)(req.params.kpiId, ''), tenantId);
        res.json(forecast);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/correlation', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const kpiA = (0, http_param_js_1.firstString)(req.query.kpiA);
        const kpiB = (0, http_param_js_1.firstString)(req.query.kpiB);
        if (!kpiA || !kpiB) {
            return res.status(400).json({ error: 'kpiA and kpiB are required' });
        }
        const result = await correlationEngine.correlateKPIs(kpiA, kpiB, tenantId);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;

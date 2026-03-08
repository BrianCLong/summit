"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const ThreatIntelligenceFusionService_js_1 = require("../src/services/ThreatIntelligenceFusionService.js");
const PredictiveThreatAnalyticsService_js_1 = require("../src/services/PredictiveThreatAnalyticsService.js");
const AutomatedIntelligenceReportingService_js_1 = require("../src/services/AutomatedIntelligenceReportingService.js");
const threat_intelligence_js_1 = __importDefault(require("../src/routes/threat-intelligence.js"));
globals_1.jest.mock('../src/middleware/auth.js', () => ({
    ensureAuthenticated: (_req, _res, next) => next(),
}));
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;
// Mock dependencies
globals_1.jest.mock('../src/services/OSINTAggregator.js', () => ({
    __esModule: true,
    default: globals_1.jest.fn().mockImplementation(() => ({
        ingest: globals_1.jest.fn(() => Promise.resolve({ status: 'queued', position: 1, score: 50 })),
        getStats: globals_1.jest.fn(() => ({ queueLength: 5, highestScore: 80 })),
    })),
}));
globals_1.jest.mock('../src/services/SecureFusionService.js', () => ({
    __esModule: true,
    default: globals_1.jest.fn().mockImplementation(() => ({
        fuse: globals_1.jest.fn(() => Promise.resolve({ id: 'fused-id', status: 'merged' })),
    })),
}));
globals_1.jest.mock('../src/services/TimeSeriesIntelligenceService.js', () => ({
    TimeSeriesIntelligenceService: globals_1.jest.fn().mockImplementation(() => ({
        getHistory: globals_1.jest.fn(() => Promise.resolve([
            { timestamp: 1000, value: 10 },
            { timestamp: 2000, value: 12 },
            { timestamp: 3000, value: 15 },
            { timestamp: 4000, value: 20 },
            { timestamp: 5000, value: 25 },
        ])),
        detectAnomalies: globals_1.jest.fn(() => Promise.resolve([])),
    })),
}));
globals_1.jest.mock('../src/services/IntelligenceAnalysisService.js', () => ({
    IntelligenceAnalysisService: globals_1.jest.fn().mockImplementation(() => ({
        generateGapAnalysis: globals_1.jest.fn(() => Promise.resolve({
            identifiedGaps: ['Gap 1', 'Gap 2'],
            recommendations: ['Rec 1'],
        })),
    })),
}));
globals_1.jest.mock('../src/config/database.js', () => ({
    getNeo4jDriver: globals_1.jest.fn().mockReturnValue({
        session: () => ({
            run: globals_1.jest.fn(() => Promise.resolve({})),
            close: globals_1.jest.fn(() => Promise.resolve({})),
        }),
    }),
}));
describeIf('Threat Intelligence Platform', () => {
    let app;
    let fusionService;
    beforeAll(async () => {
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/api/threat-intel', threat_intelligence_js_1.default);
        fusionService = ThreatIntelligenceFusionService_js_1.ThreatIntelligenceFusionService.getInstance();
    });
    describe('PredictiveThreatAnalyticsService', () => {
        it('should forecast metrics correctly', async () => {
            const service = new PredictiveThreatAnalyticsService_js_1.PredictiveThreatAnalyticsService();
            const result = await service.forecast('test_metric', 5);
            expect(result.metric).toBe('test_metric');
            expect(result.predictions).toHaveLength(5);
            expect(result.predictions[0].value).toBeGreaterThan(25); // Based on mock data trend
        });
        it('should assess strategic warning', async () => {
            const service = new PredictiveThreatAnalyticsService_js_1.PredictiveThreatAnalyticsService();
            const warning = await service.assessStrategicWarning();
            expect(warning).toHaveProperty('level');
            expect(warning).toHaveProperty('score');
        });
    });
    describe('AutomatedIntelligenceReportingService', () => {
        it('should generate a briefing', async () => {
            const service = new AutomatedIntelligenceReportingService_js_1.AutomatedIntelligenceReportingService();
            const briefing = await service.generateDailyBriefing({
                strategicWarning: { level: 'HIGH', score: 75, indicators: [] },
                recentThreats: [{ id: '1', name: 'Test Threat', severity: 'high' }]
            });
            expect(briefing.executiveSummary).toContain('Daily Intelligence Briefing');
            expect(briefing.topThreats).toHaveLength(1);
            expect(briefing.gaps).toEqual(['Gap 1', 'Gap 2']);
        });
    });
    describe('API Endpoints', () => {
        it('POST /api/threat-intel/ingest should accept data', async () => {
            // Mock auth middleware bypass or valid token if needed
            // Assuming dev mode auth works as per app.ts
            const res = await (0, supertest_1.default)(app)
                .post('/api/threat-intel/ingest')
                .set('Authorization', 'Bearer dev-token')
                .send({ item: { title: 'New Threat' }, type: 'OSINT' });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
        it('GET /api/threat-intel/dashboard should return data', async () => {
            const res = await (0, supertest_1.default)(app)
                .get('/api/threat-intel/dashboard')
                .set('Authorization', 'Bearer dev-token');
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty('strategicWarning');
            expect(res.body.data).toHaveProperty('forecast');
        });
    });
});

import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { ThreatIntelligenceFusionService } from '../src/services/ThreatIntelligenceFusionService.js';
import { PredictiveThreatAnalyticsService } from '../src/services/PredictiveThreatAnalyticsService.js';
import { AutomatedIntelligenceReportingService } from '../src/services/AutomatedIntelligenceReportingService.js';
import threatIntelRouter from '../src/routes/threat-intelligence.js';

jest.mock('../src/middleware/auth.js', () => ({
  ensureAuthenticated: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

const describeIf =
  process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

// Mock dependencies
jest.mock('../src/services/OSINTAggregator.js', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    ingest: jest.fn(() =>
      Promise.resolve({ status: 'queued', position: 1, score: 50 }),
    ),
    getStats: jest.fn(() => ({ queueLength: 5, highestScore: 80 })),
  })),
}));

jest.mock('../src/services/SecureFusionService.js', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    fuse: jest.fn(() => Promise.resolve({ id: 'fused-id', status: 'merged' })),
  })),
}));

jest.mock('../src/services/TimeSeriesIntelligenceService.js', () => ({
  TimeSeriesIntelligenceService: jest.fn().mockImplementation(() => ({
    getHistory: jest.fn(() =>
      Promise.resolve([
        { timestamp: 1000, value: 10 },
        { timestamp: 2000, value: 12 },
        { timestamp: 3000, value: 15 },
        { timestamp: 4000, value: 20 },
        { timestamp: 5000, value: 25 },
      ]),
    ),
    detectAnomalies: jest.fn(() => Promise.resolve([])),
  })),
}));

jest.mock('../src/services/IntelligenceAnalysisService.js', () => ({
  IntelligenceAnalysisService: jest.fn().mockImplementation(() => ({
    generateGapAnalysis: jest.fn(() =>
      Promise.resolve({
        identifiedGaps: ['Gap 1', 'Gap 2'],
        recommendations: ['Rec 1'],
      }),
    ),
  })),
}));

jest.mock('../src/config/database.js', () => ({
  getNeo4jDriver: jest.fn().mockReturnValue({
    session: () => ({
      run: jest.fn(() => Promise.resolve({})),
      close: jest.fn(() => Promise.resolve({})),
    }),
  }),
}));

describeIf('Threat Intelligence Platform', () => {
  let app: express.Express;
  let fusionService: ThreatIntelligenceFusionService;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/threat-intel', threatIntelRouter);
    fusionService = ThreatIntelligenceFusionService.getInstance();
  });

  describe('PredictiveThreatAnalyticsService', () => {
    it('should forecast metrics correctly', async () => {
      const service = new PredictiveThreatAnalyticsService();
      const result = await service.forecast('test_metric', 5);

      expect(result.metric).toBe('test_metric');
      expect(result.predictions).toHaveLength(5);
      expect(result.predictions[0].value).toBeGreaterThan(25); // Based on mock data trend
    });

    it('should assess strategic warning', async () => {
      const service = new PredictiveThreatAnalyticsService();
      const warning = await service.assessStrategicWarning();

      expect(warning).toHaveProperty('level');
      expect(warning).toHaveProperty('score');
    });
  });

  describe('AutomatedIntelligenceReportingService', () => {
    it('should generate a briefing', async () => {
      const service = new AutomatedIntelligenceReportingService();
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
      const res = await request(app)
        .post('/api/threat-intel/ingest')
        .set('Authorization', 'Bearer dev-token')
        .send({ item: { title: 'New Threat' }, type: 'OSINT' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/threat-intel/dashboard should return data', async () => {
      const res = await request(app)
        .get('/api/threat-intel/dashboard')
        .set('Authorization', 'Bearer dev-token');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('strategicWarning');
      expect(res.body.data).toHaveProperty('forecast');
    });
  });
});

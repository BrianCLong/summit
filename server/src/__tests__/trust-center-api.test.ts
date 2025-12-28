
import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import router from '../../src/routes/trust-center-api.js';

// Mock getPostgresPool
jest.mock('../../src/db/postgres.js', () => ({
  getPostgresPool: jest.fn(() => ({
    query: jest.fn().mockImplementation((query: any) => {
      const q = typeof query === 'string' ? query : query.text || '';
      if (q.includes('certifications')) {
        return Promise.resolve({ rows: [{ framework: 'SOC2', status: 'active' }] });
      }
      if (q.includes('incidents')) {
        return Promise.resolve({ rows: [{ count: '2' }] });
      }
      return Promise.resolve({ rows: [] });
    }),
  })),
}));

// Mock axios for SLO exporter
jest.mock('axios', () => ({
  default: {
      get: jest.fn().mockImplementation((url) => {
        if (url === 'http://localhost:9092/metrics.json') {
          return Promise.resolve({
            data: [
                { name: 'smoke_uptime_pct', values: [{ value: 99.9 }] }
            ]
          });
        }
        return Promise.reject(new Error('Not found'));
      })
  }
}));

// Mock other services
jest.mock('../../src/trust-center/regulatory-pack-service.js', () => ({
    regulatoryPackService: {}
}));
jest.mock('../../src/trust-center/evidence-engine.js', () => ({
    evidenceEngine: {}
}));
jest.mock('../../src/trust-center/trust-center-service.js', () => ({
    trustCenterService: {}
}));

const app = express();
app.use(express.json());
app.use('/api/v1/trust', router);

describe('Trust Center API Public Endpoints', () => {
  it('GET /api/v1/trust/status should return status with metrics', async () => {
    const res = await request(app).get('/api/v1/trust/status');
    expect(res.status).toBe(200);
    expect(res.body.overallStatus).toBe('operational');
    expect(res.body.certifications).toHaveLength(1);
    expect(res.body.certifications[0].framework).toBe('SOC2');
    expect(res.body.incidentCount).toBe(2);
    expect(res.body.uptime.last24h).toBe(99.9); // Should come from mock axios
  });

  it('GET /api/v1/trust/slo should return SLO metrics', async () => {
    const res = await request(app).get('/api/v1/trust/slo');
    expect(res.status).toBe(200);
    expect(res.body.availability.target).toBe(99.9);
  });
});

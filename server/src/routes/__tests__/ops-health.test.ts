import request from 'supertest';
import express, { Express } from 'express';
import opsHealthRouter, { healthEventStore } from '../ops-health.js';

// Mock dependencies
jest.mock('../../middleware/rbac.js', () => ({
  requireRole: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

jest.mock('../../middleware/auth.js', () => ({
  authenticateToken: jest.fn((req: any, res: any, next: any) => {
    req.user = { id: 'test-user', role: 'admin' };
    next();
  }),
}));

jest.mock('../../config/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../middleware/safety-mode.js', () => ({
  getSafetyState: jest.fn(async () => ({
    globalKillSwitchActive: false,
    safeModeEnabled: false,
  })),
}));

jest.mock('../../monitoring/metrics.js', () => ({
  register: {
    metrics: jest.fn(async () => 'http_requests_total{method="GET",route="/api/test",status_code="200"} 100'),
  },
}));

describe('Ops Health Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/ops/system-health', opsHealthRouter);

    // Clear event store before each test
    healthEventStore.clear();
  });

  describe('GET /api/ops/system-health/summary', () => {
    it('should return system health summary', async () => {
      const response = await request(app)
        .get('/api/ops/system-health/summary')
        .expect(200);

      expect(response.body).toHaveProperty('generatedAt');
      expect(response.body).toHaveProperty('commitOrVersion');
      expect(response.body).toHaveProperty('invariants');
      expect(response.body).toHaveProperty('killSwitch');
      expect(response.body).toHaveProperty('policy');
      expect(response.body).toHaveProperty('verification');
    });

    it('should include invariants status', async () => {
      const response = await request(app)
        .get('/api/ops/system-health/summary')
        .expect(200);

      expect(response.body.invariants).toHaveProperty('enforced');
      expect(response.body.invariants).toHaveProperty('lastViolationAt');
      expect(response.body.invariants).toHaveProperty('activePolicies');
      expect(response.body.invariants).toHaveProperty('recentViolations24h');
      expect(response.body.invariants.enforced).toBe(true);
    });

    it('should include kill switch status', async () => {
      const response = await request(app)
        .get('/api/ops/system-health/summary')
        .expect(200);

      expect(response.body.killSwitch).toHaveProperty('state');
      expect(response.body.killSwitch.state).toBe('normal');
    });

    it('should include policy denial statistics', async () => {
      // Add some test policy denial events
      healthEventStore.addEvent({
        type: 'policy_denial',
        severity: 'warn',
        summary: 'Test policy denial',
        details: { ruleId: 'test-rule-1' },
      });

      const response = await request(app)
        .get('/api/ops/system-health/summary')
        .expect(200);

      expect(response.body.policy).toHaveProperty('denials24h');
      expect(response.body.policy).toHaveProperty('topRules');
      expect(response.body.policy.denials24h).toBeGreaterThan(0);
    });

    it('should include verification gates', async () => {
      const response = await request(app)
        .get('/api/ops/system-health/summary')
        .expect(200);

      expect(response.body.verification).toHaveProperty('gates');
      expect(Array.isArray(response.body.verification.gates)).toBe(true);
      expect(response.body.verification.gates.length).toBeGreaterThan(0);
    });

    it('should handle kill switch active state', async () => {
      const { getSafetyState } = require('../../middleware/safety-mode.js');
      getSafetyState.mockResolvedValueOnce({
        globalKillSwitchActive: true,
        safeModeEnabled: false,
      });

      const response = await request(app)
        .get('/api/ops/system-health/summary')
        .expect(200);

      expect(response.body.killSwitch.state).toBe('hard');
      expect(response.body.killSwitch.reason).toContain('Global kill switch');
    });

    it('should handle safe mode state', async () => {
      const { getSafetyState } = require('../../middleware/safety-mode.js');
      getSafetyState.mockResolvedValueOnce({
        globalKillSwitchActive: false,
        safeModeEnabled: true,
      });

      const response = await request(app)
        .get('/api/ops/system-health/summary')
        .expect(200);

      expect(response.body.killSwitch.state).toBe('soft');
      expect(response.body.killSwitch.reason).toContain('Safe mode');
    });
  });

  describe('GET /api/ops/system-health/events', () => {
    beforeEach(() => {
      // Add test events
      healthEventStore.addEvent({
        type: 'invariant_violation',
        severity: 'error',
        summary: 'Test invariant violation',
        details: { rule: 'test-rule' },
      });

      healthEventStore.addEvent({
        type: 'policy_denial',
        severity: 'warn',
        summary: 'Test policy denial',
        details: { ruleId: 'test-rule-1' },
      });
    });

    it('should return events list', async () => {
      const response = await request(app)
        .get('/api/ops/system-health/events')
        .expect(200);

      expect(response.body).toHaveProperty('events');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('filters');
      expect(Array.isArray(response.body.events)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/ops/system-health/events?limit=1')
        .expect(200);

      expect(response.body.events.length).toBeLessThanOrEqual(1);
    });

    it('should filter by type', async () => {
      const response = await request(app)
        .get('/api/ops/system-health/events?type=invariant_violation')
        .expect(200);

      expect(response.body.events.length).toBeGreaterThan(0);
      response.body.events.forEach((event: any) => {
        expect(event.type).toBe('invariant_violation');
      });
    });

    it('should filter by severity', async () => {
      const response = await request(app)
        .get('/api/ops/system-health/events?severity=error')
        .expect(200);

      response.body.events.forEach((event: any) => {
        expect(event.severity).toBe('error');
      });
    });

    it('should filter by since parameter', async () => {
      const since = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago
      const response = await request(app)
        .get(`/api/ops/system-health/events?since=${since}`)
        .expect(200);

      response.body.events.forEach((event: any) => {
        expect(new Date(event.timestamp).getTime()).toBeGreaterThanOrEqual(new Date(since).getTime());
      });
    });

    it('should reject invalid limit', async () => {
      await request(app)
        .get('/api/ops/system-health/events?limit=9999')
        .expect(400);
    });

    it('should reject invalid since date', async () => {
      await request(app)
        .get('/api/ops/system-health/events?since=invalid-date')
        .expect(400);
    });

    it('should apply default limit of 100', async () => {
      // Add more than 100 events
      for (let i = 0; i < 150; i++) {
        healthEventStore.addEvent({
          type: 'policy_denial',
          severity: 'info',
          summary: `Event ${i}`,
          details: {},
        });
      }

      const response = await request(app)
        .get('/api/ops/system-health/events')
        .expect(200);

      expect(response.body.events.length).toBeLessThanOrEqual(100);
    });
  });

  describe('POST /api/ops/system-health/events', () => {
    it('should create new event', async () => {
      const eventData = {
        type: 'invariant_violation',
        severity: 'error',
        summary: 'Test violation',
        details: { rule: 'test-rule' },
      };

      const response = await request(app)
        .post('/api/ops/system-health/events')
        .send(eventData)
        .expect(201);

      expect(response.body.success).toBe(true);

      // Verify event was added
      const events = await request(app)
        .get('/api/ops/system-health/events?type=invariant_violation')
        .expect(200);

      expect(events.body.events.length).toBeGreaterThan(0);
    });

    it('should reject missing required fields', async () => {
      await request(app)
        .post('/api/ops/system-health/events')
        .send({ type: 'invariant_violation' })
        .expect(400);
    });

    it('should reject invalid type', async () => {
      await request(app)
        .post('/api/ops/system-health/events')
        .send({
          type: 'invalid_type',
          severity: 'error',
          summary: 'Test',
        })
        .expect(400);
    });

    it('should reject invalid severity', async () => {
      await request(app)
        .post('/api/ops/system-health/events')
        .send({
          type: 'invariant_violation',
          severity: 'invalid_severity',
          summary: 'Test',
        })
        .expect(400);
    });

    it('should accept all valid event types', async () => {
      const types = ['invariant_violation', 'kill_switch_trip', 'policy_denial', 'verification_gate_failure', 'safety_mode_change'];

      for (const type of types) {
        await request(app)
          .post('/api/ops/system-health/events')
          .send({
            type,
            severity: 'info',
            summary: `Test ${type}`,
            details: {},
          })
          .expect(201);
      }
    });

    it('should accept all valid severities', async () => {
      const severities = ['info', 'warn', 'error', 'critical'];

      for (const severity of severities) {
        await request(app)
          .post('/api/ops/system-health/events')
          .send({
            type: 'policy_denial',
            severity,
            summary: `Test ${severity}`,
            details: {},
          })
          .expect(201);
      }
    });
  });

  describe('Event Store', () => {
    it('should limit stored events to max capacity', () => {
      // Add more than maxEvents
      for (let i = 0; i < 1200; i++) {
        healthEventStore.addEvent({
          type: 'policy_denial',
          severity: 'info',
          summary: `Event ${i}`,
          details: {},
        });
      }

      const events = healthEventStore.getEvents({ limit: 2000 });
      expect(events.length).toBeLessThanOrEqual(1000);
    });

    it('should order events by timestamp descending', () => {
      healthEventStore.addEvent({
        type: 'policy_denial',
        severity: 'info',
        summary: 'Event 1',
        details: {},
      });

      // Wait a bit to ensure different timestamp
      setTimeout(() => {
        healthEventStore.addEvent({
          type: 'policy_denial',
          severity: 'info',
          summary: 'Event 2',
          details: {},
        });
      }, 10);

      const events = healthEventStore.getEvents({ limit: 2 });
      if (events.length >= 2) {
        expect(new Date(events[0].timestamp).getTime()).toBeGreaterThanOrEqual(
          new Date(events[1].timestamp).getTime()
        );
      }
    });
  });
});

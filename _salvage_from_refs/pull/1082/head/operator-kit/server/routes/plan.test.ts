import request from 'supertest';
import express from 'express';
import { planRoute } from './plan'; // Import the named export
import { Policy } from '../types/policy';

// Mock policy for testing
const mockPolicy: Policy = {
  policy: {
    version: 1,
    defaults: { stream: true, reserve_fraction: 0.2, max_sla_ms: 6000 },
    models: [
      { name:'openai/chatgpt-plus', class:'hosted', quota:{ type:'rolling', window:'3h', unit:'messages', cap:2 }, allow_tasks:['qa'], loa_max:1 },
      { name:'google/gemini-pro', class:'hosted', quota:{ type:'fixed', period:'daily', tz:'America/Los_Angeles', units:{ rpd:'from_console' } }, allow_tasks:['qa'], loa_max:1 },
      { name:'anthropic/claude-pro', class:'hosted', quota:{ type:'rolling', window:'5h', unit:'messages', cap:100 }, allow_tasks:['qa'], loa_max:1 }
    ],
    routing_rules:[ { match:{ task:'qa', loa:1 }, route:{ prefer:['openai/chatgpt-plus'], fallback:['google/gemini-pro','anthropic/claude-pro'] } } ]
  },
  work_unit_overrides_schema: {
    tokens_max: "int",
    context_budget_tokens: "int",
    temperature: { min: 0.0, max: 1.5 },
    streaming: false,
    tools_allowed: [],
    cost_ceiling_usd: 0.0,
    provider_hints: []
  }
};

// Mock getPolicy to return our mockPolicy
jest.mock('../policy', () => ({
  loadPolicy: jest.fn(() => mockPolicy),
}));

// Mock fetchJSON for burndown and health
jest.mock('../utils', () => ({
  fetchJSON: jest.fn((url) => {
    if (url.includes('/status/burndown.json')) {
      return Promise.resolve({
        windows: { m1: {}, h1: {}, d1: {} },
        spend_day_usd: { 'openai/chatgpt-plus': 0, 'google/gemini-pro': 0, 'anthropic/claude-pro': 0 }
      });
    }
    if (url.includes('/status/health.json')) {
      return Promise.resolve({});
    }
    return Promise.resolve({});
  }),
}));

// Mock QuotaStore methods
jest.mock('../quotas/store', () => ({
  MemoryQuotaStore: jest.fn().mockImplementation(() => ({
    record: jest.fn(),
    usedInRolling: jest.fn(() => 0),
    usedInFixed: jest.fn(() => ({ used: 0, windowStart: '', windowEnd: '' })),
  })),
}));

const app = express();
app.use(express.json());
app.set('policy', mockPolicy.policy); // Set the policy on the app
app.post('/plan', planRoute); // Use the named export

describe('planRoute', () => {
  it('denies without rule', async () => {
    const res = await request(app).post('/plan').send({ task: 'unknown.task', env: 'dev', loa: 0 });
    expect(res.status).toBe(400); // Changed to 400 as per the new plan.ts logic
    expect(res.body.allow).toBe(false);
    expect(res.body.denial).toBe('no_matching_rule');
  });

  it('denies with insufficient LOA', async () => {
    const res = await request(app).post('/plan').send({ task: 'qa', env: 'dev', loa: 2 }); // loa_max for qa is 1
    expect(res.status).toBe(200); // Still 200, but allow:false
    expect(res.body.policy.allow).toBe(false);
    expect(res.body.policy.reason).toContain('Insufficient LOA');
  });

  it('falls back when rolling quota exhausted', async () => {
    // Mock usedInRolling to simulate exhaustion
    require('../quotas/store').MemoryQuotaStore.mockImplementationOnce(() => ({
      record: jest.fn(),
      usedInRolling: jest.fn(() => 2), // Simulate 2 messages used for cap 2
      usedInFixed: jest.fn(() => ({ used: 0, windowStart: '', windowEnd: '' })),
    }));

    const res = await request(app).post('/plan').send({ task: 'qa', env: 'dev', loa: 1 });
    expect(res.status).toBe(200);
    expect(res.body.decision.model).not.toBe('openai/chatgpt-plus');
    expect(res.body.decision.model).toBe('google/gemini-pro'); // Should fall back to gemini
  });

  it('allows hosted models when allowed', async () => {
    const res = await request(app).post('/plan').send({ task: 'qa', env: 'dev', loa: 1, controls: { allow_hosted: true } });
    expect(res.status).toBe(200);
    expect(res.body.decision.model).toBe('openai/chatgpt-plus');
  });

  it('denies if no eligible candidates', async () => {
    // Temporarily modify policy to have no eligible models for 'qa' task
    const originalRules = mockPolicy.policy.routing_rules;
    mockPolicy.policy.routing_rules = [];

    const res = await request(app).post('/plan').send({ task: 'qa', env: 'dev', loa: 1 });
    expect(res.status).toBe(200);
    expect(res.body.policy.allow).toBe(false);
    expect(res.body.policy.denial).toBe('no_matching_rule');

    // Restore original rules
    mockPolicy.policy.routing_rules = originalRules;
  });
});

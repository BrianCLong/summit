
import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { createGovernedHandler } from '../governedHandler.js';
import { GovernanceError } from '../../governance/errors.js';
import { tenantKillSwitch } from '../../tenancy/killSwitch.js';

// Mock logger
const loggerMock = {
  warn: () => {},
  error: () => {},
};

// We can't easily mock module exports in ESM with node:test without a loader or using dependency injection.
// For this test, we'll assume the logger import works or is already mocked/compatible if we just don't crash.
// However, since governedHandler imports logger directly, we should ideally use a linker or a test runner that supports mocking.
// Given the environment constraints, we will skip mocking the logger module directly and instead rely on the fact that
// `logger.warn` and `logger.error` are called. Ideally we would verify they are called, but for now we verify the behavior.
// If we really need to mock it, we would need to use `quibble` or `testdouble` or similar in this setup.
// BUT, since we just want to verify logic:

describe('createGovernedHandler', () => {
  it('should execute successfully when governance checks pass', async () => {
    const handler = createGovernedHandler({
      operationId: 'test_op',
      action: 'test:read',
      resourceType: 'test',
      handler: async (ctx) => {
        return { status: 200, body: { success: true } };
      },
    });

    const req = {
      tenantContext: { tenantId: 't1', environment: 'dev', privilegeTier: 'standard' },
      body: {},
      query: {},
      params: {},
    };
    const res = {
      status: mock.fn((code) => res),
      json: mock.fn((body) => body),
      setHeader: mock.fn(),
    };
    const next = mock.fn();

    await handler(req as any, res as any, next);

    assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
    assert.deepStrictEqual(res.json.mock.calls[0].arguments[0], { success: true });
    // Verify verdict header
    const setHeaderCalls = res.setHeader.mock.calls;
    const verdictCall = setHeaderCalls.find(call => call.arguments[0] === 'x-governance-verdict');
    assert.ok(verdictCall);
    const verdict = JSON.parse(verdictCall.arguments[1]);
    assert.strictEqual(verdict.action, 'ALLOW');
  });

  it('should block request when kill switch is active', async () => {
    // Mock kill switch
    mock.method(tenantKillSwitch, 'isDisabled', () => true);

    const handler = createGovernedHandler({
      operationId: 'test_op_kill',
      action: 'test:write',
      resourceType: 'test',
      handler: async (ctx) => {
        return { status: 200, body: { success: true } };
      },
    });

    const req = {
      tenantContext: { tenantId: 't1', environment: 'dev', privilegeTier: 'standard' },
      body: {},
    };
    const res = {
      status: mock.fn((code) => res),
      json: mock.fn((body) => body),
      setHeader: mock.fn(),
    };
    const next = mock.fn();

    await handler(req as any, res as any, next);

    assert.strictEqual(res.status.mock.calls[0].arguments[0], 403);
    const body = res.json.mock.calls[0].arguments[0];
    assert.strictEqual(body.error, 'GOVERNANCE_DENY');

    // Restore mock
    (tenantKillSwitch.isDisabled as any).mock.restore();
  });

  it('should return 400 if tenant context is missing', async () => {
    const handler = createGovernedHandler({
      operationId: 'test_op_no_tenant',
      action: 'test:read',
      resourceType: 'test',
      handler: async () => ({ status: 200, body: {} }),
    });

    const req = { body: {} }; // No tenantContext
    const res = {
      status: mock.fn((code) => res),
      json: mock.fn(),
    };
    const next = mock.fn();

    await handler(req as any, res as any, next);

    assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
  });
});

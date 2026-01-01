import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createGuardrailsMiddleware } from '../../src/middleware/guardrails.js';

describe('guardrailsMiddleware', () => {
  let req;
  let res;
  let next;
  let deps;

  beforeEach(() => {
    req = {
      method: 'POST',
      path: '/api/resource',
      originalUrl: '/api/resource',
      ip: '127.0.0.1',
      get: () => 'test-agent',
      user: {
        id: 'user-123',
        tenant_id: 'tenant-abc',
        sub: 'user-123',
      },
      headers: {},
      route: { path: '/api/resource' } // Mock route object properly
    };

    res = {
      headers: {},
      statusCode: 200,
      body: null,
      setHeader(k, v) { this.headers[k] = v; },
      status(c) { this.statusCode = c; return this; },
      json(b) { this.body = b; return this; }
    };

    next = mock.fn();

    deps = {
        opaAllow: mock.fn(async () => ({ allow: true })),
        appendProvenanceEntry: mock.fn(async () => ({ id: 'receipt-123' })),
        logAudit: mock.fn(async () => {}),
        recordMetric: mock.fn(),
        recordDenial: mock.fn()
    };
  });

  it('should skip enforcement for read operations', async () => {
    req.method = 'GET';
    const middleware = createGuardrailsMiddleware(deps);
    await middleware(req, res, next);

    assert.strictEqual(next.mock.calls.length, 1);
    assert.strictEqual(deps.opaAllow.mock.calls.length, 0);
  });

  it('should enforce policy on write operations (Allow)', async () => {
    // Ensure we map this route to allow it to pass mapping check
    req.path = '/api/billing/invoice';
    req.route.path = '/api/billing/invoice';

    const middleware = createGuardrailsMiddleware(deps);
    await middleware(req, res, next);

    // Check Policy Check
    assert.strictEqual(deps.opaAllow.mock.calls.length, 1);

    // Check Provenance Receipt
    assert.strictEqual(deps.appendProvenanceEntry.mock.calls.length, 1);
    const appendCall = deps.appendProvenanceEntry.mock.calls[0].arguments[0];
    assert.strictEqual(appendCall.tenantId, 'tenant-abc');
    assert.strictEqual(appendCall.actorId, 'user-123');

    // Check Headers
    assert.strictEqual(res.headers['x-summit-provenance-id'], 'receipt-123');
    assert.strictEqual(res.headers['x-summit-policy-decision'], 'allow');

    assert.strictEqual(next.mock.calls.length, 1);
  });

  it('should enforce policy on write operations (Deny)', async () => {
    req.path = '/api/billing/invoice';
    req.route.path = '/api/billing/invoice';

    deps.opaAllow = mock.fn(async () => ({ allow: false, reason: 'Test Deny' }));
    const middleware = createGuardrailsMiddleware(deps);

    await middleware(req, res, next);

    assert.strictEqual(deps.opaAllow.mock.calls.length, 1);
    assert.strictEqual(deps.appendProvenanceEntry.mock.calls.length, 0);

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.error, 'Policy Violation');
    assert.strictEqual(next.mock.calls.length, 0);
  });

  it('should deny unmapped routes', async () => {
    req.path = '/unknown-service'; // Unmapped path (not starting with /api)
    req.route.path = '/unknown-service';

    const middleware = createGuardrailsMiddleware(deps);

    await middleware(req, res, next);

    // Should NOT call OPA, should fail immediately
    assert.strictEqual(deps.opaAllow.mock.calls.length, 0);
    assert.strictEqual(deps.recordDenial.mock.calls.length, 1);

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.error, 'Policy Violation');
    assert.strictEqual(res.body.message, 'Operation not explicitly mapped to a security policy.');
    assert.strictEqual(next.mock.calls.length, 0);
  });

  it('should propagate approval receipt header to OPA', async () => {
    req.path = '/api/billing/invoice'; // Mapped path
    req.headers['x-summit-approval-receipt'] = 'approved-by-alice';
    const middleware = createGuardrailsMiddleware(deps);
    await middleware(req, res, next);

    assert.strictEqual(deps.opaAllow.mock.calls.length, 1);
    const callArgs = deps.opaAllow.mock.calls[0].arguments;
    assert.strictEqual(callArgs[1].approval_receipt, 'approved-by-alice');
  });
});

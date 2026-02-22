import { describe, it, expect, jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';

const mockGenerateBundle = jest.fn();

jest.unstable_mockModule('../../middleware/auth.js', () => ({
  ensureAuthenticated: (req: any, _res: any, next: any) => {
    req.user = {
      id: 'user-123',
      role: 'ADMIN',
      tenantId: 'tenant-123',
    };
    next();
  },
}));

jest.unstable_mockModule('../../lib/featureFlags.js', () => ({
  isEnabled: () => true,
}));

jest.unstable_mockModule('../../services/support/index.js', () => ({
  supportBundleService: {
    generateBundle: mockGenerateBundle,
  },
}));

const supportBundlesRouter = (await import('../support-bundles.js')).default;

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api', supportBundlesRouter);
  return app;
};

describe('support bundles router', () => {
  it('generates a support bundle with manifest and redacted payload', async () => {
    mockGenerateBundle.mockResolvedValue({
      manifest: { bundleId: 'support-bundle-1' },
      signatureType: 'none',
      manifestSignature: 'none:signature',
      bundle: { bundleId: 'support-bundle-1' },
      receipt: { id: 'receipt-1' },
      policyDecision: { policyDecisionId: 'policy-1' },
      redaction: { policyId: 'support-bundle-redaction-v1' },
    });

    const app = buildApp();
    const res = await request(app).post('/api/support-bundles:generate').send({
      tenantId: 'tenant-123',
      reason: 'Need diagnostics for pilot support.',
      receiptsLimit: 5,
    });

    expect(res.status).toBe(200);
    expect(res.body.manifest.bundleId).toBe('support-bundle-1');
    expect(res.body.receipt.id).toBe('receipt-1');
    expect(mockGenerateBundle).toHaveBeenCalledWith({
      actor: {
        id: 'user-123',
        role: 'ADMIN',
        tenantId: 'tenant-123',
        email: undefined,
      },
      tenantId: 'tenant-123',
      reason: 'Need diagnostics for pilot support.',
      receiptsLimit: 5,
      sloRunbook: undefined,
      sloWindow: undefined,
    });
  });
});

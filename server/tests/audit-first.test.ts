
// @ts-ignore
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { getMockReq, getMockRes } from '@jest-mock/express';

jest.mock('../src/provenance/ledger.js', () => ({
  provenanceLedger: {
    appendEntry: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../src/config/logger.js', () => ({
  __esModule: true,
  default: {
    child: () => ({
      debug: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

let auditFirstMiddleware: typeof import('../src/middleware/audit-first.js').auditFirstMiddleware;
let provenanceLedger: typeof import('../src/provenance/ledger.js').provenanceLedger;

describe('AuditFirstMiddleware', () => {
  beforeAll(async () => {
    ({ auditFirstMiddleware } = await import('../src/middleware/audit-first.js'));
    ({ provenanceLedger } = await import('../src/provenance/ledger.js'));
  });

  it('should call next for non-sensitive routes', () => {
    const req = getMockReq({ method: 'GET', path: '/public' });
    const { res, next } = getMockRes();

    auditFirstMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(provenanceLedger.appendEntry).not.toHaveBeenCalled();
  });

  it('should stamp sensitive routes', async () => {
    const req = getMockReq({
      method: 'POST',
      path: '/auth/login',
      body: { username: 'test' }
    });
    const { res, next } = getMockRes();

    auditFirstMiddleware(req, res, next);

    const finishHandler = (res.on as jest.Mock).mock.calls.find(
      ([event]) => event === 'finish',
    )?.[1];
    finishHandler?.();

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(next).toHaveBeenCalled();
    expect(provenanceLedger.appendEntry).toHaveBeenCalledWith(expect.objectContaining({
      actionType: 'API_POST',
      resourceId: '/auth/login',
    }));
  });

  it('should stamp sensitive GET routes', async () => {
      const req = getMockReq({
        method: 'GET',
        path: '/api/provenance/history',
      });
      const { res, next } = getMockRes();

      auditFirstMiddleware(req, res, next);

      const finishHandler = (res.on as jest.Mock).mock.calls.find(
        ([event]) => event === 'finish',
      )?.[1];
      finishHandler?.();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(next).toHaveBeenCalled();
      expect(provenanceLedger.appendEntry).toHaveBeenCalledWith(expect.objectContaining({
        actionType: 'API_GET',
        resourceId: '/api/provenance/history',
      }));
    });
});

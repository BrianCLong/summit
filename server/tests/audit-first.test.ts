
import { auditFirstMiddleware } from '../src/middleware/audit-first.js';
import { provenanceLedger } from '../src/provenance/ledger.js';
import { getMockReq, getMockRes } from '@jest-mock/express';

jest.mock('../src/provenance/ledger.js', () => ({
  provenanceLedger: {
    appendEntry: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../src/config/logger.js', () => ({
  child: () => ({
    debug: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('AuditFirstMiddleware', () => {
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

    // Simulate finish
    res.emit('finish');

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

      // Simulate finish
      res.emit('finish');

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(next).toHaveBeenCalled();
      expect(provenanceLedger.appendEntry).toHaveBeenCalledWith(expect.objectContaining({
        actionType: 'API_GET',
        resourceId: '/api/provenance/history',
      }));
    });
});

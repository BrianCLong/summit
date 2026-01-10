
import { jest } from '@jest/globals';
import { isDemoEnabled } from '../../server/src/demo/gate.js';
import { demoGate } from '../../server/src/demo/middleware.js';
import { Request, Response, NextFunction } from 'express';

describe('Demo Mode Hard Gate', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isDemoEnabled', () => {
    it('returns true when DEMO_MODE is "true"', () => {
      process.env.DEMO_MODE = 'true';
      expect(isDemoEnabled()).toBe(true);
    });

    it('returns false when DEMO_MODE is "false"', () => {
      process.env.DEMO_MODE = 'false';
      expect(isDemoEnabled()).toBe(false);
    });

    it('returns false when DEMO_MODE is missing', () => {
      delete process.env.DEMO_MODE;
      expect(isDemoEnabled()).toBe(false);
    });

    it('returns false when DEMO_MODE is random string', () => {
      process.env.DEMO_MODE = 'foo';
      expect(isDemoEnabled()).toBe(false);
    });
  });

  describe('demoGate Middleware', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;
    let statusSpy: any;
    let jsonSpy: any;

    beforeEach(() => {
      req = { path: '/api/demo/test', ip: '127.0.0.1' };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Partial<Response>;
      statusSpy = res.status;
      jsonSpy = res.json;
      next = jest.fn();
    });

    it('calls next() when DEMO_MODE is enabled', () => {
      process.env.DEMO_MODE = 'true';
      demoGate(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('returns 404 when DEMO_MODE is disabled', () => {
      process.env.DEMO_MODE = 'false';
      demoGate(req as Request, res as Response, next);
      expect(next).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'Not Found' });
    });

    it('returns 404 when DEMO_MODE is missing', () => {
      delete process.env.DEMO_MODE;
      demoGate(req as Request, res as Response, next);
      expect(next).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(404);
    });
  });
});

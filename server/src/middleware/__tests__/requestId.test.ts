/**
 * Tests for requestId middleware
 */

import { requestId } from '../requestId';
import { requestFactory, responseFactory, nextFactory } from '../../../../tests/factories/requestFactory';

describe('requestId middleware', () => {
  it('should generate a new request ID if not provided', () => {
    const req = requestFactory({
      headers: {},
    });
    const res = responseFactory();
    const next = nextFactory();

    const middleware = requestId();
    middleware(req as any, res, next);

    expect((req as any).reqId).toBeDefined();
    expect(typeof (req as any).reqId).toBe('string');
    expect((req as any).reqId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', (req as any).reqId);
    expect(next).toHaveBeenCalled();
  });

  it('should use existing x-request-id header if provided', () => {
    const existingId = 'existing-request-id-123';
    const req = requestFactory({
      headers: { 'x-request-id': existingId },
    });
    const res = responseFactory();
    const next = nextFactory();

    const middleware = requestId();
    middleware(req as any, res, next);

    expect((req as any).reqId).toBe(existingId);
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', existingId);
    expect(next).toHaveBeenCalled();
  });

  it('should set response header with request ID', () => {
    const req = requestFactory({
      headers: {},
    });
    const res = responseFactory();
    const next = nextFactory();

    const middleware = requestId();
    middleware(req as any, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', (req as any).reqId);
  });

  it('should always call next()', () => {
    const req = requestFactory({
      headers: {},
    });
    const res = responseFactory();
    const next = nextFactory();

    const middleware = requestId();
    middleware(req as any, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple requests with unique IDs', () => {
    const middleware = requestId();

    const req1 = requestFactory({ headers: {} });
    const res1 = responseFactory();
    const next1 = nextFactory();

    const req2 = requestFactory({ headers: {} });
    const res2 = responseFactory();
    const next2 = nextFactory();

    middleware(req1 as any, res1, next1);
    middleware(req2 as any, res2, next2);

    expect((req1 as any).reqId).not.toBe((req2 as any).reqId);
    expect(next1).toHaveBeenCalled();
    expect(next2).toHaveBeenCalled();
  });
});

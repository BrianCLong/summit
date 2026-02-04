import { jest } from '@jest/globals';
import { authorize } from '../authorization.js';

const requestFactory = (overrides: Record<string, unknown> = {}) => ({
  user: undefined,
  headers: {},
  ...overrides,
});

const responseFactory = () => {
  const res: Record<string, unknown> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const nextFactory = () => jest.fn();

describe('authorize middleware', () => {
  it('returns 401 when no user is present', () => {
    const middleware = authorize('write_graph');
    const req = requestFactory();
    const res = responseFactory();
    const next = nextFactory();

    middleware(req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when permission is missing', () => {
    const middleware = authorize('write_graph');
    const req = requestFactory({ user: { role: 'VIEWER' } });
    const res = responseFactory();
    const next = nextFactory();

    middleware(req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ required: 'write_graph', error: 'Forbidden' }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('allows access when the user has the required capability', () => {
    const middleware = authorize('run_maestro');
    const req = requestFactory({ user: { role: 'OPERATOR' } });
    const res = responseFactory();
    const next = nextFactory();

    middleware(req as any, res as any, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});

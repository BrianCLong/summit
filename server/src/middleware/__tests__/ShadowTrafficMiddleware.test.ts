import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

const getPostgresPoolMock = jest.fn();
const shadowMock = jest.fn();

jest.unstable_mockModule('../../db/postgres.js', () => ({
  getPostgresPool: getPostgresPoolMock,
}));

jest.unstable_mockModule('../../services/ShadowService.js', () => ({
  shadowService: {
    shadow: shadowMock,
  },
}));

describe('ShadowTrafficMiddleware', () => {
  let clearShadowCache: (tenantId: string) => void;
  let shadowTrafficMiddleware: (req: any, res: any, next: any) => Promise<void>;
  let req: any;
  let res: any;
  let next: any;
  let queryMock: jest.Mock;

  beforeAll(async () => {
    ({ clearShadowCache, shadowTrafficMiddleware } = await import('../ShadowTrafficMiddleware.js'));
  });

  beforeEach(() => {
    jest.clearAllMocks();

    queryMock = jest.fn();
    getPostgresPoolMock.mockReturnValue({ query: queryMock } as any);
    shadowMock.mockImplementation(jest.fn());

    req = {
      method: 'POST',
      originalUrl: '/api/tasks',
      headers: { 'content-type': 'application/json' },
      body: { foo: 'bar' },
      user: { tenantId: 'tenant-1' },
    };
    res = {};
    next = jest.fn();

    clearShadowCache('tenant-1');
  });

  it('does not shadow when no DB config exists', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    await shadowTrafficMiddleware(req, res, next);

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('SELECT'), ['tenant-1']);
    expect(shadowMock).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('shadows when config exists and sampling hits', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          targetUrl: 'https://shadow.summit.io',
          samplingRate: 1.0,
          compareResponses: false,
        },
      ],
    });

    await shadowTrafficMiddleware(req, res, next);

    expect(shadowMock).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST', url: '/api/tasks' }),
      expect.objectContaining({ targetUrl: 'https://shadow.summit.io' }),
    );
    expect(next).toHaveBeenCalled();
  });

  it('uses cache and avoids second DB query', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          targetUrl: 'https://shadow.summit.io',
          samplingRate: 0.0,
          compareResponses: false,
        },
      ],
    });

    await shadowTrafficMiddleware(req, res, next);
    await shadowTrafficMiddleware(req, res, next);

    expect(queryMock).toHaveBeenCalledTimes(1);
  });
});

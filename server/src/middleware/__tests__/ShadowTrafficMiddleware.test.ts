import { jest } from '@jest/globals';

const shadowMock = jest.fn();
const queryMock = jest.fn();

jest.unstable_mockModule('../../services/ShadowService.js', () => ({
    shadowService: {
        shadow: shadowMock,
    },
}));

jest.unstable_mockModule('../../db/postgres.js', () => ({
    getPostgresPool: () => ({
        query: queryMock
    }),
}));

const { shadowTrafficMiddleware, clearShadowCache } = await import('../ShadowTrafficMiddleware.js');

describe('ShadowTrafficMiddleware', () => {
    let req: any;
    let res: any;
    let next: any;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            method: 'POST',
            originalUrl: '/api/tasks',
            headers: { 'content-type': 'application/json' },
            body: { foo: 'bar' },
            user: { tenantId: 'tenant-1' }
        };
        res = {};
        next = jest.fn();
        clearShadowCache('tenant-1');
    });

    it('should NOT shadow if no config for tenant in DB', async () => {
        queryMock.mockResolvedValueOnce({ rows: [] });

        await shadowTrafficMiddleware(req, res, next);

        expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('SELECT'), ['tenant-1']);
        expect(shadowMock).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
    });

    it('should shadow if config exists in DB and sampling hits', async () => {
        queryMock.mockResolvedValueOnce({
            rows: [{
                targetUrl: 'https://shadow.summit.io',
                samplingRate: 1.0,
                compareResponses: false
            }]
        });

        await shadowTrafficMiddleware(req, res, next);

        expect(shadowMock).toHaveBeenCalledWith(
            expect.objectContaining({
                method: 'POST',
                url: '/api/tasks'
            }),
            expect.objectContaining({
                targetUrl: 'https://shadow.summit.io'
            })
        );
        expect(next).toHaveBeenCalled();
    });

    it('should NOT shadow if sampling misses', async () => {
        queryMock.mockResolvedValueOnce({
            rows: [{
                targetUrl: 'https://shadow.summit.io',
                samplingRate: 0.0,
                compareResponses: false
            }]
        });

        await shadowTrafficMiddleware(req, res, next);
        expect(shadowMock).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
    });

    it('should use cache and NOT query DB second time', async () => {
        queryMock.mockResolvedValueOnce({
            rows: [{
                targetUrl: 'https://shadow.summit.io',
                samplingRate: 1.0,
                compareResponses: false
            }]
        });

        // First call
        await shadowTrafficMiddleware(req, res, next);
        expect(queryMock).toHaveBeenCalledTimes(1);

        // Second call
        await shadowTrafficMiddleware(req, res, next);
        expect(queryMock).toHaveBeenCalledTimes(1); // Still 1 due to cache
    });

    it('should NOT shadow if it is already a shadow request', async () => {
        req.headers['x-summit-shadow-request'] = 'true';
        queryMock.mockResolvedValueOnce({
            rows: [{
                targetUrl: 'https://shadow.summit.io',
                samplingRate: 1.0,
                compareResponses: false
            }]
        });

        await shadowTrafficMiddleware(req, res, next);
        expect(shadowMock).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
    });
});

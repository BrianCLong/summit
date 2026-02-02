import { jest } from '@jest/globals';

const shadowMock = jest.fn();
jest.unstable_mockModule('../../services/ShadowService.js', () => ({
    shadowService: {
        shadow: shadowMock,
    },
}));

const { shadowTrafficMiddleware, setShadowConfig } = await import('../ShadowTrafficMiddleware.js');

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
    });

    it('should NOT shadow if no config for tenant', () => {
        setShadowConfig('tenant-1', null);
        shadowTrafficMiddleware(req, res, next);
        expect(shadowMock).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
    });

    it('should shadow if config exists and sampling hits', () => {
        setShadowConfig('tenant-1', {
            targetUrl: 'https://shadow.summit.io',
            samplingRate: 1.0,
            compareResponses: false
        });

        shadowTrafficMiddleware(req, res, next);

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

    it('should NOT shadow if sampling misses', () => {
        setShadowConfig('tenant-1', {
            targetUrl: 'https://shadow.summit.io',
            samplingRate: 0.0,
            compareResponses: false
        });

        shadowTrafficMiddleware(req, res, next);
        expect(shadowMock).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
    });

    it('should NOT shadow if it is already a shadow request', () => {
        req.headers['x-summit-shadow-request'] = 'true';
        setShadowConfig('tenant-1', {
            targetUrl: 'https://shadow.summit.io',
            samplingRate: 1.0,
            compareResponses: false
        });

        shadowTrafficMiddleware(req, res, next);
        expect(shadowMock).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
    });
});

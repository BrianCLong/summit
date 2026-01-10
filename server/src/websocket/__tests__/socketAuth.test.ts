import { WebSocketCore } from '../core.js';
import { describe, it, expect, jest, beforeAll, afterAll, beforeEach } from '@jest/globals';

const mockQuery: jest.MockedFunction<
  (sql: string, params?: unknown[]) => Promise<{ rowCount: number }>
> = jest.fn();

// Mocks
jest.mock('../connectionManager.js', () => ({
  WebSocketConnectionPool: jest.fn().mockImplementation(() => ({
    registerConnection: jest.fn(),
    removeConnection: jest.fn(),
    handleServerRestart: jest.fn(),
    getStats: jest.fn().mockReturnValue({ connections: [] }),
    closeIdleConnections: jest.fn().mockReturnValue([])
  })),
  ManagedConnection: jest.fn()
}));

jest.mock('../../db/postgres.js', () => ({
  getPostgresPool: jest.fn(() => ({
    query: mockQuery
  }))
}));

jest.mock('uWebSockets.js', () => ({
    App: jest.fn(() => ({
        ws: jest.fn(),
        listen: jest.fn()
    })),
    SHARED_COMPRESSOR: 1
}), { virtual: true });

jest.mock('../../middleware/observability/otel-tracing.js', () => ({
    otelService: {
        createSpan: jest.fn().mockReturnValue({
            addSpanAttributes: jest.fn(),
            end: jest.fn()
        })
    }
}));

jest.mock('../../observability/metrics.js', () => ({
    activeConnections: {
        inc: jest.fn(),
        dec: jest.fn()
    }
}));

jest.mock('../../yjs/YjsHandler.js', () => ({
    YjsHandler: jest.fn()
}));

describe('WebSocket Authorization', () => {
    let core: WebSocketCore;
    const ORIGINAL_ENV = process.env.NODE_ENV;

    beforeAll(() => {
        process.env.NODE_ENV = 'test';
    });

    afterAll(() => {
        process.env.NODE_ENV = ORIGINAL_ENV;
    });

    beforeEach(() => {
        mockQuery.mockReset();
        mockQuery.mockResolvedValue({ rowCount: 0 }); // Default Deny
        core = Object.create(WebSocketCore.prototype);
        (core as any).checkInvestigationAccess = jest.fn(async () => false);
    });

    it('should deny subscription to investigation if unauthorized', async () => {
        const claims = {
            tenantId: 't1',
            userId: 'unauthorized_user',
            roles: [],
            permissions: [],
            sub: 'unauthorized_user',
            exp: 9999999999
        };
        const message = {
            type: 'subscribe',
            topics: ['investigation:123']
        };

        const allowed = await (core as any).opaAllow(claims, message);
        expect(allowed).toBe(false);
        expect((core as any).checkInvestigationAccess).toHaveBeenCalled();
    });

    it('should allow subscription to investigation if authorized', async () => {
        (core as any).checkInvestigationAccess = jest.fn(async () => true);

        const claims = {
            tenantId: 't1',
            userId: 'valid_user',
            roles: [],
            permissions: [],
            sub: 'valid_user',
            exp: 9999999999
        };
        const message = {
            type: 'subscribe',
            topics: ['investigation:123']
        };

        const allowed = await (core as any).opaAllow(claims, message);
        expect(allowed).toBe(true);
        expect((core as any).checkInvestigationAccess).toHaveBeenCalled();
    });

    it('should deny empty topics', async () => {
        const claims = { tenantId: 't1', userId: 'u1', roles: [], permissions: [], sub: 'u1', exp: 9999999999 };
        const message = { type: 'subscribe', topics: [] };
        const allowed = await (core as any).opaAllow(claims, message);
        expect(allowed).toBe(false);
    });

    it('should allow generic topics that do not start with investigation:', async () => {
        const claims = { tenantId: 't1', userId: 'u1', roles: [], permissions: [], sub: 'u1', exp: 9999999999 };
        const message = { type: 'subscribe', topics: ['some.other.topic'] };
        const allowed = await (core as any).opaAllow(claims, message);
        expect(allowed).toBe(true);
    });
});

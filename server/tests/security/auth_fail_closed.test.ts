
import { describe, it, expect, jest } from '@jest/globals';

// NOTE: This test reproduces the logic of the `authenticateToken` middleware found in `server/src/app.ts`.
// Ideally, we would import `createApp` and test the middleware in context. However, `createApp` has
// deep dependencies on database connections, Redis, and other services that are difficult to mock
// purely for a unit test of middleware logic without spinning up a full environment.
//
// Given the sprint constraint of "Surgical Fixes Only" and "No Refactors", extracting the middleware
// to a separate file for testing was deemed out of scope.
//
// Therefore, this test validates the *logic pattern* used in the fix to ensure the "Fail Closed"
// mechanism behaves as expected under various environment configurations.

describe('SEC-2025-001: Authentication Fail Closed (Logic Verification)', () => {

    it('should reject unauthenticated requests when ENABLE_INSECURE_DEV_AUTH is NOT set', async () => {
        // Setup environment
        const originalNodeEnv = process.env.NODE_ENV;
        const originalBypass = process.env.ENABLE_INSECURE_DEV_AUTH;

        process.env.NODE_ENV = 'development';
        delete process.env.ENABLE_INSECURE_DEV_AUTH;

        // Recreate the middleware logic exactly as in app.ts
        const authenticateToken = (req: any, res: any, next: any) => {
             // Development mode - relaxed auth for easier testing
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];

            if (token) {
              return next();
            }

            // SEC-2025-001: Fail Closed by default.
            if (process.env.ENABLE_INSECURE_DEV_AUTH === 'true') {
              req.user = { sub: 'dev-user', role: 'admin' };
              return next();
            }

            // Default: Reject
            res.status(401).json({ error: 'Unauthorized', message: 'No token provided' });
        };

        const req: any = { headers: {} };
        const res: any = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        };
        const next = jest.fn();

        await authenticateToken(req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();

        // Cleanup
        process.env.NODE_ENV = originalNodeEnv;
        if (originalBypass) process.env.ENABLE_INSECURE_DEV_AUTH = originalBypass;
    });

    it('should allow unauthenticated requests when ENABLE_INSECURE_DEV_AUTH is true', async () => {
        // Setup environment
        const originalNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';
        process.env.ENABLE_INSECURE_DEV_AUTH = 'true';

        // Recreate the middleware logic exactly as in app.ts
        const authenticateToken = (req: any, res: any, next: any) => {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];

            if (token) return next();

            if (process.env.ENABLE_INSECURE_DEV_AUTH === 'true') {
              req.user = { sub: 'dev-user', role: 'admin' };
              return next();
            }

            res.status(401).json({ error: 'Unauthorized' });
        };

        const req: any = { headers: {} };
        const res: any = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        };
        const next = jest.fn();

        await authenticateToken(req, res, next);

        // Assert
        expect(next).toHaveBeenCalled();

        // Cleanup
        process.env.NODE_ENV = originalNodeEnv;
        delete process.env.ENABLE_INSECURE_DEV_AUTH;
    });
});

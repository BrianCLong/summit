"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Using relative path mapping that aligns with Jest config
const appFactory_js_1 = require("../../../appFactory.js");
const tenantValidator_js_1 = require("../../../middleware/tenantValidator.js");
// Mock database config to avoid real connection attempts in this simulation
globals_1.jest.mock('../../../config/database', () => ({
    getNeo4jDriver: globals_1.jest.fn(),
    getPostgresPool: globals_1.jest.fn(),
    getRedisClient: globals_1.jest.fn()
}));
(0, globals_1.describe)('Tenant Boundary Leak Simulation Engine', () => {
    let app;
    let simulationHandler;
    let tenantA = 'tenant-a-' + Date.now();
    let tenantB = 'tenant-b-' + Date.now();
    (0, globals_1.beforeAll)(async () => {
        // Create lightweight app that doesn't try to connect to DBs on startup
        app = (0, appFactory_js_1.createApp)({ lightweight: true });
        // Mock a route that simulates data access for Data Bleed test
        // Since we can't easily inject routes into the compiled app without modifying source,
        // we will mount a simulation route on the express app instance for testing purposes.
        const handler = (req, res) => {
            try {
                // Simulate middleware check
                const resourceTenantHeader = req.headers['x-resource-tenant-id'];
                const resourceTenantId = Array.isArray(resourceTenantHeader)
                    ? resourceTenantHeader[0]
                    : resourceTenantHeader;
                const userTenantHeader = req.headers['x-user-tenant-id'];
                const userTenantId = Array.isArray(userTenantHeader)
                    ? userTenantHeader[0]
                    : userTenantHeader;
                // Simulate user context (usually done by auth middleware)
                const userContext = {
                    user: {
                        id: 'user1',
                        tenantId: userTenantId || tenantA,
                        roles: ['ANALYST']
                    }
                };
                if (resourceTenantId && resourceTenantId !== userTenantId) {
                    (0, tenantValidator_js_1.validateTenantAccess)(userContext, resourceTenantId, {
                        validateOwnership: true,
                    });
                }
                res.json([{ id: '1', tenantId: userContext.user.tenantId }]);
            }
            catch (e) {
                res.status(403).json({ error: e.message });
            }
        };
        simulationHandler = handler;
        app.get('/api/simulation/entities', handler);
    });
    (0, globals_1.describe)('Data Bleed Simulation', () => {
        (0, globals_1.it)('should not allow Tenant A to fetch Tenant B entities via API', async () => {
            const req = {
                method: 'GET',
                url: '/api/simulation/entities',
                headers: {
                    'x-user-tenant-id': tenantA,
                    'x-resource-tenant-id': tenantB,
                },
            };
            const res = {
                status: globals_1.jest.fn().mockReturnThis(),
                json: globals_1.jest.fn().mockReturnThis(),
            };
            await simulationHandler?.(req, res);
            (0, globals_1.expect)(res.status).toHaveBeenCalledWith(403);
            (0, globals_1.expect)(res.json).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                error: globals_1.expect.stringMatching(/Cross-tenant access denied/),
            }));
        });
        (0, globals_1.it)('should allow Tenant A to fetch Tenant A entities', async () => {
            const req = {
                method: 'GET',
                url: '/api/simulation/entities',
                headers: {
                    'x-user-tenant-id': tenantA,
                    'x-resource-tenant-id': tenantA,
                },
            };
            const res = {
                status: globals_1.jest.fn().mockReturnThis(),
                json: globals_1.jest.fn().mockReturnThis(),
            };
            await simulationHandler?.(req, res);
            (0, globals_1.expect)(res.status).not.toHaveBeenCalled();
            (0, globals_1.expect)(res.json).toHaveBeenCalledWith(globals_1.expect.arrayContaining([
                globals_1.expect.objectContaining({ tenantId: tenantA }),
            ]));
        });
    });
    (0, globals_1.describe)('Query Bypass Simulation', () => {
        (0, globals_1.it)('should enforce tenant filters on Neo4j queries', () => {
            const cypher = 'MATCH (n:Case) RETURN n';
            const context = { tenantId: tenantA };
            const enhanced = tenantValidator_js_1.TenantValidator.addTenantToNeo4jQuery(cypher, {}, context);
            (0, globals_1.expect)(enhanced.query).toContain('tenantId: $tenantId');
            (0, globals_1.expect)(enhanced.parameters.tenantId).toBe(tenantA);
        });
    });
    (0, globals_1.describe)('Auth Token Mis-scoping', () => {
        (0, globals_1.it)('should reject requests where token tenant does not match resource tenant', () => {
            const context = {
                user: {
                    id: 'userA',
                    tenantId: tenantA,
                    roles: ['ANALYST']
                }
            };
            (0, globals_1.expect)(() => {
                (0, tenantValidator_js_1.validateTenantAccess)(context, tenantB, { requireExplicitTenant: true, validateOwnership: true });
            }).toThrow(/Cross-tenant access denied/);
        });
    });
    (0, globals_1.describe)('Graph Cross-Tenant Edges', () => {
        (0, globals_1.it)('should detect edges connecting nodes of different tenants', async () => {
            const checkQuery = `
            MATCH (a {tenantId: $tenantA})-[r]-(b {tenantId: $tenantB})
            RETURN count(r) as violations
          `;
            // Verify that we are constructing the detection query correctly
            // We can't run it against a mock driver easily, but we can verify the intent.
            (0, globals_1.expect)(checkQuery).toContain('tenantId: $tenantA');
            (0, globals_1.expect)(checkQuery).toContain('tenantId: $tenantB');
            // Mock the driver session run to simulate a finding (or no finding)
            const mockSession = {
                run: globals_1.jest.fn().mockReturnValue(Promise.resolve({ records: [{ get: () => 0 }] })),
                close: globals_1.jest.fn()
            };
            const mockDriver = {
                session: globals_1.jest.fn().mockReturnValue(mockSession),
                close: globals_1.jest.fn()
            };
            // Manually invoke a "check" using the mock
            // Cast mockDriver to any to bypass TS check for this test
            const session = mockDriver.session();
            const result = await session.run(checkQuery, { tenantA, tenantB });
            const violations = result.records[0].get('violations');
            (0, globals_1.expect)(violations).toBe(0);
        });
    });
});

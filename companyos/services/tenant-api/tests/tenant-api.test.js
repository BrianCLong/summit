"use strict";
/**
 * CompanyOS Tenant API - Unit Tests
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
// Mock the database pool before importing app
vitest_1.vi.mock('../src/db/postgres.js', () => ({
    pool: {
        query: vitest_1.vi.fn(),
        connect: vitest_1.vi.fn().mockResolvedValue({
            query: vitest_1.vi.fn().mockResolvedValue({ rows: [{ '1': 1 }] }),
            release: vitest_1.vi.fn(),
        }),
    },
    healthCheck: vitest_1.vi.fn().mockResolvedValue(true),
    closePool: vitest_1.vi.fn().mockResolvedValue(undefined),
}));
// Import after mocking
const index_js_1 = __importStar(require("../src/index.js"));
const postgres_js_1 = require("../src/db/postgres.js");
(0, vitest_1.describe)('Tenant API', () => {
    // Wait for Apollo server to be ready before GraphQL tests
    (0, vitest_1.beforeAll)(async () => {
        await index_js_1.serverReady;
    });
    (0, vitest_1.describe)('Health Endpoints', () => {
        (0, vitest_1.it)('GET /health returns healthy status', async () => {
            const response = await (0, supertest_1.default)(index_js_1.default).get('/health');
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.body).toHaveProperty('status', 'healthy');
            (0, vitest_1.expect)(response.body).toHaveProperty('service', 'tenant-api');
        });
        (0, vitest_1.it)('GET /healthz returns ok', async () => {
            const response = await (0, supertest_1.default)(index_js_1.default).get('/healthz');
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.body).toEqual({ ok: true });
        });
        (0, vitest_1.it)('GET /health/live returns live status', async () => {
            const response = await (0, supertest_1.default)(index_js_1.default).get('/health/live');
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.body).toEqual({ live: true });
        });
        (0, vitest_1.it)('GET /health/detailed returns detailed status', async () => {
            const response = await (0, supertest_1.default)(index_js_1.default).get('/health/detailed');
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.body).toHaveProperty('status');
            (0, vitest_1.expect)(response.body).toHaveProperty('services');
            (0, vitest_1.expect)(response.body).toHaveProperty('uptime');
        });
    });
    (0, vitest_1.describe)('Metrics Endpoint', () => {
        (0, vitest_1.it)('GET /metrics returns prometheus format', async () => {
            const response = await (0, supertest_1.default)(index_js_1.default).get('/metrics');
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.headers['content-type']).toContain('text/plain');
        });
    });
    (0, vitest_1.describe)('GraphQL API', () => {
        (0, vitest_1.it)('POST /graphql handles health check query', async () => {
            const response = await (0, supertest_1.default)(index_js_1.default)
                .post('/graphql')
                .send({
                query: `
            query {
              _health {
                status
                timestamp
                version
              }
            }
          `,
            })
                .set('Content-Type', 'application/json');
            (0, vitest_1.expect)(response.status).toBe(200);
            (0, vitest_1.expect)(response.body.data._health).toHaveProperty('status');
        });
        (0, vitest_1.it)('POST /graphql handles tenant query with mock data', async () => {
            const mockTenant = {
                id: 'test-tenant-id',
                name: 'Test Tenant',
                slug: 'test-tenant',
                description: 'A test tenant',
                data_region: 'us-east-1',
                classification: 'unclassified',
                status: 'active',
                is_active: true,
                settings: {},
                created_at: new Date(),
                updated_at: new Date(),
            };
            postgres_js_1.pool.query.mockResolvedValueOnce({ rows: [mockTenant] });
            const response = await (0, supertest_1.default)(index_js_1.default)
                .post('/graphql')
                .send({
                query: `
            query GetTenant($id: ID!) {
              tenant(id: $id) {
                id
                name
                slug
                status
              }
            }
          `,
                variables: { id: 'test-tenant-id' },
            })
                .set('Content-Type', 'application/json');
            (0, vitest_1.expect)(response.status).toBe(200);
        });
        (0, vitest_1.it)('POST /graphql handles create tenant mutation', async () => {
            const mockTenant = {
                id: 'new-tenant-id',
                name: 'New Tenant',
                slug: 'new-tenant',
                description: 'A new tenant',
                data_region: 'us-east-1',
                classification: 'unclassified',
                status: 'active',
                is_active: true,
                settings: {},
                created_at: new Date(),
                updated_at: new Date(),
            };
            // Mock tenant creation
            postgres_js_1.pool.query.mockResolvedValueOnce({ rows: [mockTenant] });
            // Mock audit log creation
            postgres_js_1.pool.query.mockResolvedValueOnce({ rows: [{ id: 'audit-id' }] });
            const response = await (0, supertest_1.default)(index_js_1.default)
                .post('/graphql')
                .send({
                query: `
            mutation CreateTenant($input: CreateTenantInput!) {
              createTenant(input: $input) {
                id
                name
                slug
              }
            }
          `,
                variables: {
                    input: {
                        name: 'New Tenant',
                        slug: 'new-tenant',
                    },
                },
            })
                .set('Content-Type', 'application/json');
            (0, vitest_1.expect)(response.status).toBe(200);
        });
    });
});
(0, vitest_1.describe)('Auth Context', () => {
    (0, vitest_1.it)('stub identity middleware adds dev user in non-production', async () => {
        const response = await (0, supertest_1.default)(index_js_1.default)
            .get('/health/detailed')
            .set('Authorization', 'Bearer test-token')
            .set('x-user-id', 'test-user')
            .set('x-user-email', 'test@example.com');
        (0, vitest_1.expect)(response.status).toBe(200);
    });
});

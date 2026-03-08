"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
// Mock middleware to bypass OPA and avoid external calls
// We use x-mock-user-roles to populate req.user for testing priority
vitest_1.vi.mock('../middleware/policyGuard', () => ({
    policyGuard: (req, res, next) => {
        const mockUserRoles = req.headers['x-mock-user-roles'];
        if (mockUserRoles) {
            req.user = { roles: mockUserRoles.split(',') };
        }
        next();
    },
}));
// Mock typesense client to avoid connection errors
vitest_1.vi.mock('../lib/typesense', () => ({
    typesenseClient: {
        collections: () => ({
            documents: () => ({
                search: vitest_1.vi.fn().mockResolvedValue({ hits: [] }),
            }),
        }),
    },
}));
const server_1 = __importDefault(require("../server"));
(0, vitest_1.describe)('Search Routes Security', () => {
    (0, vitest_1.it)('should block unauthorized access (no roles)', async () => {
        const res = await (0, supertest_1.default)(server_1.default)
            .post('/v1/search/admin/reindex')
            .send({});
        (0, vitest_1.expect)(res.status).toBe(403);
    });
    (0, vitest_1.it)('should block unauthorized access (header provided but req.user missing)', async () => {
        // This confirms we are ignoring headers now
        const res = await (0, supertest_1.default)(server_1.default)
            .post('/v1/search/admin/reindex')
            .set('x-roles', 'admin')
            .send({});
        (0, vitest_1.expect)(res.status).toBe(403);
        (0, vitest_1.expect)(res.body.error).toContain('Forbidden');
    });
    (0, vitest_1.it)('should allow authorized access (req.user has admin)', async () => {
        const res = await (0, supertest_1.default)(server_1.default)
            .post('/v1/search/admin/reindex')
            .set('x-mock-user-roles', 'admin') // Populates req.user.roles
            .send({});
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.status).toBe('triggered');
    });
    (0, vitest_1.it)('should block access if req.user has wrong role (non-admin)', async () => {
        const res = await (0, supertest_1.default)(server_1.default)
            .post('/v1/search/admin/reindex')
            .set('x-mock-user-roles', 'user')
            .send({});
        (0, vitest_1.expect)(res.status).toBe(403);
    });
});

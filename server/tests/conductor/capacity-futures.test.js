"use strict";
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
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
let mockReservations = [];
const runNetwork = process.env.NO_NETWORK_LISTEN !== 'true';
const describeNetwork = runNetwork ? globals_1.describe : globals_1.describe.skip;
const mockQuery = globals_1.jest.fn();
const setupMockQuery = () => {
    mockQuery.mockImplementation(async (sql, params = []) => {
        const text = typeof sql === 'string' ? sql : sql?.text || '';
        if (text.includes("SET status = 'expired'")) {
            const cutoff = params[0] ? new Date(params[0]) : new Date();
            let count = 0;
            mockReservations = mockReservations.map((r) => {
                if (r.status === 'active' && new Date(r.end_at) < cutoff) {
                    count += 1;
                    return { ...r, status: 'expired' };
                }
                return r;
            });
            return { rowCount: count, rows: [] };
        }
        if (text.includes('INSERT INTO capacity_reservations')) {
            const [tenantId, poolId, computeUnits, startAt, endAt] = params;
            const reservation = {
                reservation_id: `res-${mockReservations.length + 1}`,
                tenant_id: tenantId,
                pool_id: poolId,
                compute_units: computeUnits,
                start_at: startAt,
                end_at: endAt,
                status: 'active',
            };
            mockReservations.push(reservation);
            return { rows: [reservation], rowCount: 1 };
        }
        if (text.includes("SET status = 'released'")) {
            const [reservationId, tenantId] = params;
            let count = 0;
            mockReservations = mockReservations.map((r) => {
                if (r.reservation_id === reservationId &&
                    r.status === 'active' &&
                    (r.tenant_id === tenantId || r.tenant_id === null)) {
                    count += 1;
                    return { ...r, status: 'released' };
                }
                return r;
            });
            return { rowCount: count, rows: [] };
        }
        if (text.includes('SELECT reservation_id') && text.includes('start_at <= $1')) {
            const now = new Date(params[0]);
            const tenantId = params[1];
            const rows = mockReservations.filter((r) => r.status === 'active' &&
                new Date(r.start_at) <= now &&
                new Date(r.end_at) >= now &&
                (r.tenant_id === tenantId || r.tenant_id === null) &&
                Number(r.compute_units) > 0);
            return { rows, rowCount: rows.length };
        }
        if (text.includes('SELECT reservation_id') && text.includes('tenant_id = $1')) {
            const tenantId = params[0];
            const includeExpired = !text.includes("status != 'expired'");
            const rows = mockReservations.filter((r) => (r.tenant_id === tenantId || r.tenant_id === null) &&
                (includeExpired || r.status !== 'expired'));
            return { rows, rowCount: rows.length };
        }
        if (text.includes('SELECT count(1) as count FROM capacity_reservations')) {
            const activeCount = mockReservations.filter((r) => r.status === 'active' && new Date(r.end_at) >= new Date()).length;
            return { rows: [{ count: activeCount }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
    });
};
globals_1.jest.unstable_mockModule('pg', () => {
    const poolInstance = {
        query: (sql, params) => mockQuery(sql, params),
        connect: globals_1.jest.fn(),
        end: globals_1.jest.fn(),
        on: globals_1.jest.fn(),
        removeListener: globals_1.jest.fn(),
    };
    const Pool = globals_1.jest.fn(() => poolInstance);
    const Client = globals_1.jest.fn(() => poolInstance);
    return {
        __esModule: true,
        Pool,
        Client,
        types: { setTypeParser: globals_1.jest.fn() },
        __mockQuery: mockQuery,
        __setReservations: (rows) => {
            mockReservations = rows;
        },
        __getReservations: () => mockReservations,
    };
});
let mockPools = [
    { id: 'pool-1', region: 'us-east', labels: [], capacity: 10 },
    { id: 'pool-2', region: 'us-east', labels: [], capacity: 10 },
];
let mockPricing = {
    'pool-1': {
        pool_id: 'pool-1',
        cpu_sec_usd: 0.0005,
        gb_sec_usd: 0,
        egress_gb_usd: 0,
    },
    'pool-2': {
        pool_id: 'pool-2',
        cpu_sec_usd: 0.0006,
        gb_sec_usd: 0,
        egress_gb_usd: 0,
    },
};
globals_1.jest.unstable_mockModule('../../src/conductor/scheduling/pools.js', () => {
    const safeNum = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    };
    const safeEst = (value) => {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0)
            return 0;
        return n;
    };
    const pickCheapestEligible = (candidates, costs, est, residency) => {
        let best = null;
        for (const p of candidates) {
            if (residency &&
                !p.region.toLowerCase().startsWith(residency.toLowerCase())) {
                continue;
            }
            const c = costs[p.id];
            if (!c)
                continue;
            const cpuSec = safeEst(est.cpuSec);
            const gbSec = safeEst(est.gbSec);
            const egressGb = safeEst(est.egressGb);
            const cpuUsd = safeNum(c.cpu_sec_usd);
            const gbUsd = safeNum(c.gb_sec_usd);
            const egressUsd = safeNum(c.egress_gb_usd);
            const price = cpuSec * cpuUsd + gbSec * gbUsd + egressGb * egressUsd;
            if (!best ||
                price < best.price ||
                (price === best.price && p.id.localeCompare(best.id) < 0)) {
                best = { id: p.id, price };
            }
        }
        return best;
    };
    const estimatePoolPrice = (cost, est, discount = 1) => {
        if (!cost)
            return 0;
        const cpuSec = safeEst(est.cpuSec);
        const gbSec = safeEst(est.gbSec);
        const egressGb = safeEst(est.egressGb);
        const cpuUsd = safeNum(cost.cpu_sec_usd);
        const gbUsd = safeNum(cost.gb_sec_usd);
        const egressUsd = safeNum(cost.egress_gb_usd);
        return (cpuSec * cpuUsd + gbSec * gbUsd + egressGb * egressUsd) * discount;
    };
    const currentPricing = globals_1.jest.fn(async () => mockPricing);
    const listPools = globals_1.jest.fn(async () => mockPools);
    return {
        __esModule: true,
        currentPricing,
        listPools,
        pickCheapestEligible,
        estimatePoolPrice,
        __setPricing: (next) => {
            mockPricing = next;
        },
        __setPools: (next) => {
            mockPools = next;
        },
    };
});
(0, globals_1.describe)('capacity futures persistence', () => {
    let pgMock;
    let poolsMock;
    (0, globals_1.beforeEach)(async () => {
        globals_1.jest.clearAllMocks();
        setupMockQuery();
        pgMock = await Promise.resolve().then(() => __importStar(require('pg')));
        poolsMock = await Promise.resolve().then(() => __importStar(require('../../src/conductor/scheduling/pools.js')));
        pgMock.__setReservations([]);
        poolsMock.currentPricing.mockResolvedValue(mockPricing);
        poolsMock.listPools.mockResolvedValue(mockPools);
        poolsMock.__setPools([
            { id: 'pool-1', region: 'us-east', labels: [], capacity: 10 },
            { id: 'pool-2', region: 'us-east', labels: [], capacity: 10 },
        ]);
        poolsMock.__setPricing({
            'pool-1': {
                pool_id: 'pool-1',
                cpu_sec_usd: 0.0005,
                gb_sec_usd: 0,
                egress_gb_usd: 0,
            },
            'pool-2': {
                pool_id: 'pool-2',
                cpu_sec_usd: 0.0006,
                gb_sec_usd: 0,
                egress_gb_usd: 0,
            },
        });
    });
    (0, globals_1.it)('creates, lists, and releases reservations for a tenant', async () => {
        const { reserveCapacity, listReservations, releaseReservation, } = await Promise.resolve().then(() => __importStar(require('../../src/conductor/scheduling/capacity-futures.js')));
        const created = await reserveCapacity({
            poolId: 'pool-1',
            computeUnits: 5,
            durationHours: 2,
            tenantId: 'tenant-a',
        });
        (0, globals_1.expect)(created.reservationId).toBe('res-1');
        const reservations = await listReservations('tenant-a');
        (0, globals_1.expect)(reservations).toHaveLength(1);
        (0, globals_1.expect)(reservations[0].poolId).toBe('pool-1');
        (0, globals_1.expect)(reservations[0].status).toBe('active');
        const released = await releaseReservation(created.reservationId, 'tenant-a');
        (0, globals_1.expect)(released).toBe(true);
    });
});
(0, globals_1.describe)('capacity-aware selector', () => {
    let poolsMock;
    let pgMock;
    (0, globals_1.beforeEach)(async () => {
        globals_1.jest.clearAllMocks();
        setupMockQuery();
        poolsMock = await Promise.resolve().then(() => __importStar(require('../../src/conductor/scheduling/pools.js')));
        pgMock = await Promise.resolve().then(() => __importStar(require('pg')));
        poolsMock.currentPricing.mockResolvedValue(mockPricing);
        poolsMock.listPools.mockResolvedValue(mockPools);
        poolsMock.__setPools([
            { id: 'pool-1', region: 'us-east', labels: [], capacity: 10 },
            { id: 'pool-2', region: 'us-east', labels: [], capacity: 10 },
        ]);
        poolsMock.__setPricing({
            'pool-1': {
                pool_id: 'pool-1',
                cpu_sec_usd: 0.0005,
                gb_sec_usd: 0,
                egress_gb_usd: 0,
            },
            'pool-2': {
                pool_id: 'pool-2',
                cpu_sec_usd: 0.0006,
                gb_sec_usd: 0,
                egress_gb_usd: 0,
            },
        });
        pgMock.__setReservations([]);
    });
    (0, globals_1.it)('selects the cheapest eligible pool', async () => {
        const now = new Date();
        pgMock.__setReservations([
            {
                reservation_id: 'res-1',
                tenant_id: 'tenant-a',
                pool_id: 'pool-2',
                compute_units: 10,
                start_at: new Date(now.getTime() - 1000),
                end_at: new Date(now.getTime() + 60 * 60 * 1000),
                status: 'active',
            },
        ]);
        const { choosePool } = await Promise.resolve().then(() => __importStar(require('../../src/conductor/scheduling/selector.js')));
        const choice = await choosePool({ cpuSec: 100 }, undefined, 'tenant-a');
        (0, globals_1.expect)(choice?.id).toBe('pool-1');
    });
    (0, globals_1.it)('falls back to cheapest eligible when reservation expired', async () => {
        const now = new Date();
        pgMock.__setReservations([
            {
                reservation_id: 'res-2',
                tenant_id: 'tenant-a',
                pool_id: 'pool-2',
                compute_units: 10,
                start_at: new Date(now.getTime() - 2 * 60 * 60 * 1000),
                end_at: new Date(now.getTime() - 60 * 60 * 1000),
                status: 'active',
            },
        ]);
        const { choosePool } = await Promise.resolve().then(() => __importStar(require('../../src/conductor/scheduling/selector.js')));
        const choice = await choosePool({ cpuSec: 100 }, undefined, 'tenant-b');
        (0, globals_1.expect)(choice?.id).toBe('pool-1');
    });
});
describeNetwork('capacity routes auth', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.it)('rejects unauthenticated reserve requests', async () => {
        const { capacityRoutes } = await Promise.resolve().then(() => __importStar(require('../../src/conductor/api/capacity-routes.js')));
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/capacity', capacityRoutes);
        const res = await (0, supertest_1.default)(app)
            .post('/capacity/reserve')
            .send({ poolId: 'pool-1', computeUnits: 1, durationHours: 1 });
        (0, globals_1.expect)(res.status).toBe(401);
    });
    (0, globals_1.it)('allows authorized tenants to reserve capacity', async () => {
        const { capacityRoutes } = await Promise.resolve().then(() => __importStar(require('../../src/conductor/api/capacity-routes.js')));
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use((req, _res, next) => {
            req.user = {
                userId: 'tester',
                sub: 'tester',
                email: 'tester@example.com',
                roles: ['admin'],
                tenantId: 'tenant-a',
            };
            next();
        });
        app.use('/capacity', capacityRoutes);
        const res = await (0, supertest_1.default)(app)
            .post('/capacity/reserve')
            .send({ poolId: 'pool-1', computeUnits: 1, durationHours: 1 });
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body.reservationId).toBeDefined();
    });
});

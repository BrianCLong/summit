import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';

let mockReservations: any[] = [];
const runNetwork = process.env.NO_NETWORK_LISTEN !== 'true';
const describeNetwork = runNetwork ? describe : describe.skip;

const mockQuery = jest.fn();

const setupMockQuery = () => {
  mockQuery.mockImplementation(async (sql: any, params: any[] = []) => {
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
        if (
          r.reservation_id === reservationId &&
          r.status === 'active' &&
          (r.tenant_id === tenantId || r.tenant_id === null)
        ) {
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
      const rows = mockReservations.filter(
        (r) =>
          r.status === 'active' &&
          new Date(r.start_at) <= now &&
          new Date(r.end_at) >= now &&
          (r.tenant_id === tenantId || r.tenant_id === null) &&
          Number(r.compute_units) > 0,
      );
      return { rows, rowCount: rows.length };
    }

    if (text.includes('SELECT reservation_id') && text.includes('tenant_id = $1')) {
      const tenantId = params[0];
      const includeExpired = !text.includes("status != 'expired'");
      const rows = mockReservations.filter(
        (r) =>
          (r.tenant_id === tenantId || r.tenant_id === null) &&
          (includeExpired || r.status !== 'expired'),
      );
      return { rows, rowCount: rows.length };
    }

    if (text.includes('SELECT count(1) as count FROM capacity_reservations')) {
      const activeCount = mockReservations.filter(
        (r) => r.status === 'active' && new Date(r.end_at) >= new Date(),
      ).length;
      return { rows: [{ count: activeCount }], rowCount: 1 };
    }

    return { rows: [], rowCount: 0 };
  });
};

jest.unstable_mockModule('pg', () => {
  const poolInstance = {
    query: (sql: any, params?: any[]) => mockQuery(sql, params),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
  };
  const Pool = jest.fn(() => poolInstance);
  const Client = jest.fn(() => poolInstance);
  return {
    __esModule: true,
    Pool,
    Client,
    types: { setTypeParser: jest.fn() },
    __mockQuery: mockQuery,
    __setReservations: (rows: any[]) => {
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

jest.unstable_mockModule('../../src/conductor/scheduling/pools.js', () => {
  const safeNum = (value: unknown) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  const safeEst = (value: unknown) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n;
  };

  const pickCheapestEligible = (
    candidates: any[],
    costs: Record<string, any>,
    est: { cpuSec?: number; gbSec?: number; egressGb?: number },
    residency?: string,
  ) => {
    let best: { id: string; price: number } | null = null;
    for (const p of candidates) {
      if (
        residency &&
        !p.region.toLowerCase().startsWith(residency.toLowerCase())
      ) {
        continue;
      }
      const c = costs[p.id];
      if (!c) continue;

      const cpuSec = safeEst(est.cpuSec);
      const gbSec = safeEst(est.gbSec);
      const egressGb = safeEst(est.egressGb);

      const cpuUsd = safeNum(c.cpu_sec_usd);
      const gbUsd = safeNum(c.gb_sec_usd);
      const egressUsd = safeNum(c.egress_gb_usd);

      const price = cpuSec * cpuUsd + gbSec * gbUsd + egressGb * egressUsd;

      if (
        !best ||
        price < best.price ||
        (price === best.price && p.id.localeCompare(best.id) < 0)
      ) {
        best = { id: p.id, price };
      }
    }
    return best;
  };

  const estimatePoolPrice = (
    cost: any,
    est: { cpuSec?: number; gbSec?: number; egressGb?: number },
    discount = 1,
  ) => {
    if (!cost) return 0;
    const cpuSec = safeEst(est.cpuSec);
    const gbSec = safeEst(est.gbSec);
    const egressGb = safeEst(est.egressGb);
    const cpuUsd = safeNum(cost.cpu_sec_usd);
    const gbUsd = safeNum(cost.gb_sec_usd);
    const egressUsd = safeNum(cost.egress_gb_usd);
    return (cpuSec * cpuUsd + gbSec * gbUsd + egressGb * egressUsd) * discount;
  };

  const currentPricing = jest.fn(async () => mockPricing);
  const listPools = jest.fn(async () => mockPools);
  return {
    __esModule: true,
    currentPricing,
    listPools,
    pickCheapestEligible,
    estimatePoolPrice,
    __setPricing: (next: any) => {
      mockPricing = next;
    },
    __setPools: (next: any) => {
      mockPools = next;
    },
  };
});

describe('capacity futures persistence', () => {
  let pgMock: any;
  let poolsMock: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    setupMockQuery();
    pgMock = await import('pg');
    poolsMock = await import('../../src/conductor/scheduling/pools.js');
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

  it('creates, lists, and releases reservations for a tenant', async () => {
    const {
      reserveCapacity,
      listReservations,
      releaseReservation,
    } = await import('../../src/conductor/scheduling/capacity-futures.js');

    const created = await reserveCapacity({
      poolId: 'pool-1',
      computeUnits: 5,
      durationHours: 2,
      tenantId: 'tenant-a',
    });

    expect(created.reservationId).toBe('res-1');

    const reservations = await listReservations('tenant-a');
    expect(reservations).toHaveLength(1);
    expect(reservations[0].poolId).toBe('pool-1');
    expect(reservations[0].status).toBe('active');

    const released = await releaseReservation(created.reservationId, 'tenant-a');
    expect(released).toBe(true);
  });
});

describe('capacity-aware selector', () => {
  let poolsMock: any;
  let pgMock: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    setupMockQuery();
    poolsMock = await import('../../src/conductor/scheduling/pools.js');
    pgMock = await import('pg');
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

  it('selects the cheapest eligible pool', async () => {
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
    const { choosePool } = await import('../../src/conductor/scheduling/selector.js');

    const choice = await choosePool({ cpuSec: 100 }, undefined, 'tenant-a');
    expect(choice?.id).toBe('pool-1');
  });

  it('falls back to cheapest eligible when reservation expired', async () => {
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
    const { choosePool } = await import('../../src/conductor/scheduling/selector.js');

    const choice = await choosePool({ cpuSec: 100 }, undefined, 'tenant-b');
    expect(choice?.id).toBe('pool-1');
  });
});

describeNetwork('capacity routes auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthenticated reserve requests', async () => {
    const { capacityRoutes } = await import(
      '../../src/conductor/api/capacity-routes.js'
    );
    const app = express();
    app.use(express.json());
    app.use('/capacity', capacityRoutes);

    const res = await request(app)
      .post('/capacity/reserve')
      .send({ poolId: 'pool-1', computeUnits: 1, durationHours: 1 });
    expect(res.status).toBe(401);
  });

  it('allows authorized tenants to reserve capacity', async () => {
    const { capacityRoutes } = await import(
      '../../src/conductor/api/capacity-routes.js'
    );
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as any).user = {
        userId: 'tester',
        sub: 'tester',
        email: 'tester@example.com',
        roles: ['admin'],
        tenantId: 'tenant-a',
      };
      next();
    });
    app.use('/capacity', capacityRoutes);

    const res = await request(app)
      .post('/capacity/reserve')
      .send({ poolId: 'pool-1', computeUnits: 1, durationHours: 1 });
    expect(res.status).toBe(200);
    expect(res.body.reservationId).toBeDefined();
  });
});

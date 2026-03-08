import { FinopsReportService, CostAttributionRepository } from '../../server/src/services/finops/FinopsReportService.js';
import { MeterEventKind, TenantUsageDailyRow } from '../../server/src/metering/schema.js';

class StubMeteringSource {
  constructor(private rows: TenantUsageDailyRow[]) {}
  async list() {
    return this.rows;
  }
}

class StubPricingEngine {
  constructor(private limits: Record<string, any>, private currency = 'USD') {}
  async getEffectivePlan() {
    return {
      plan: {
        currency: this.currency,
        limits: this.limits,
      },
      overrides: null,
    };
  }
}

describe('FinOps billing contract', () => {
  const baseRows: TenantUsageDailyRow[] = [
    {
      tenantId: 'tenant-1',
      date: '2024-01-01',
      ingestUnits: 150,
      queryCredits: 80,
      storageBytesEstimate: 1_000_000,
      activeSeats: 3,
      correlationIds: ['a', 'b'],
      lastEventAt: '2024-01-01T12:00:00Z',
    },
    {
      tenantId: 'tenant-1',
      date: '2024-01-02',
      ingestUnits: 50,
      queryCredits: 20,
      storageBytesEstimate: 0,
      activeSeats: 1,
      correlationIds: ['b', 'c'],
      lastEventAt: '2024-01-02T12:00:00Z',
    },
  ];

  it('builds invoice-ready report with coverage metrics and CSV export', async () => {
    const metering = new StubMeteringSource(baseRows);
    const attribution = new CostAttributionRepository();
    await attribution.record([
      {
        tenantId: 'tenant-1',
        capability: 'revops',
        resourceType: 'compute',
        amount: 10,
        currency: 'USD',
        periodStart: '2024-01-01T00:00:00Z',
        periodEnd: '2024-01-31T23:59:59Z',
        source: 'unit-test',
      },
      {
        tenantId: 'tenant-1',
        capability: 'core',
        resourceType: 'storage',
        amount: 2,
        currency: 'USD',
        periodStart: '2024-01-01T00:00:00Z',
        periodEnd: '2024-01-31T23:59:59Z',
        source: 'unit-test',
      },
    ]);

    const pricing = new StubPricingEngine({
      'ingestion.records': { monthlyIncluded: 100, unitPrice: 0.001 },
      'graph.queries': { unitPrice: 0.005 },
    });

    const service = new FinopsReportService({
      meteringSource: metering as any,
      attributionSource: attribution,
      pricingEngine: pricing as any,
    });

    const report = await service.buildReport('tenant-1', '2024-01-01', '2024-01-31');

    expect(report.tenantId).toBe('tenant-1');
    expect(report.usage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          usageKind: 'ingestion.records',
          billableQuantity: 100,
          unitPrice: 0.001,
        }),
        expect.objectContaining({
          usageKind: 'graph.queries',
          billableQuantity: 100,
          unitPrice: 0.005,
        }),
        expect.objectContaining({
          meterId: MeterEventKind.USER_SEAT_ACTIVE,
          usageKind: 'revops.active_seats',
        }),
      ]),
    );

    expect(report.coverage.meteringDays).toBe(2);
    expect(report.coverage.attributionRows).toBe(2);
    expect(report.coverage.correlatedEvents).toBe(4);

    expect(report.attribution.total).toBe(12);
    expect(report.totals.usageSubtotal).toBeCloseTo(60.81, 2);
    expect(report.totals.grossMargin).toBeCloseTo(report.totals.usageSubtotal - 12, 2);
    expect(report.totals.grossMarginPercent).toBeGreaterThan(0);

    const csv = service.toCsv(report);
    expect(csv).toContain('meterId,usageKind,quantity,unitPrice,amount,correlationIds');
    expect(csv).toContain('cogs:revops:compute');
    expect(csv).toContain('usageSubtotal');
  });

  it('falls back to default pricing and currency when limits missing', async () => {
    const metering = new StubMeteringSource([
      {
        tenantId: 'tenant-2',
        date: '2024-02-01',
        ingestUnits: 0,
        queryCredits: 0,
        storageBytesEstimate: 2_000_000,
        activeSeats: 0,
        correlationIds: [],
        lastEventAt: '2024-02-01T12:00:00Z',
      },
    ]);

    const pricing = new StubPricingEngine({});
    const service = new FinopsReportService({
      meteringSource: metering as any,
      attributionSource: new CostAttributionRepository(),
      pricingEngine: pricing as any,
    });

    const report = await service.buildReport('tenant-2', '2024-02-01', '2024-02-28');
    const storageLine = report.usage.find((line) => line.usageKind === 'storage.bytes');

    expect(report.currency).toBe('USD');
    expect(storageLine?.unitPrice).toBeGreaterThan(0);
    expect(storageLine?.amount).toBeGreaterThan(0);
  });
});

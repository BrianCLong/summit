import { TenantUsageDailyRow, MeterEventKind } from '../../metering/schema.js';
import { tenantUsageDailyRepository } from '../../metering/repository.js';
import PricingEngine from '../PricingEngine.js';

export interface CostAttributionRow {
  tenantId: string;
  capability: string;
  resourceType: string;
  amount: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  source: string;
}

export interface InvoiceUsageLine {
  meterId: string;
  usageKind: string;
  quantity: number;
  included: number;
  billableQuantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  correlationIds: string[];
}

export interface FinopsReport {
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  generatedAt: string;
  usage: InvoiceUsageLine[];
  attribution: {
    total: number;
    rows: CostAttributionRow[];
    breakdown: {
      capability: string;
      resourceType: string;
      amount: number;
    }[];
  };
  totals: {
    usageSubtotal: number;
    taxes: number;
    total: number;
    grossMargin: number;
    grossMarginPercent: number;
  };
  coverage: {
    meteringDays: number;
    meteringMeters: number;
    attributionRows: number;
    correlatedEvents: number;
  };
}

export interface CostAttributionSource {
  list(
    tenantId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<CostAttributionRow[]>;
  record?(rows: CostAttributionRow[]): Promise<void>;
  clear?(): void;
}

export interface MeteringSource {
  list(): Promise<TenantUsageDailyRow[]>;
}

type PricingEngineLike = {
  getEffectivePlan(tenantId: string): Promise<{
    plan: { currency: string; limits: Record<string, any> };
    overrides: Record<string, unknown> | null;
  }>;
};

const DEFAULT_RATES: Record<string, { unitPrice: number; monthlyIncluded?: number; unit: string }> = {
  'ingestion.records': { unitPrice: 0.0004, monthlyIncluded: 0, unit: 'records' },
  'graph.queries': { unitPrice: 0.0008, monthlyIncluded: 0, unit: 'credits' },
  'storage.bytes': { unitPrice: 0.00000021, monthlyIncluded: 0, unit: 'bytes' },
  'revops.active_seats': { unitPrice: 15, monthlyIncluded: 0, unit: 'seats' },
};

export class CostAttributionRepository implements CostAttributionSource {
  private rows: CostAttributionRow[] = [];

  async record(rows: CostAttributionRow[]): Promise<void> {
    this.rows.push(...rows);
  }

  async list(
    tenantId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<CostAttributionRow[]> {
    const start = new Date(periodStart).getTime();
    const end = new Date(periodEnd).getTime();
    return this.rows.filter((row: any) => {
      if (row.tenantId !== tenantId) return false;
      const rowStart = new Date(row.periodStart).getTime();
      const rowEnd = new Date(row.periodEnd).getTime();
      return rowStart <= end && rowEnd >= start;
    });
  }

  clear(): void {
    this.rows = [];
  }
}

export class FinopsReportService {
  private meteringSource: MeteringSource;
  private attributionSource: CostAttributionSource;
  private pricingEngine: PricingEngineLike;
  private defaultCurrency = 'USD';

  constructor(options: {
    meteringSource?: MeteringSource;
    attributionSource?: CostAttributionSource;
    pricingEngine?: PricingEngineLike;
  } = {}) {
    this.meteringSource = options.meteringSource || tenantUsageDailyRepository;
    this.attributionSource =
      options.attributionSource || new CostAttributionRepository();
    this.pricingEngine = options.pricingEngine || PricingEngine;
  }

  async buildReport(
    tenantId: string,
    periodStart?: string,
    periodEnd?: string,
  ): Promise<FinopsReport> {
    const start = periodStart ? new Date(periodStart) : this.startOfMonth();
    const end = periodEnd ? new Date(periodEnd) : new Date();

    const usageRows = await this.meteringSource.list();
    const tenantRows = usageRows.filter((row: any) => this.isWithinRange(row, tenantId, start, end));

    const meterLines = this.rollupMeters(tenantRows);
    const { currency, ratedLines } = await this.applyPricing(tenantId, meterLines);

    const usageSubtotal = ratedLines.reduce((sum, line) => sum + line.amount, 0);
    const attributionRows = await this.attributionSource.list(
      tenantId,
      start.toISOString(),
      end.toISOString(),
    );
    const attributionBreakdown = this.buildAttributionBreakdown(attributionRows);
    const attributionTotal = attributionBreakdown.reduce((sum, row) => sum + row.amount, 0);

    const grossMargin = usageSubtotal - attributionTotal;
    const grossMarginPercent = usageSubtotal === 0 ? 0 : (grossMargin / usageSubtotal) * 100;

    return {
      tenantId,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      currency: currency || this.defaultCurrency,
      generatedAt: new Date().toISOString(),
      usage: ratedLines,
      attribution: {
        total: attributionTotal,
        rows: attributionRows,
        breakdown: attributionBreakdown,
      },
      totals: {
        usageSubtotal,
        taxes: 0,
        total: usageSubtotal,
        grossMargin,
        grossMarginPercent,
      },
      coverage: {
        meteringDays: new Set(tenantRows.map((row: any) => row.date)).size,
        meteringMeters: ratedLines.length,
        attributionRows: attributionRows.length,
        correlatedEvents: tenantRows.reduce(
          (sum, row) => sum + (row.correlationIds ? row.correlationIds.length : 0),
          0,
        ),
      },
    };
  }

  toCsv(report: FinopsReport): string {
    const header = ['meterId', 'usageKind', 'quantity', 'unitPrice', 'amount', 'correlationIds'];
    const usageLines = report.usage.map((line) =>
      [
        line.meterId,
        line.usageKind,
        line.billableQuantity.toFixed(4),
        line.unitPrice.toFixed(6),
        line.amount.toFixed(2),
        line.correlationIds.join('|'),
      ].join(','),
    );

    const attributionLines = report.attribution.breakdown.map((row: any) =>
      [`cogs:${row.capability}:${row.resourceType}`, '', '', '', row.amount.toFixed(2), ''].join(','),
    );

    const totals = [
      ['usageSubtotal', '', '', '', report.totals.usageSubtotal.toFixed(2), ''].join(','),
      ['cogsTotal', '', '', '', report.attribution.total.toFixed(2), ''].join(','),
      ['grossMargin', '', '', '', report.totals.grossMargin.toFixed(2), ''].join(','),
    ];

    return [header.join(','), ...usageLines, ...attributionLines, ...totals].join('\n');
  }

  private rollupMeters(rows: TenantUsageDailyRow[]): InvoiceUsageLine[] {
    const meterTotals = new Map<string, InvoiceUsageLine>();

    for (const row of rows) {
      const base = {
        correlationIds: row.correlationIds || [],
        included: 0,
        billableQuantity: 0,
      } as InvoiceUsageLine;

      const mappings = [
        {
          meterId: MeterEventKind.INGEST_UNITS,
          usageKind: 'ingestion.records',
          quantity: row.ingestUnits,
          unit: 'records',
        },
        {
          meterId: MeterEventKind.QUERY_CREDITS,
          usageKind: 'graph.queries',
          quantity: row.queryCredits,
          unit: 'credits',
        },
        {
          meterId: MeterEventKind.STORAGE_BYTES_ESTIMATE,
          usageKind: 'storage.bytes',
          quantity: row.storageBytesEstimate,
          unit: 'bytes',
        },
        {
          meterId: MeterEventKind.USER_SEAT_ACTIVE,
          usageKind: 'revops.active_seats',
          quantity: row.activeSeats,
          unit: 'seats',
        },
      ];

      for (const mapping of mappings) {
        const key = mapping.meterId;
        const existing = meterTotals.get(key);
        if (existing) {
          existing.quantity += mapping.quantity;
          existing.correlationIds = Array.from(
            new Set([...existing.correlationIds, ...base.correlationIds]),
          );
          meterTotals.set(key, existing);
        } else {
          meterTotals.set(key, {
            ...base,
            meterId: mapping.meterId,
            usageKind: mapping.usageKind,
            quantity: mapping.quantity,
            unit: mapping.unit,
            unitPrice: 0,
            amount: 0,
            billableQuantity: 0,
          });
        }
      }
    }

    return Array.from(meterTotals.values());
  }

  private async applyPricing(
    tenantId: string,
    lines: InvoiceUsageLine[],
  ): Promise<{ ratedLines: InvoiceUsageLine[]; currency: string }> {
    const { plan } = await this.pricingEngine.getEffectivePlan(tenantId);

    const ratedLines = lines.map((line) => {
      const planLimits = plan?.limits?.[line.usageKind];
      const defaults = DEFAULT_RATES[line.usageKind];

      const included = planLimits?.monthlyIncluded ?? defaults?.monthlyIncluded ?? 0;
      const unitPrice = planLimits?.unitPrice ?? defaults?.unitPrice ?? 0;
      const billableQuantity = Math.max(0, line.quantity - included);
      const amount = billableQuantity * unitPrice;

      return {
        ...line,
        included,
        unitPrice,
        billableQuantity,
        amount,
      };
    });

    return { ratedLines, currency: plan?.currency || this.defaultCurrency };
  }

  private buildAttributionBreakdown(rows: CostAttributionRow[]) {
    const byKey = new Map<string, { capability: string; resourceType: string; amount: number }>();
    for (const row of rows) {
      const key = `${row.capability}:${row.resourceType}`;
      const current = byKey.get(key) || {
        capability: row.capability,
        resourceType: row.resourceType,
        amount: 0,
      };
      current.amount += row.amount;
      byKey.set(key, current);
    }
    return Array.from(byKey.values());
  }

  private isWithinRange(
    row: TenantUsageDailyRow,
    tenantId: string,
    start: Date,
    end: Date,
  ): boolean {
    if (row.tenantId !== tenantId) return false;
    const date = new Date(`${row.date}T00:00:00Z`);
    return date >= start && date <= end;
  }

  private startOfMonth(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
}

export const costAttributionRepository = new CostAttributionRepository();
export const finopsReportService = new FinopsReportService({
  attributionSource: costAttributionRepository,
});

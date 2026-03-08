"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.finopsReportService = exports.costAttributionRepository = exports.FinopsReportService = exports.CostAttributionRepository = void 0;
const schema_js_1 = require("../../metering/schema.js");
const repository_js_1 = require("../../metering/repository.js");
const PricingEngine_js_1 = __importDefault(require("../PricingEngine.js"));
const DEFAULT_RATES = {
    'ingestion.records': { unitPrice: 0.0004, monthlyIncluded: 0, unit: 'records' },
    'graph.queries': { unitPrice: 0.0008, monthlyIncluded: 0, unit: 'credits' },
    'storage.bytes': { unitPrice: 0.00000021, monthlyIncluded: 0, unit: 'bytes' },
    'revops.active_seats': { unitPrice: 15, monthlyIncluded: 0, unit: 'seats' },
};
class CostAttributionRepository {
    rows = [];
    async record(rows) {
        this.rows.push(...rows);
    }
    async list(tenantId, periodStart, periodEnd) {
        const start = new Date(periodStart).getTime();
        const end = new Date(periodEnd).getTime();
        return this.rows.filter((row) => {
            if (row.tenantId !== tenantId)
                return false;
            const rowStart = new Date(row.periodStart).getTime();
            const rowEnd = new Date(row.periodEnd).getTime();
            return rowStart <= end && rowEnd >= start;
        });
    }
    clear() {
        this.rows = [];
    }
}
exports.CostAttributionRepository = CostAttributionRepository;
class FinopsReportService {
    meteringSource;
    attributionSource;
    pricingEngine;
    defaultCurrency = 'USD';
    constructor(options = {}) {
        this.meteringSource = options.meteringSource || repository_js_1.tenantUsageDailyRepository;
        this.attributionSource =
            options.attributionSource || new CostAttributionRepository();
        this.pricingEngine = options.pricingEngine || PricingEngine_js_1.default;
    }
    async buildReport(tenantId, periodStart, periodEnd) {
        const start = periodStart ? new Date(periodStart) : this.startOfMonth();
        const end = periodEnd ? new Date(periodEnd) : new Date();
        const usageRows = await this.meteringSource.list();
        const tenantRows = usageRows.filter((row) => this.isWithinRange(row, tenantId, start, end));
        const meterLines = this.rollupMeters(tenantRows);
        const { currency, ratedLines } = await this.applyPricing(tenantId, meterLines);
        const usageSubtotal = ratedLines.reduce((sum, line) => sum + line.amount, 0);
        const attributionRows = await this.attributionSource.list(tenantId, start.toISOString(), end.toISOString());
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
                meteringDays: new Set(tenantRows.map((row) => row.date)).size,
                meteringMeters: ratedLines.length,
                attributionRows: attributionRows.length,
                correlatedEvents: tenantRows.reduce((sum, row) => sum + (row.correlationIds ? row.correlationIds.length : 0), 0),
            },
        };
    }
    toCsv(report) {
        const header = ['meterId', 'usageKind', 'quantity', 'unitPrice', 'amount', 'correlationIds'];
        const usageLines = report.usage.map((line) => [
            line.meterId,
            line.usageKind,
            line.billableQuantity.toFixed(4),
            line.unitPrice.toFixed(6),
            line.amount.toFixed(2),
            line.correlationIds.join('|'),
        ].join(','));
        const attributionLines = report.attribution.breakdown.map((row) => [`cogs:${row.capability}:${row.resourceType}`, '', '', '', row.amount.toFixed(2), ''].join(','));
        const totals = [
            ['usageSubtotal', '', '', '', report.totals.usageSubtotal.toFixed(2), ''].join(','),
            ['cogsTotal', '', '', '', report.attribution.total.toFixed(2), ''].join(','),
            ['grossMargin', '', '', '', report.totals.grossMargin.toFixed(2), ''].join(','),
        ];
        return [header.join(','), ...usageLines, ...attributionLines, ...totals].join('\n');
    }
    rollupMeters(rows) {
        const meterTotals = new Map();
        for (const row of rows) {
            const base = {
                correlationIds: row.correlationIds || [],
                included: 0,
                billableQuantity: 0,
            };
            const mappings = [
                {
                    meterId: schema_js_1.MeterEventKind.INGEST_UNITS,
                    usageKind: 'ingestion.records',
                    quantity: row.ingestUnits,
                    unit: 'records',
                },
                {
                    meterId: schema_js_1.MeterEventKind.QUERY_CREDITS,
                    usageKind: 'graph.queries',
                    quantity: row.queryCredits,
                    unit: 'credits',
                },
                {
                    meterId: schema_js_1.MeterEventKind.STORAGE_BYTES_ESTIMATE,
                    usageKind: 'storage.bytes',
                    quantity: row.storageBytesEstimate,
                    unit: 'bytes',
                },
                {
                    meterId: schema_js_1.MeterEventKind.USER_SEAT_ACTIVE,
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
                    existing.correlationIds = Array.from(new Set([...existing.correlationIds, ...base.correlationIds]));
                    meterTotals.set(key, existing);
                }
                else {
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
    async applyPricing(tenantId, lines) {
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
    buildAttributionBreakdown(rows) {
        const byKey = new Map();
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
    isWithinRange(row, tenantId, start, end) {
        if (row.tenantId !== tenantId)
            return false;
        const date = new Date(`${row.date}T00:00:00Z`);
        return date >= start && date <= end;
    }
    startOfMonth() {
        const now = new Date();
        return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    }
}
exports.FinopsReportService = FinopsReportService;
exports.costAttributionRepository = new CostAttributionRepository();
exports.finopsReportService = new FinopsReportService({
    attributionSource: exports.costAttributionRepository,
});

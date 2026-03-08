"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantUsageService = exports.TenantUsageService = void 0;
const database_js_1 = require("../config/database.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const rangeOrder = [
    '24h',
    '7d',
    '30d',
    '90d',
    'month',
    'quarter',
    'year',
];
class TenantUsageService {
    get pool() {
        return (0, database_js_1.getPostgresPool)();
    }
    getUsageRange(range) {
        const key = (range || '30d');
        if (!rangeOrder.includes(key)) {
            throw new Error(`Invalid range: ${range}`);
        }
        const end = new Date();
        let start = new Date(end);
        if (key === '24h') {
            start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        }
        else if (key === '7d') {
            start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        }
        else if (key === '30d') {
            start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        else if (key === '90d') {
            start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
        }
        else if (key === 'month') {
            start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
        }
        else if (key === 'quarter') {
            const quarterStartMonth = Math.floor(end.getUTCMonth() / 3) * 3;
            start = new Date(Date.UTC(end.getUTCFullYear(), quarterStartMonth, 1));
        }
        else if (key === 'year') {
            start = new Date(Date.UTC(end.getUTCFullYear(), 0, 1));
        }
        return { key, start, end };
    }
    async getTenantUsage(tenantId, range) {
        const { key, start, end } = this.getUsageRange(range);
        try {
            const totalsResult = await this.pool.read(`
          SELECT kind, unit, SUM(quantity) AS total_quantity
          FROM usage_events
          WHERE tenant_id = $1
            AND occurred_at >= $2
            AND occurred_at <= $3
          GROUP BY kind, unit
          ORDER BY kind
        `, [tenantId, start.toISOString(), end.toISOString()]);
            const workflowResult = await this.pool.read(`
          SELECT
            COALESCE(metadata->>'workflow', 'unknown') AS workflow,
            kind,
            unit,
            SUM(quantity) AS total_quantity
          FROM usage_events
          WHERE tenant_id = $1
            AND occurred_at >= $2
            AND occurred_at <= $3
          GROUP BY workflow, kind, unit
          ORDER BY workflow, kind
        `, [tenantId, start.toISOString(), end.toISOString()]);
            const environmentResult = await this.pool.read(`
          SELECT
            COALESCE(metadata->>'environment', 'unknown') AS environment,
            kind,
            unit,
            SUM(quantity) AS total_quantity
          FROM usage_events
          WHERE tenant_id = $1
            AND occurred_at >= $2
            AND occurred_at <= $3
          GROUP BY environment, kind, unit
          ORDER BY environment, kind
        `, [tenantId, start.toISOString(), end.toISOString()]);
            const workflowEnvironmentResult = await this.pool.read(`
          SELECT
            COALESCE(metadata->>'workflow', 'unknown') AS workflow,
            COALESCE(metadata->>'environment', 'unknown') AS environment,
            kind,
            unit,
            SUM(quantity) AS total_quantity
          FROM usage_events
          WHERE tenant_id = $1
            AND occurred_at >= $2
            AND occurred_at <= $3
          GROUP BY workflow, environment, kind, unit
          ORDER BY workflow, environment, kind
        `, [tenantId, start.toISOString(), end.toISOString()]);
            const totalsRows = totalsResult.rows;
            const workflowRows = workflowResult.rows;
            const environmentRows = environmentResult.rows;
            const workflowEnvironmentRows = workflowEnvironmentResult.rows;
            return {
                tenantId,
                range: {
                    key,
                    start: start.toISOString(),
                    end: end.toISOString(),
                },
                totals: totalsRows.map((row) => ({
                    kind: row.kind,
                    unit: row.unit,
                    total: Number(row.total_quantity),
                })),
                breakdown: {
                    byWorkflow: this.groupByWorkflow(workflowRows),
                    byEnvironment: this.groupByEnvironment(environmentRows),
                    byWorkflowEnvironment: this.groupByCompositeKey(workflowEnvironmentRows),
                },
            };
        }
        catch (error) {
            logger_js_1.default.error('Failed to fetch tenant usage summary', {
                error,
                tenantId,
            });
            throw error;
        }
    }
    groupByWorkflow(rows) {
        const grouped = new Map();
        rows.forEach((row) => {
            const groupKey = row.workflow;
            const totals = grouped.get(groupKey) || [];
            totals.push({
                kind: row.kind,
                unit: row.unit,
                total: Number(row.total_quantity),
            });
            grouped.set(groupKey, totals);
        });
        return Array.from(grouped.entries()).map(([groupKey, totals]) => ({
            workflow: groupKey,
            totals,
        }));
    }
    groupByEnvironment(rows) {
        const grouped = new Map();
        rows.forEach((row) => {
            const groupKey = row.environment;
            const totals = grouped.get(groupKey) || [];
            totals.push({
                kind: row.kind,
                unit: row.unit,
                total: Number(row.total_quantity),
            });
            grouped.set(groupKey, totals);
        });
        return Array.from(grouped.entries()).map(([groupKey, totals]) => ({
            environment: groupKey,
            totals,
        }));
    }
    groupByCompositeKey(rows) {
        const grouped = new Map();
        rows.forEach((row) => {
            const composite = `${row.workflow}::${row.environment}`;
            const existing = grouped.get(composite) || {
                workflow: row.workflow,
                environment: row.environment,
                totals: [],
            };
            existing.totals.push({
                kind: row.kind,
                unit: row.unit,
                total: Number(row.total_quantity),
            });
            grouped.set(composite, existing);
        });
        return Array.from(grouped.values());
    }
}
exports.TenantUsageService = TenantUsageService;
exports.tenantUsageService = new TenantUsageService();

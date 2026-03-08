"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.finOpsRollupService = exports.FinOpsRollupService = void 0;
const postgres_js_1 = require("../db/postgres.js");
class FinOpsRollupService {
    async getRollups(tenantId, days = 30) {
        const pool = (0, postgres_js_1.getPostgresPool)();
        const startDate = new Date();
        startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
        startDate.setUTCHours(0, 0, 0, 0);
        const { rows } = await pool.query(`
      SELECT usage_date, compute_units, storage_gb_hours, egress_gb, third_party_requests,
             compute_cost_usd, storage_cost_usd, egress_cost_usd, third_party_cost_usd,
             total_cost_usd, metering_snapshot
      FROM finops_cost_rollups
      WHERE tenant_id = $1
        AND usage_date >= $2::date
      ORDER BY usage_date ASC
    `, [tenantId, startDate.toISOString().slice(0, 10)]);
        const trend = rows.map((row) => ({
            usageDate: row.usage_date,
            totalCostUsd: Number(row.total_cost_usd || 0),
            computeCostUsd: Number(row.compute_cost_usd || 0),
            storageCostUsd: Number(row.storage_cost_usd || 0),
            egressCostUsd: Number(row.egress_cost_usd || 0),
            thirdPartyCostUsd: Number(row.third_party_cost_usd || 0),
            computeUnits: Number(row.compute_units || 0),
            storageGbHours: Number(row.storage_gb_hours || 0),
            egressGb: Number(row.egress_gb || 0),
            thirdPartyRequests: Number(row.third_party_requests || 0),
        }));
        const totals = trend.reduce((acc, point) => {
            acc.totalCostUsd += point.totalCostUsd;
            acc.computeCostUsd += point.computeCostUsd;
            acc.storageCostUsd += point.storageCostUsd;
            acc.egressCostUsd += point.egressCostUsd;
            acc.thirdPartyCostUsd += point.thirdPartyCostUsd;
            acc.computeUnits += point.computeUnits;
            acc.storageGbHours += point.storageGbHours;
            acc.egressGb += point.egressGb;
            acc.thirdPartyRequests += point.thirdPartyRequests;
            return acc;
        }, {
            totalCostUsd: 0,
            computeCostUsd: 0,
            storageCostUsd: 0,
            egressCostUsd: 0,
            thirdPartyCostUsd: 0,
            computeUnits: 0,
            storageGbHours: 0,
            egressGb: 0,
            thirdPartyRequests: 0,
        });
        const buckets = [
            {
                key: 'compute',
                label: 'Compute',
                costUsd: totals.computeCostUsd,
                units: totals.computeUnits,
            },
            {
                key: 'storage',
                label: 'Storage',
                costUsd: totals.storageCostUsd,
                units: totals.storageGbHours,
            },
            {
                key: 'egress',
                label: 'Egress',
                costUsd: totals.egressCostUsd,
                units: totals.egressGb,
            },
            {
                key: 'third_party',
                label: '3rd Party',
                costUsd: totals.thirdPartyCostUsd,
                units: totals.thirdPartyRequests,
            },
        ].map((bucket) => ({
            ...bucket,
            allocationPct: totals.totalCostUsd > 0
                ? Math.round((bucket.costUsd / totals.totalCostUsd) * 10000) / 100
                : 0,
        }));
        return {
            tenantId,
            periodDays: days,
            totals: {
                totalCostUsd: totals.totalCostUsd,
                computeCostUsd: totals.computeCostUsd,
                storageCostUsd: totals.storageCostUsd,
                egressCostUsd: totals.egressCostUsd,
                thirdPartyCostUsd: totals.thirdPartyCostUsd,
            },
            buckets,
            unitMetrics: {
                costPerComputeUnit: totals.computeUnits > 0
                    ? totals.computeCostUsd / totals.computeUnits
                    : 0,
                costPerGbHour: totals.storageGbHours > 0
                    ? totals.storageCostUsd / totals.storageGbHours
                    : 0,
                costPerEgressGb: totals.egressGb > 0 ? totals.egressCostUsd / totals.egressGb : 0,
                costPerThirdPartyRequest: totals.thirdPartyRequests > 0
                    ? totals.thirdPartyCostUsd / totals.thirdPartyRequests
                    : 0,
            },
            trend,
            metering: rows.at(-1)?.metering_snapshot || {},
        };
    }
}
exports.FinOpsRollupService = FinOpsRollupService;
exports.finOpsRollupService = new FinOpsRollupService();

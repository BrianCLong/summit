"use strict";
/**
 * ESG Metrics Service
 * Handles metric calculations and data aggregation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsService = exports.MetricsService = void 0;
const uuid_1 = require("uuid");
const database_js_1 = require("../utils/database.js");
const logger_js_1 = require("../utils/logger.js");
const esg_reporting_1 = require("@intelgraph/esg-reporting");
class MetricsService {
    log = (0, logger_js_1.createChildLogger)({ service: 'MetricsService' });
    /**
     * Calculate ESG scores from metrics
     */
    calculateESGScores(environmental, social, governance) {
        return (0, esg_reporting_1.calculateESGScore)(environmental, social, governance);
    }
    /**
     * Add a new metric entry
     */
    async addMetric(tenantId, reportId, input, userId) {
        const metricId = (0, uuid_1.v4)();
        // Get previous value for variance calculation
        const previousMetric = await this.getLatestMetric(tenantId, input.name, input.category);
        const variance = previousMetric
            ? input.value - previousMetric.value
            : undefined;
        const variancePercentage = previousMetric && previousMetric.value !== 0
            ? ((input.value - previousMetric.value) / Math.abs(previousMetric.value)) * 100
            : undefined;
        // Determine trend
        const history = await this.getMetricHistory(tenantId, input.name, input.category, 4);
        const trend = (0, esg_reporting_1.analyzeTrend)(input.value, history.map((m) => m.value), this.isHigherBetter(input.name));
        const query = `
      INSERT INTO esg.metrics (
        id, tenant_id, report_id, metric_name, category, subcategory,
        value, unit, previous_value, target_value,
        variance, variance_percentage, trend,
        data_source_type, notes,
        period_start, period_end, recorded_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      )
      RETURNING *
    `;
        const result = await database_js_1.db.query(query, [
            metricId,
            tenantId,
            reportId,
            input.name,
            input.category,
            input.subcategory,
            input.value,
            input.unit,
            previousMetric?.value ?? null,
            input.targetValue ?? null,
            variance ?? null,
            variancePercentage ?? null,
            trend.direction,
            input.dataSourceType || 'manual',
            input.notes || null,
            new Date(), // period_start
            new Date(), // period_end
            userId,
        ]);
        this.log.info({ metricId, name: input.name }, 'Metric added');
        return this.mapRowToMetric(result.rows[0]);
    }
    /**
     * Get metrics for a report
     */
    async getMetricsForReport(reportId, tenantId, category) {
        let query = `
      SELECT * FROM esg.metrics
      WHERE report_id = $1 AND tenant_id = $2
    `;
        const values = [reportId, tenantId];
        if (category) {
            query += ' AND category = $3';
            values.push(category);
        }
        query += ' ORDER BY category, metric_name';
        const result = await database_js_1.db.query(query, values);
        return result.rows.map((row) => this.mapRowToMetric(row));
    }
    /**
     * Get latest metric value
     */
    async getLatestMetric(tenantId, metricName, category) {
        const query = `
      SELECT * FROM esg.metrics
      WHERE tenant_id = $1 AND metric_name = $2 AND category = $3
      ORDER BY recorded_at DESC
      LIMIT 1
    `;
        const result = await database_js_1.db.query(query, [tenantId, metricName, category]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToMetric(result.rows[0]);
    }
    /**
     * Get metric history
     */
    async getMetricHistory(tenantId, metricName, category, limit = 12) {
        const query = `
      SELECT * FROM esg.metrics
      WHERE tenant_id = $1 AND metric_name = $2 AND category = $3
      ORDER BY recorded_at DESC
      LIMIT $4
    `;
        const result = await database_js_1.db.query(query, [tenantId, metricName, category, limit]);
        return result.rows.map((row) => this.mapRowToMetric(row)).reverse();
    }
    /**
     * Get metric with trend analysis
     */
    async getMetricWithTrend(tenantId, metricName, category) {
        const current = await this.getLatestMetric(tenantId, metricName, category);
        if (!current) {
            return null;
        }
        const history = await this.getMetricHistory(tenantId, metricName, category, 12);
        const historicalValues = history.slice(0, -1).map((m) => m.value);
        const trend = (0, esg_reporting_1.analyzeTrend)(current.value, historicalValues, this.isHigherBetter(metricName));
        return {
            current,
            history,
            trend: {
                direction: trend.direction,
                percentageChange: trend.percentageChange,
                periods: trend.periods,
            },
        };
    }
    /**
     * Bulk import metrics
     */
    async bulkImportMetrics(tenantId, reportId, metrics, userId) {
        const errors = [];
        let imported = 0;
        for (const metric of metrics) {
            try {
                await this.addMetric(tenantId, reportId, metric, userId);
                imported++;
            }
            catch (error) {
                errors.push({
                    metric: metric.name,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
        this.log.info({ imported, errors: errors.length }, 'Bulk import completed');
        return { imported, errors };
    }
    /**
     * Get compliance assessment for metrics
     */
    async assessFrameworkCompliance(tenantId, reportId, frameworkId) {
        const metrics = await this.getMetricsForReport(reportId, tenantId);
        const reportedMetrics = metrics.map((m) => m.name);
        const assessment = (0, esg_reporting_1.assessCompliance)(frameworkId, reportedMetrics);
        return {
            framework: frameworkId,
            compliancePercentage: assessment.mandatoryCompliancePercentage,
            status: assessment.status,
            gaps: assessment.gaps.map((g) => ({
                id: g.id,
                name: g.name,
                metrics: g.metrics,
            })),
        };
    }
    /**
     * Aggregate metrics for a period
     */
    async aggregateMetrics(tenantId, category, startDate, endDate) {
        const query = `
      SELECT
        metric_name,
        SUM(value) as sum,
        AVG(value) as avg,
        MIN(value) as min,
        MAX(value) as max,
        COUNT(*) as count
      FROM esg.metrics
      WHERE tenant_id = $1
        AND category = $2
        AND recorded_at BETWEEN $3 AND $4
      GROUP BY metric_name
    `;
        const result = await database_js_1.db.query(query, [tenantId, category, startDate, endDate]);
        const aggregates = {};
        for (const row of result.rows) {
            aggregates[row.metric_name] = {
                sum: parseFloat(row.sum),
                avg: parseFloat(row.avg),
                min: parseFloat(row.min),
                max: parseFloat(row.max),
                count: parseInt(row.count, 10),
            };
        }
        return aggregates;
    }
    /**
     * Calculate category score from metrics
     */
    calculateCategoryScore(metrics, category) {
        if (metrics.length === 0) {
            return 0;
        }
        // Group metrics by subcategory
        const bySubcategory = metrics.reduce((acc, m) => {
            if (!acc[m.subcategory]) {
                acc[m.subcategory] = [];
            }
            acc[m.subcategory].push(m);
            return acc;
        }, {});
        // Calculate weighted average based on target completion
        let totalWeight = 0;
        let weightedSum = 0;
        for (const [subcategory, subMetrics] of Object.entries(bySubcategory)) {
            for (const metric of subMetrics) {
                const targetCompletion = metric.targetValue
                    ? Math.min(100, (metric.value / metric.targetValue) * 100)
                    : 50; // Default to neutral if no target
                const weight = 1; // Can be customized based on metric importance
                weightedSum += targetCompletion * weight;
                totalWeight += weight;
            }
        }
        return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    }
    /**
     * Determine if higher values are better for a metric
     */
    isHigherBetter(metricName) {
        const lowerIsBetter = [
            'scope1Emissions',
            'scope2Emissions',
            'scope3Emissions',
            'totalEmissions',
            'emissionsIntensity',
            'energyIntensity',
            'waterIntensity',
            'waterConsumption',
            'totalWaste',
            'hazardousWaste',
            'turnoverRate',
            'voluntaryTurnoverRate',
            'totalRecordableIncidentRate',
            'lostTimeInjuryRate',
            'fatalities',
            'ceoToMedianWorkerRatio',
            'whistleblowerCases',
            'corruptionIncidents',
            'antiCompetitiveIncidents',
            'regulatoryFines',
            'cybersecurityIncidents',
            'dataBreaches',
        ];
        return !lowerIsBetter.includes(metricName);
    }
    /**
     * Map database row to ESGMetricEntry
     */
    mapRowToMetric(row) {
        return {
            id: row.id,
            name: row.metric_name,
            category: row.category,
            subcategory: row.subcategory,
            value: parseFloat(row.value),
            unit: row.unit,
            previousValue: row.previous_value
                ? parseFloat(row.previous_value)
                : undefined,
            targetValue: row.target_value
                ? parseFloat(row.target_value)
                : undefined,
            benchmarkValue: row.benchmark_value
                ? parseFloat(row.benchmark_value)
                : undefined,
            variance: row.variance ? parseFloat(row.variance) : undefined,
            trend: row.trend,
            dataSource: {
                name: row.data_source_name || 'Manual Entry',
                type: row.data_source_type || 'manual',
                lastUpdated: new Date(row.recorded_at),
                reliability: row.data_source_reliability || 'medium',
                verificationStatus: row.verification_status || 'unverified',
            },
            notes: row.notes,
        };
    }
}
exports.MetricsService = MetricsService;
exports.metricsService = new MetricsService();

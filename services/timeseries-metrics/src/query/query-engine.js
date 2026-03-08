"use strict";
/**
 * Query Engine
 *
 * Provides PromQL-like query capabilities with optimization
 * for time-series metrics data.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryEngine = exports.QueryExpressionType = void 0;
const lru_cache_1 = require("lru-cache");
const metric_types_js_1 = require("../models/metric-types.js");
// ============================================================================
// QUERY INTERFACES
// ============================================================================
/**
 * Query expression types
 */
var QueryExpressionType;
(function (QueryExpressionType) {
    QueryExpressionType["INSTANT"] = "instant";
    QueryExpressionType["RANGE"] = "range";
    QueryExpressionType["AGGREGATION"] = "aggregation";
    QueryExpressionType["BINARY_OP"] = "binary_op";
    QueryExpressionType["FUNCTION"] = "function";
})(QueryExpressionType || (exports.QueryExpressionType = QueryExpressionType = {}));
// ============================================================================
// QUERY ENGINE
// ============================================================================
class QueryEngine {
    storageManager;
    logger;
    queryCache;
    activeQueries;
    constructor(storageManager, logger) {
        this.storageManager = storageManager;
        this.logger = logger;
        this.activeQueries = new Map();
        // Query result cache
        this.queryCache = new lru_cache_1.LRUCache({
            max: 1000,
            ttl: 60000, // 1 minute cache
            updateAgeOnGet: true,
        });
    }
    /**
     * Execute an instant query
     */
    async instantQuery(query, time, options) {
        const startTime = Date.now();
        const queryId = this.generateQueryId();
        try {
            this.activeQueries.set(queryId, { startTime, tenantId: options.tenantId });
            // Check cache
            const cacheKey = this.getCacheKey(query, time, time, options.tenantId);
            if (options.useCache !== false) {
                const cached = this.queryCache.get(cacheKey);
                if (cached) {
                    return { ...cached, stats: { ...cached.stats, cacheHit: true } };
                }
            }
            // Parse query
            const parsed = this.parseQuery(query);
            // Build read request
            const readRequest = {
                metricName: parsed.metricName,
                labels: this.matchersToLabels(parsed.labelMatchers),
                startTime: time - 300000, // 5 minutes before
                endTime: time,
                tenantId: options.tenantId,
            };
            // Execute query
            const results = await this.storageManager.read(readRequest);
            // Apply aggregations and functions
            const processedResults = this.processResults(results, parsed, time, time);
            // Build response
            const response = {
                resultType: 'vector',
                data: processedResults.map((r) => ({
                    metric: {
                        __name__: r.metricName,
                        ...r.labels,
                    },
                    value: [
                        time / 1000,
                        r.dataPoints.length > 0
                            ? r.dataPoints[r.dataPoints.length - 1].value.toString()
                            : '0',
                    ],
                })),
                stats: {
                    executionTimeMs: Date.now() - startTime,
                    samplesScanned: results.reduce((sum, r) => sum + r.dataPoints.length, 0),
                    seriesScanned: results.length,
                    bytesScanned: this.estimateBytesScanned(results),
                    tiersQueried: [...new Set(results.map((r) => r.tier))],
                    cacheHit: false,
                },
            };
            // Cache result
            if (options.useCache !== false) {
                this.queryCache.set(cacheKey, response);
            }
            return response;
        }
        finally {
            this.activeQueries.delete(queryId);
        }
    }
    /**
     * Execute a range query
     */
    async rangeQuery(query, start, end, step, options) {
        const startTime = Date.now();
        const queryId = this.generateQueryId();
        try {
            this.activeQueries.set(queryId, { startTime, tenantId: options.tenantId });
            // Check cache
            const cacheKey = this.getCacheKey(query, start, end, options.tenantId);
            if (options.useCache !== false) {
                const cached = this.queryCache.get(cacheKey);
                if (cached) {
                    return { ...cached, stats: { ...cached.stats, cacheHit: true } };
                }
            }
            // Parse query
            const parsed = this.parseQuery(query);
            parsed.range = { start, end, step };
            // Build read request
            const readRequest = {
                metricName: parsed.metricName,
                labels: this.matchersToLabels(parsed.labelMatchers),
                startTime: start,
                endTime: end,
                tenantId: options.tenantId,
            };
            // Execute query
            const results = await this.storageManager.read(readRequest);
            // Apply aggregations and functions
            const processedResults = this.processResults(results, parsed, start, end);
            // Align to step
            const alignedResults = this.alignToStep(processedResults, start, end, step);
            // Build response
            const response = {
                resultType: 'matrix',
                data: alignedResults.map((r) => ({
                    metric: {
                        __name__: r.metricName,
                        ...r.labels,
                    },
                    values: r.dataPoints.map((dp) => [dp.timestamp / 1000, dp.value.toString()]),
                })),
                stats: {
                    executionTimeMs: Date.now() - startTime,
                    samplesScanned: results.reduce((sum, r) => sum + r.dataPoints.length, 0),
                    seriesScanned: results.length,
                    bytesScanned: this.estimateBytesScanned(results),
                    tiersQueried: [...new Set(results.map((r) => r.tier))],
                    cacheHit: false,
                },
            };
            // Cache result
            if (options.useCache !== false) {
                this.queryCache.set(cacheKey, response);
            }
            return response;
        }
        finally {
            this.activeQueries.delete(queryId);
        }
    }
    /**
     * Parse a PromQL-like query string
     */
    parseQuery(query) {
        // Simple parser for basic queries
        // Format: metric_name{label1="value1", label2=~"regex"}
        const match = query.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)\s*(?:\{([^}]*)\})?$/);
        if (!match) {
            // Try to parse function calls
            const funcMatch = query.match(/^(\w+)\s*\(\s*([a-zA-Z_:][a-zA-Z0-9_:]*)\s*(?:\{([^}]*)\})?\s*(?:,\s*(.+))?\s*\)$/);
            if (funcMatch) {
                const [, funcName, metricName, labelsStr, argsStr] = funcMatch;
                const labelMatchers = this.parseLabelMatchers(labelsStr || '');
                const functions = [
                    {
                        name: funcName,
                        args: argsStr ? argsStr.split(',').map((a) => a.trim()) : [],
                    },
                ];
                return {
                    type: QueryExpressionType.FUNCTION,
                    metricName,
                    labelMatchers,
                    functions,
                };
            }
            // Try aggregation
            const aggMatch = query.match(/^(sum|avg|min|max|count|stddev|stdvar)\s*(?:by\s*\(([^)]+)\)|without\s*\(([^)]+)\))?\s*\(\s*(.+)\s*\)$/i);
            if (aggMatch) {
                const [, aggType, byLabels, withoutLabels, innerQuery] = aggMatch;
                const innerParsed = this.parseQuery(innerQuery);
                return {
                    ...innerParsed,
                    type: QueryExpressionType.AGGREGATION,
                    aggregation: {
                        type: aggType.toUpperCase(),
                        by: byLabels ? byLabels.split(',').map((l) => l.trim()) : undefined,
                        without: withoutLabels ? withoutLabels.split(',').map((l) => l.trim()) : undefined,
                    },
                };
            }
            throw new Error(`Invalid query syntax: ${query}`);
        }
        const [, metricName, labelsStr] = match;
        const labelMatchers = this.parseLabelMatchers(labelsStr || '');
        return {
            type: labelMatchers.length > 0 ? QueryExpressionType.INSTANT : QueryExpressionType.INSTANT,
            metricName,
            labelMatchers,
        };
    }
    /**
     * Parse label matchers from string
     */
    parseLabelMatchers(labelsStr) {
        if (!labelsStr.trim())
            return [];
        const matchers = [];
        const regex = /(\w+)\s*(=~|!=|!~|=)\s*"([^"]*)"/g;
        let match;
        while ((match = regex.exec(labelsStr)) !== null) {
            matchers.push({
                name: match[1],
                type: match[2],
                value: match[3],
            });
        }
        return matchers;
    }
    /**
     * Convert label matchers to labels object for exact matches
     */
    matchersToLabels(matchers) {
        const labels = {};
        for (const matcher of matchers) {
            if (matcher.type === '=') {
                labels[matcher.name] = matcher.value;
            }
        }
        return labels;
    }
    /**
     * Process query results with aggregations and functions
     */
    processResults(results, parsed, start, end) {
        let processed = results;
        // Apply label matchers (regex)
        processed = this.applyLabelMatchers(processed, parsed.labelMatchers);
        // Apply functions
        if (parsed.functions) {
            for (const func of parsed.functions) {
                processed = this.applyFunction(processed, func);
            }
        }
        // Apply aggregation
        if (parsed.aggregation) {
            processed = this.applyAggregation(processed, parsed.aggregation);
        }
        return processed;
    }
    /**
     * Apply label matchers including regex
     */
    applyLabelMatchers(results, matchers) {
        return results.filter((result) => {
            return matchers.every((matcher) => {
                const labelValue = result.labels[matcher.name] || '';
                switch (matcher.type) {
                    case '=':
                        return labelValue === matcher.value;
                    case '!=':
                        return labelValue !== matcher.value;
                    case '=~':
                        return new RegExp(matcher.value).test(labelValue);
                    case '!~':
                        return !new RegExp(matcher.value).test(labelValue);
                }
            });
        });
    }
    /**
     * Apply function to results
     */
    applyFunction(results, func) {
        switch (func.name.toLowerCase()) {
            case 'rate':
                return this.applyRate(results, func.args);
            case 'irate':
                return this.applyIRate(results);
            case 'increase':
                return this.applyIncrease(results, func.args);
            case 'delta':
                return this.applyDelta(results);
            case 'deriv':
                return this.applyDeriv(results);
            case 'abs':
                return this.applyMath(results, Math.abs);
            case 'ceil':
                return this.applyMath(results, Math.ceil);
            case 'floor':
                return this.applyMath(results, Math.floor);
            case 'round':
                return this.applyMath(results, Math.round);
            case 'histogram_quantile':
                return this.applyHistogramQuantile(results, func.args);
            default:
                return results;
        }
    }
    /**
     * Apply rate function (per-second rate of increase)
     */
    applyRate(results, args) {
        return results.map((result) => {
            if (result.dataPoints.length < 2) {
                return { ...result, dataPoints: [] };
            }
            const ratePoints = [];
            for (let i = 1; i < result.dataPoints.length; i++) {
                const prev = result.dataPoints[i - 1];
                const curr = result.dataPoints[i];
                const timeDiffSec = (curr.timestamp - prev.timestamp) / 1000;
                if (timeDiffSec > 0) {
                    const rate = Math.max(0, curr.value - prev.value) / timeDiffSec;
                    ratePoints.push({ timestamp: curr.timestamp, value: rate });
                }
            }
            return { ...result, dataPoints: ratePoints };
        });
    }
    /**
     * Apply irate function (instant rate)
     */
    applyIRate(results) {
        return results.map((result) => {
            if (result.dataPoints.length < 2) {
                return { ...result, dataPoints: [] };
            }
            const last = result.dataPoints[result.dataPoints.length - 1];
            const secondLast = result.dataPoints[result.dataPoints.length - 2];
            const timeDiffSec = (last.timestamp - secondLast.timestamp) / 1000;
            const rate = timeDiffSec > 0 ? Math.max(0, last.value - secondLast.value) / timeDiffSec : 0;
            return { ...result, dataPoints: [{ timestamp: last.timestamp, value: rate }] };
        });
    }
    /**
     * Apply increase function
     */
    applyIncrease(results, args) {
        return results.map((result) => {
            if (result.dataPoints.length < 2) {
                return { ...result, dataPoints: [] };
            }
            const first = result.dataPoints[0];
            const last = result.dataPoints[result.dataPoints.length - 1];
            const increase = Math.max(0, last.value - first.value);
            return { ...result, dataPoints: [{ timestamp: last.timestamp, value: increase }] };
        });
    }
    /**
     * Apply delta function
     */
    applyDelta(results) {
        return results.map((result) => {
            if (result.dataPoints.length < 2) {
                return { ...result, dataPoints: [] };
            }
            const first = result.dataPoints[0];
            const last = result.dataPoints[result.dataPoints.length - 1];
            const delta = last.value - first.value;
            return { ...result, dataPoints: [{ timestamp: last.timestamp, value: delta }] };
        });
    }
    /**
     * Apply deriv function (derivative)
     */
    applyDeriv(results) {
        return results.map((result) => {
            if (result.dataPoints.length < 2) {
                return { ...result, dataPoints: [] };
            }
            // Linear regression derivative
            const n = result.dataPoints.length;
            let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
            for (const dp of result.dataPoints) {
                const x = dp.timestamp / 1000;
                const y = dp.value;
                sumX += x;
                sumY += y;
                sumXY += x * y;
                sumX2 += x * x;
            }
            const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
            const last = result.dataPoints[result.dataPoints.length - 1];
            return { ...result, dataPoints: [{ timestamp: last.timestamp, value: slope }] };
        });
    }
    /**
     * Apply math function to all values
     */
    applyMath(results, fn) {
        return results.map((result) => ({
            ...result,
            dataPoints: result.dataPoints.map((dp) => ({
                timestamp: dp.timestamp,
                value: fn(dp.value),
            })),
        }));
    }
    /**
     * Apply histogram_quantile function
     */
    applyHistogramQuantile(results, args) {
        const quantile = typeof args[0] === 'number' ? args[0] : parseFloat(args[0]);
        // Group by labels without 'le' (bucket boundary)
        const groups = new Map();
        for (const result of results) {
            const { le, ...otherLabels } = result.labels;
            const key = JSON.stringify(otherLabels);
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(result);
        }
        const quantileResults = [];
        for (const [key, bucketResults] of groups) {
            // Sort by bucket boundary
            bucketResults.sort((a, b) => {
                const leA = a.labels.le === '+Inf' ? Infinity : parseFloat(a.labels.le);
                const leB = b.labels.le === '+Inf' ? Infinity : parseFloat(b.labels.le);
                return leA - leB;
            });
            // Calculate quantile for each timestamp
            const timestamps = new Set();
            bucketResults.forEach((r) => r.dataPoints.forEach((dp) => timestamps.add(dp.timestamp)));
            const quantilePoints = [];
            for (const ts of Array.from(timestamps).sort()) {
                const bucketValues = [];
                for (const bucket of bucketResults) {
                    const dp = bucket.dataPoints.find((p) => p.timestamp === ts);
                    if (dp) {
                        const le = bucket.labels.le === '+Inf' ? Infinity : parseFloat(bucket.labels.le);
                        bucketValues.push({ le, count: dp.value });
                    }
                }
                if (bucketValues.length > 0) {
                    const totalCount = bucketValues[bucketValues.length - 1].count;
                    const targetCount = quantile * totalCount;
                    let prevBucket = { le: 0, count: 0 };
                    for (const bucket of bucketValues) {
                        if (bucket.count >= targetCount) {
                            const fraction = bucket.count === prevBucket.count
                                ? 0
                                : (targetCount - prevBucket.count) / (bucket.count - prevBucket.count);
                            const value = prevBucket.le + (bucket.le - prevBucket.le) * fraction;
                            quantilePoints.push({ timestamp: ts, value: isFinite(value) ? value : 0 });
                            break;
                        }
                        prevBucket = bucket;
                    }
                }
            }
            const labels = JSON.parse(key);
            quantileResults.push({
                metricName: bucketResults[0]?.metricName || '',
                labels,
                dataPoints: quantilePoints,
                resolution: bucketResults[0]?.resolution || '15s',
                tier: bucketResults[0]?.tier,
            });
        }
        return quantileResults;
    }
    /**
     * Apply aggregation to results
     */
    applyAggregation(results, aggregation) {
        // Group results by aggregation labels
        const groups = new Map();
        for (const result of results) {
            let groupLabels;
            if (aggregation.by) {
                groupLabels = {};
                for (const label of aggregation.by) {
                    if (result.labels[label]) {
                        groupLabels[label] = result.labels[label];
                    }
                }
            }
            else if (aggregation.without) {
                groupLabels = { ...result.labels };
                for (const label of aggregation.without) {
                    delete groupLabels[label];
                }
            }
            else {
                groupLabels = {};
            }
            const key = JSON.stringify(groupLabels);
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(result);
        }
        // Aggregate each group
        const aggregatedResults = [];
        for (const [key, groupResults] of groups) {
            const labels = JSON.parse(key);
            // Collect all timestamps
            const allTimestamps = new Set();
            groupResults.forEach((r) => r.dataPoints.forEach((dp) => allTimestamps.add(dp.timestamp)));
            const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
            const aggregatedPoints = [];
            for (const ts of sortedTimestamps) {
                const values = [];
                for (const result of groupResults) {
                    const dp = result.dataPoints.find((p) => p.timestamp === ts);
                    if (dp)
                        values.push(dp.value);
                }
                if (values.length > 0) {
                    let aggregatedValue;
                    switch (aggregation.type) {
                        case metric_types_js_1.AggregationType.SUM:
                            aggregatedValue = values.reduce((a, b) => a + b, 0);
                            break;
                        case metric_types_js_1.AggregationType.AVG:
                            aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length;
                            break;
                        case metric_types_js_1.AggregationType.MIN:
                            aggregatedValue = Math.min(...values);
                            break;
                        case metric_types_js_1.AggregationType.MAX:
                            aggregatedValue = Math.max(...values);
                            break;
                        case metric_types_js_1.AggregationType.COUNT:
                            aggregatedValue = values.length;
                            break;
                        default:
                            aggregatedValue = values[0];
                    }
                    aggregatedPoints.push({ timestamp: ts, value: aggregatedValue });
                }
            }
            aggregatedResults.push({
                metricName: groupResults[0]?.metricName || '',
                labels,
                dataPoints: aggregatedPoints,
                resolution: groupResults[0]?.resolution || '15s',
                tier: groupResults[0]?.tier,
            });
        }
        return aggregatedResults;
    }
    /**
     * Align data points to step interval
     */
    alignToStep(results, start, end, step) {
        return results.map((result) => {
            const alignedPoints = [];
            for (let ts = start; ts <= end; ts += step) {
                // Find closest data point
                let closest = result.dataPoints[0];
                let minDiff = Math.abs((closest?.timestamp || 0) - ts);
                for (const dp of result.dataPoints) {
                    const diff = Math.abs(dp.timestamp - ts);
                    if (diff < minDiff) {
                        minDiff = diff;
                        closest = dp;
                    }
                }
                // Only include if within reasonable range (2x step)
                if (closest && minDiff <= step * 2) {
                    alignedPoints.push({ timestamp: ts, value: closest.value });
                }
            }
            return { ...result, dataPoints: alignedPoints };
        });
    }
    /**
     * Estimate bytes scanned for stats
     */
    estimateBytesScanned(results) {
        // Estimate ~24 bytes per data point (8 timestamp + 8 value + 8 overhead)
        return results.reduce((sum, r) => sum + r.dataPoints.length * 24, 0);
    }
    /**
     * Generate unique query ID
     */
    generateQueryId() {
        return `query_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    /**
     * Generate cache key
     */
    getCacheKey(query, start, end, tenantId) {
        // Round to minute for cache key
        const roundedStart = Math.floor(start / 60000) * 60000;
        const roundedEnd = Math.floor(end / 60000) * 60000;
        return `${tenantId}:${query}:${roundedStart}:${roundedEnd}`;
    }
    /**
     * Get active query count
     */
    getActiveQueryCount(tenantId) {
        if (!tenantId) {
            return this.activeQueries.size;
        }
        return Array.from(this.activeQueries.values()).filter((q) => q.tenantId === tenantId).length;
    }
    /**
     * Clear query cache
     */
    clearCache(tenantId) {
        if (!tenantId) {
            this.queryCache.clear();
        }
        else {
            // Clear only tenant's entries
            for (const key of this.queryCache.keys()) {
                if (key.startsWith(`${tenantId}:`)) {
                    this.queryCache.delete(key);
                }
            }
        }
    }
}
exports.QueryEngine = QueryEngine;

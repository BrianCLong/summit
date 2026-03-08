"use strict";
/**
 * GraphQL Performance Monitoring
 * Tracks resolver execution time, identifies N+1 queries, and monitors complexity
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalPerformanceMonitor = exports.DataLoaderFactory = exports.PerformanceMonitor = void 0;
exports.createPerformanceMonitoringPlugin = createPerformanceMonitoringPlugin;
exports.addPerformanceMonitoring = addPerformanceMonitoring;
exports.createDataLoaderContext = createDataLoaderContext;
exports.formatPerformanceReport = formatPerformanceReport;
const graphql_1 = require("graphql");
const utils_1 = require("@graphql-tools/utils");
class PerformanceMonitor {
    metrics = [];
    fieldExecutions = new Map();
    slowResolverThreshold;
    nPlusOneThreshold;
    constructor(slowResolverThreshold = 100, nPlusOneThreshold = 5) {
        this.slowResolverThreshold = slowResolverThreshold;
        this.nPlusOneThreshold = nPlusOneThreshold;
    }
    /**
     * Track resolver execution
     */
    trackResolverExecution(fieldName, typeName, path, executionTime, args, returnType) {
        const metric = {
            fieldName,
            typeName,
            path,
            executionTime,
            timestamp: new Date(),
            args,
            returnType,
        };
        this.metrics.push(metric);
        // Track for N+1 detection
        const key = `${typeName}.${fieldName}`;
        if (!this.fieldExecutions.has(key)) {
            this.fieldExecutions.set(key, []);
        }
        this.fieldExecutions.get(key).push(executionTime);
    }
    /**
     * Generate performance report
     */
    generateReport() {
        const totalExecutionTime = this.metrics.reduce((sum, m) => sum + m.executionTime, 0);
        const slowResolvers = this.metrics
            .filter((m) => m.executionTime > this.slowResolverThreshold)
            .sort((a, b) => b.executionTime - a.executionTime);
        const nPlusOneQueries = this.detectNPlusOneQueries();
        return {
            totalExecutionTime,
            resolverMetrics: this.metrics,
            slowResolvers,
            nPlusOneQueries,
        };
    }
    /**
     * Detect N+1 queries
     */
    detectNPlusOneQueries() {
        const detections = [];
        for (const [key, executionTimes] of this.fieldExecutions.entries()) {
            if (executionTimes.length >= this.nPlusOneThreshold) {
                const [typeName, fieldName] = key.split('.');
                // Get paths for this field
                const paths = this.metrics
                    .filter((m) => m.typeName === typeName && m.fieldName === fieldName)
                    .map((m) => m.path);
                detections.push({
                    fieldName,
                    typeName,
                    occurrences: executionTimes.length,
                    executionTimes,
                    paths,
                    detected: true,
                });
            }
        }
        return detections.sort((a, b) => b.occurrences - a.occurrences);
    }
    /**
     * Get top slowest resolvers
     */
    getSlowestResolvers(limit = 10) {
        return [...this.metrics]
            .sort((a, b) => b.executionTime - a.executionTime)
            .slice(0, limit);
    }
    /**
     * Get resolver statistics
     */
    getResolverStats(typeName, fieldName) {
        const key = `${typeName}.${fieldName}`;
        const executionTimes = this.fieldExecutions.get(key);
        if (!executionTimes || executionTimes.length === 0) {
            return null;
        }
        const totalTime = executionTimes.reduce((sum, t) => sum + t, 0);
        const count = executionTimes.length;
        return {
            count,
            totalTime,
            avgTime: totalTime / count,
            minTime: Math.min(...executionTimes),
            maxTime: Math.max(...executionTimes),
        };
    }
    /**
     * Clear metrics
     */
    clear() {
        this.metrics = [];
        this.fieldExecutions.clear();
    }
    /**
     * Export metrics to JSON
     */
    exportMetrics() {
        return JSON.stringify({
            metrics: this.metrics,
            report: this.generateReport(),
        }, null, 2);
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
/**
 * Create performance monitoring plugin for Apollo Server
 */
function createPerformanceMonitoringPlugin(monitor) {
    return {
        async requestDidStart() {
            const requestStartTime = Date.now();
            return {
                async willResolveField({ info }) {
                    const fieldStartTime = Date.now();
                    return (error, result) => {
                        const executionTime = Date.now() - fieldStartTime;
                        const path = (0, graphql_1.responsePathAsArray)(info.path);
                        const pathStrings = path.map(String);
                        monitor.trackResolverExecution(info.fieldName, info.parentType.name, pathStrings, executionTime, info.variableValues, info.returnType.toString());
                        // Log slow resolvers
                        if (executionTime > 100) {
                            console.warn(`Slow resolver: ${info.parentType.name}.${info.fieldName} took ${executionTime}ms`);
                        }
                    };
                },
                async willSendResponse({ response }) {
                    const requestTime = Date.now() - requestStartTime;
                    // Add performance metrics to extensions
                    if (!response.extensions) {
                        response.extensions = {};
                    }
                    const report = monitor.generateReport();
                    response.extensions.performance = {
                        totalTime: requestTime,
                        resolverTime: report.totalExecutionTime,
                        slowResolvers: report.slowResolvers.length,
                        nPlusOneQueries: report.nPlusOneQueries.length,
                    };
                    // Log N+1 queries
                    if (report.nPlusOneQueries.length > 0) {
                        console.warn(`N+1 queries detected:`, report.nPlusOneQueries.map((q) => `${q.typeName}.${q.fieldName} (${q.occurrences} times)`));
                    }
                },
            };
        },
    };
}
/**
 * Add performance monitoring to schema
 */
function addPerformanceMonitoring(schema, monitor) {
    return (0, utils_1.mapSchema)(schema, {
        [utils_1.MapperKind.OBJECT_FIELD]: (fieldConfig) => {
            const originalResolve = fieldConfig.resolve;
            fieldConfig.resolve = async (source, args, context, info) => {
                const startTime = Date.now();
                const path = (0, graphql_1.responsePathAsArray)(info.path).map(String);
                try {
                    let result;
                    if (originalResolve) {
                        result = await originalResolve(source, args, context, info);
                    }
                    else {
                        result = source?.[info.fieldName];
                    }
                    const executionTime = Date.now() - startTime;
                    monitor.trackResolverExecution(info.fieldName, info.parentType.name, path, executionTime, args, info.returnType.toString());
                    return result;
                }
                catch (error) {
                    const executionTime = Date.now() - startTime;
                    monitor.trackResolverExecution(info.fieldName, info.parentType.name, path, executionTime, args, info.returnType.toString());
                    throw error;
                }
            };
            return fieldConfig;
        },
    });
}
/**
 * DataLoader helper for preventing N+1 queries
 */
class DataLoaderFactory {
    loaders = new Map();
    /**
     * Get or create a DataLoader
     */
    getLoader(key, batchLoadFn) {
        if (!this.loaders.has(key)) {
            // Note: This is a simple implementation. In production, use the actual DataLoader library
            this.loaders.set(key, {
                load: async (k) => {
                    const results = await batchLoadFn([k]);
                    return results[0];
                },
                loadMany: async (keys) => {
                    return batchLoadFn(keys);
                },
            });
        }
        return this.loaders.get(key);
    }
    /**
     * Clear all loaders (call on each request)
     */
    clear() {
        this.loaders.clear();
    }
}
exports.DataLoaderFactory = DataLoaderFactory;
/**
 * Create context with DataLoaders
 */
function createDataLoaderContext(baseContext) {
    const loaderFactory = new DataLoaderFactory();
    return {
        ...baseContext,
        loaders: {
            // Example: Entity loader
            entity: loaderFactory.getLoader('entity', async (ids) => {
                // Batch load entities
                const entities = await baseContext.db.entities.findMany({
                    where: { id: { in: ids } },
                });
                const entityMap = new Map(entities.map((e) => [e.id, e]));
                return ids.map((id) => entityMap.get(id) || new Error('Not found'));
            }),
            // Example: Relationship loader
            relationships: loaderFactory.getLoader('relationships', async (entityIds) => {
                const relationships = await baseContext.db.relationships.findMany({
                    where: { from: { in: entityIds } },
                });
                const relMap = new Map();
                for (const rel of relationships) {
                    if (!relMap.has(rel.from)) {
                        relMap.set(rel.from, []);
                    }
                    relMap.get(rel.from).push(rel);
                }
                return entityIds.map((id) => relMap.get(id) || []);
            }),
        },
    };
}
/**
 * Format performance report for logging
 */
function formatPerformanceReport(report) {
    let output = '\n=== GraphQL Performance Report ===\n\n';
    output += `Total Execution Time: ${report.totalExecutionTime.toFixed(2)}ms\n`;
    output += `Resolver Calls: ${report.resolverMetrics.length}\n\n`;
    if (report.slowResolvers.length > 0) {
        output += '⚠️  Slow Resolvers (>100ms):\n';
        for (const resolver of report.slowResolvers.slice(0, 10)) {
            output += `  - ${resolver.typeName}.${resolver.fieldName}: ${resolver.executionTime.toFixed(2)}ms\n`;
            output += `    Path: ${resolver.path.join('.')}\n`;
        }
        output += '\n';
    }
    if (report.nPlusOneQueries.length > 0) {
        output += '🔴 N+1 Queries Detected:\n';
        for (const query of report.nPlusOneQueries) {
            output += `  - ${query.typeName}.${query.fieldName}: ${query.occurrences} occurrences\n`;
            output += `    Avg time: ${(query.executionTimes.reduce((a, b) => a + b, 0) / query.executionTimes.length).toFixed(2)}ms\n`;
            output += `    Consider using DataLoader for batching\n\n`;
        }
    }
    output += '=====================================\n';
    return output;
}
/**
 * Global performance monitor instance
 */
exports.globalPerformanceMonitor = new PerformanceMonitor();

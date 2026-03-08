"use strict";
// @ts-nocheck
// Maestro Conductor v24.3.0 - Graph Query Optimizer
// Epic E16: Search & Index Optimization - Intelligent query optimization and caching
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryOptimizer = exports.QueryOptimizer = void 0;
const api_1 = require("@opentelemetry/api");
const prom_client_1 = require("prom-client");
const redis_js_1 = require("../db/redis.js");
const crypto = __importStar(require("crypto"));
const neo4j_js_1 = require("./neo4j.js");
const compression_js_1 = require("../utils/compression.js");
const logger_js_1 = require("../config/logger.js");
const tracer = api_1.trace.getTracer('query-optimizer', '24.3.0');
// Metrics
const optimizerCacheHits = new prom_client_1.Counter({
    name: 'query_optimizer_cache_hits_total',
    help: 'Query optimizer cache hits',
    labelNames: ['tenant_id', 'query_type', 'optimization_type'],
});
const optimizerCacheMisses = new prom_client_1.Counter({
    name: 'query_optimizer_cache_misses_total',
    help: 'Query optimizer cache misses',
    labelNames: ['tenant_id', 'query_type'],
});
const optimizationTime = new prom_client_1.Histogram({
    name: 'query_optimization_duration_seconds',
    help: 'Time spent optimizing queries',
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    labelNames: ['tenant_id', 'optimization_type'],
});
const activeOptimizations = new prom_client_1.Gauge({
    name: 'query_optimizations_active',
    help: 'Currently active query optimizations',
    labelNames: ['tenant_id'],
});
// New metrics for result caching
const resultCacheHits = new prom_client_1.Counter({
    name: 'query_result_cache_hits_total',
    help: 'Query result cache hits',
    labelNames: ['tenant_id', 'query_type'],
});
const resultCacheMisses = new prom_client_1.Counter({
    name: 'query_result_cache_misses_total',
    help: 'Query result cache misses',
    labelNames: ['tenant_id', 'query_type'],
});
class QueryOptimizer {
    cachePrefix = 'query_optimizer';
    resultCachePrefix = 'query_result';
    defaultTTL = 3600; // 1 hour
    indexHints = new Map();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    queryPatterns = new Map();
    constructor() {
        this.initializeIndexHints();
        this.loadOptimizationPatterns();
    }
    async optimizeQuery(query, params = {}, context) {
        return tracer.startActiveSpan('query_optimizer.optimize', async (span) => {
            span.setAttributes({
                tenant_id: context.tenantId,
                query_type: context.queryType,
                query_length: query.length,
                priority: context.priority,
            });
            activeOptimizations.inc({ tenant_id: context.tenantId });
            const startTime = Date.now();
            try {
                // Check cache first
                const cacheKey = this.buildCacheKey(query, params, context);
                const cached = await this.getFromCache(cacheKey);
                if (cached && context.cacheEnabled !== false) {
                    optimizerCacheHits.inc({
                        tenant_id: context.tenantId,
                        query_type: context.queryType,
                        optimization_type: 'cached',
                    });
                    return cached;
                }
                optimizerCacheMisses.inc({
                    tenant_id: context.tenantId,
                    query_type: context.queryType,
                });
                // Analyze query
                const analysis = this.analyzeQuery(query, context.queryType);
                // Generate optimization plan
                const plan = await this.generateOptimizationPlan(query, params, analysis, context);
                // Cache the optimization
                await this.cacheOptimization(cacheKey, plan);
                optimizationTime.observe({ tenant_id: context.tenantId, optimization_type: 'full' }, (Date.now() - startTime) / 1000);
                span.setAttributes({
                    optimization_count: plan.optimizations.length,
                    estimated_cost: plan.estimatedCost,
                    cache_enabled: !!plan.cacheStrategy?.enabled,
                });
                return plan;
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({ code: 2, message: error.message });
                throw error;
            }
            finally {
                activeOptimizations.dec({ tenant_id: context.tenantId });
                span.end();
            }
        });
    }
    // --- Result Caching Methods ---
    async executeCachedQuery(query, params, context, executeQuery) {
        if (context.cacheEnabled === false) {
            const rawResult = await executeQuery(query, params);
            // Normalize even if cache disabled to ensure consistent data types across app
            return (0, neo4j_js_1.transformNeo4jIntegers)(rawResult);
        }
        // 1. Optimize first to check cache strategy
        const plan = await this.optimizeQuery(query, params, context);
        // If caching not enabled in plan or it's a write, just execute and normalize
        if (!plan.cacheStrategy?.enabled) {
            const rawResult = await executeQuery(plan.optimizedQuery, params);
            return (0, neo4j_js_1.transformNeo4jIntegers)(rawResult);
        }
        const resultCacheKey = this.buildResultCacheKey(query, params, context);
        // 2. Try to get from result cache
        try {
            const cachedResult = await this.getFromResultCache(resultCacheKey);
            if (cachedResult) {
                resultCacheHits.inc({ tenant_id: context.tenantId, query_type: context.queryType });
                return cachedResult; // Already normalized/transformed when cached
            }
        }
        catch (e) {
            logger_js_1.logger.warn('Failed to read from result cache', { error: e });
        }
        resultCacheMisses.inc({ tenant_id: context.tenantId, query_type: context.queryType });
        // 3. Execute query
        const rawResult = await executeQuery(plan.optimizedQuery, params);
        // 4. Normalize Result
        const normalizedResult = (0, neo4j_js_1.transformNeo4jIntegers)(rawResult);
        // 5. Cache result (using normalized data)
        try {
            await this.cacheResult(resultCacheKey, normalizedResult, plan.cacheStrategy.ttl);
        }
        catch (e) {
            logger_js_1.logger.warn('Failed to write to result cache', { error: e });
        }
        return normalizedResult;
    }
    buildResultCacheKey(query, params, context) {
        const queryHash = crypto
            .createHash('sha256')
            .update(query + JSON.stringify(params))
            .digest('hex');
        return `${this.resultCachePrefix}:${context.tenantId}:${queryHash}`;
    }
    async getFromResultCache(key) {
        const redis = (0, redis_js_1.getRedisClient)();
        const cached = await redis.get(key);
        if (cached) {
            return compression_js_1.CompressionUtils.decompressFromString(cached);
        }
        return null;
    }
    async cacheResult(key, result, ttl) {
        const redis = (0, redis_js_1.getRedisClient)();
        // result is already normalized
        const compressed = await compression_js_1.CompressionUtils.compressToString(result);
        await redis.set(key, compressed, 'EX', ttl);
    }
    // Invalidation Method
    async invalidateForLabels(tenantId, labels) {
        logger_js_1.logger.info(`Invalidating cache for labels: ${labels.join(', ')} in tenant ${tenantId}`);
        // Broad invalidation by tenant
        // We clear both plan cache and result cache for the tenant
        // Result cache prefix: query_result:tenantId:hash
        // Plan cache prefix: query_optimizer:tenantId:queryType:hash
        const redis = (0, redis_js_1.getRedisClient)();
        const resultPattern = `${this.resultCachePrefix}:${tenantId}:*`;
        const planPattern = `${this.cachePrefix}:${tenantId}:*`;
        try {
            const deletePattern = (pattern) => {
                return new Promise((resolve, reject) => {
                    const stream = redis.scanStream({ match: pattern, count: 100 });
                    stream.on('data', (keys) => {
                        if (keys.length) {
                            stream.pause();
                            redis.del(...keys)
                                .then(() => stream.resume())
                                .catch((e) => {
                                logger_js_1.logger.error('Error deleting cache keys', e);
                                stream.resume();
                            });
                        }
                    });
                    stream.on('end', () => resolve());
                    stream.on('error', (err) => reject(err));
                });
            };
            await Promise.all([
                deletePattern(resultPattern),
                deletePattern(planPattern)
            ]);
        }
        catch (error) {
            logger_js_1.logger.error(`Failed to invalidate cache for tenant ${tenantId}`, { error });
        }
    }
    analyzeQuery(query, queryType) {
        const lowerQuery = query.toLowerCase();
        if (queryType === 'cypher') {
            return this.analyzeCypherQuery(query, lowerQuery);
        }
        else if (queryType === 'sql') {
            return this.analyzeSQLQuery(query, lowerQuery);
        }
        else {
            throw new Error(`Unsupported query type: ${queryType}`);
        }
    }
    analyzeCypherQuery(query, lowerQuery) {
        // Count various Cypher constructs
        const nodeCount = (query.match(/\([^)]*\)/g) || []).length;
        const relationshipCount = (query.match(/-\[[^\]]*\]-/g) || []).length;
        const filterCount = (query.match(/\bwhere\b/gi) || []).length;
        const aggregationCount = (query.match(/\b(count|sum|avg|max|min|collect)\s*\(/gi) || []).length;
        const joinCount = (query.match(/\bwith\b/gi) || []).length;
        const hasWildcard = lowerQuery.includes('*') || lowerQuery.includes('collect(');
        const isRead = lowerQuery.includes('match') || lowerQuery.includes('return');
        const isWrite = lowerQuery.includes('create') ||
            lowerQuery.includes('merge') ||
            lowerQuery.includes('delete') ||
            lowerQuery.includes('set');
        // Extract affected labels
        const labelMatches = query.match(/:(\w+)/g) || [];
        const affectedLabels = labelMatches.map((match) => match.substring(1));
        // Calculate complexity score
        const complexity = this.calculateComplexity({
            nodeCount,
            relationshipCount,
            filterCount,
            aggregationCount,
            joinCount,
            hasWildcard,
        });
        // Determine required indexes
        const requiredIndexes = this.analyzeRequiredIndexes(query, affectedLabels);
        return {
            complexity,
            nodeCount,
            relationshipCount,
            filterCount,
            aggregationCount,
            joinCount,
            hasWildcard,
            isRead,
            isWrite,
            affectedLabels,
            requiredIndexes,
        };
    }
    analyzeSQLQuery(query, lowerQuery) {
        // Count SQL constructs
        const joinCount = (lowerQuery.match(/\b(join|inner join|left join|right join|full join)\b/g) || []).length;
        const filterCount = (lowerQuery.match(/\bwhere\b/g) || []).length;
        const aggregationCount = (lowerQuery.match(/\b(count|sum|avg|max|min|group by)\b/g) || []).length;
        const hasWildcard = lowerQuery.includes('*');
        const isRead = lowerQuery.includes('select');
        const isWrite = lowerQuery.includes('insert') ||
            lowerQuery.includes('update') ||
            lowerQuery.includes('delete');
        // Extract table names
        const tableMatches = lowerQuery.match(/\bfrom\s+(\w+)|\bjoin\s+(\w+)/g) || [];
        const affectedLabels = tableMatches.map((match) => match.replace(/\b(from|join)\s+/g, '').trim());
        const complexity = this.calculateComplexity({
            nodeCount: affectedLabels.length,
            relationshipCount: joinCount,
            filterCount,
            aggregationCount,
            joinCount,
            hasWildcard,
        });
        const requiredIndexes = this.analyzeSQLRequiredIndexes(query, affectedLabels);
        return {
            complexity,
            nodeCount: affectedLabels.length,
            relationshipCount: joinCount,
            filterCount,
            aggregationCount,
            joinCount,
            hasWildcard,
            isRead,
            isWrite,
            affectedLabels,
            requiredIndexes,
        };
    }
    calculateComplexity(factors) {
        let score = 0;
        score += factors.nodeCount * 2;
        score += factors.relationshipCount * 3;
        score += factors.filterCount * 1;
        score += factors.aggregationCount * 4;
        score += factors.joinCount * 5;
        score += factors.hasWildcard ? 10 : 0;
        return score;
    }
    analyzeRequiredIndexes(query, labels) {
        const indexes = [];
        const lowerQuery = query.toLowerCase();
        // Common patterns that benefit from indexes
        const patterns = [
            { pattern: /where\s+(\w+)\.(\w+)\s*=/, type: 'equality' },
            { pattern: /where\s+(\w+)\.(\w+)\s*in/, type: 'in' },
            { pattern: /where\s+(\w+)\.(\w+)\s*<|>|<=|>=/, type: 'range' },
            { pattern: /order\s+by\s+(\w+)\.(\w+)/, type: 'sort' },
        ];
        for (const { pattern, type: _type } of patterns) {
            const matches = query.matchAll(pattern);
            for (const match of Array.from(matches)) {
                if (match[1] && match[2]) {
                    const label = labels.find((l) => lowerQuery.includes(l.toLowerCase()));
                    if (label) {
                        indexes.push(`${label}.${match[2]}`);
                    }
                }
            }
        }
        return Array.from(new Set(indexes)); // Remove duplicates
    }
    analyzeSQLRequiredIndexes(query, tables) {
        const indexes = [];
        const lowerQuery = query.toLowerCase();
        // Extract WHERE conditions
        const whereMatch = lowerQuery.match(/where\s+(.+?)(?:\s+(?:group by|order by|limit|$))/);
        if (whereMatch) {
            const conditions = whereMatch[1];
            const columnMatches = conditions.match(/(\w+)\.(\w+)|(\w+)\s*[=<>]/g) || [];
            for (const match of columnMatches) {
                const parts = match.split('.');
                if (parts.length === 2) {
                    indexes.push(`${parts[0]}.${parts[1]}`);
                }
                else if (tables.length === 1) {
                    indexes.push(`${tables[0]}.${parts[0].replace(/\s*[=<>].*/, '')}`);
                }
            }
        }
        // Extract ORDER BY columns
        const orderMatch = lowerQuery.match(/order\s+by\s+(.+?)(?:\s+(?:limit|$))/);
        if (orderMatch) {
            const columns = orderMatch[1].split(',');
            for (const column of columns) {
                const cleanColumn = column.trim().replace(/\s+(asc|desc).*/, '');
                if (cleanColumn.includes('.')) {
                    indexes.push(cleanColumn);
                }
                else if (tables.length === 1) {
                    indexes.push(`${tables[0]}.${cleanColumn}`);
                }
            }
        }
        return Array.from(new Set(indexes));
    }
    async generateOptimizationPlan(query, params, analysis, context) {
        const optimizations = [];
        let optimizedQuery = query;
        let estimatedCost = analysis.complexity;
        // Use Neo4j EXPLAIN if available for Cypher
        if (context.queryType === 'cypher') {
            try {
                const explainResult = await neo4j_js_1.neo.run(`EXPLAIN ${query}`, params);
                if (explainResult && explainResult.summary) {
                    // Incorporate real DB stats
                    const summary = explainResult.summary;
                    if (summary.plan) {
                        // If we have a plan, check for "AllNodesScan" or "NodeByLabelScan" which might be bad
                        // This is a simplified check.
                        const planType = summary.plan.operatorType;
                        if (planType.includes('AllNodesScan')) {
                            optimizations.push({
                                name: 'full_scan_warning',
                                type: 'index_hint',
                                description: 'Query performs a full node scan. Consider adding indexes.',
                                impact: 'high',
                                applied: false,
                                reason: 'Detected via EXPLAIN'
                            });
                        }
                    }
                }
            }
            catch (e) {
                // Ignore explain errors, fallback to heuristics
            }
        }
        // Index optimization
        if (analysis.requiredIndexes.length > 0) {
            const indexOptimization = this.generateIndexOptimization(analysis.requiredIndexes);
            optimizations.push(indexOptimization);
            if (indexOptimization.applied) {
                estimatedCost *= 0.6; // 40% cost reduction with proper indexes
            }
        }
        // Query rewriting optimizations
        if (context.queryType === 'cypher') {
            const rewriteOptimizations = this.generateCypherOptimizations(query, analysis);
            optimizations.push(...rewriteOptimizations);
            // Apply query rewrites
            for (const opt of rewriteOptimizations) {
                if (opt.applied && opt.type === 'query_rewrite') {
                    optimizedQuery = this.applyCypherRewrite(optimizedQuery, opt);
                    estimatedCost *= 0.8; // 20% cost reduction per rewrite
                }
            }
        }
        // Cache strategy
        const cacheStrategy = this.generateCacheStrategy(analysis, context);
        if (cacheStrategy.enabled) {
            optimizations.push({
                name: 'query_caching',
                type: 'cache_strategy',
                description: `Cache query results for ${cacheStrategy.ttl}s`,
                impact: 'high',
                applied: true,
            });
        }
        // Execution hints
        const executionHints = this.generateExecutionHints(analysis, context);
        return {
            originalQuery: query,
            optimizedQuery,
            indexes: analysis.requiredIndexes,
            estimatedCost,
            estimatedRows: this.estimateResultSize(analysis),
            optimizations,
            cacheStrategy,
            executionHints,
        };
    }
    generateIndexOptimization(requiredIndexes) {
        const existingIndexes = this.getAvailableIndexes(requiredIndexes);
        const missingIndexes = requiredIndexes.filter((idx) => !existingIndexes.includes(idx));
        if (missingIndexes.length === 0) {
            return {
                name: 'index_usage',
                type: 'index_hint',
                description: `Using existing indexes: ${existingIndexes.join(', ')}`,
                impact: 'high',
                applied: true,
            };
        }
        else {
            return {
                name: 'missing_indexes',
                type: 'index_hint',
                description: `Consider creating indexes: ${missingIndexes.join(', ')}`,
                impact: 'high',
                applied: false,
                reason: 'Indexes need to be created',
            };
        }
    }
    generateCypherOptimizations(query, analysis) {
        const optimizations = [];
        const lowerQuery = query.toLowerCase();
        // Avoid Cartesian products
        if (analysis.nodeCount > 2 && analysis.relationshipCount === 0) {
            optimizations.push({
                name: 'cartesian_product_warning',
                type: 'query_rewrite',
                description: 'Potential Cartesian product - consider adding relationships',
                impact: 'high',
                applied: false,
                reason: 'Manual review required',
            });
        }
        // Use LIMIT for large result sets
        if (!lowerQuery.includes('limit') && analysis.hasWildcard) {
            optimizations.push({
                name: 'add_limit',
                type: 'query_rewrite',
                description: 'Add LIMIT clause to prevent large result sets',
                impact: 'medium',
                applied: true,
            });
        }
        // Optimize aggregations
        if (analysis.aggregationCount > 0 && !lowerQuery.includes('with')) {
            optimizations.push({
                name: 'aggregation_optimization',
                type: 'query_rewrite',
                description: 'Use WITH clause to optimize aggregations',
                impact: 'medium',
                applied: true,
            });
        }
        // Filter early
        if (analysis.filterCount > 0 &&
            lowerQuery.indexOf('where') > lowerQuery.indexOf('match')) {
            optimizations.push({
                name: 'early_filtering',
                type: 'query_rewrite',
                description: 'Move filters closer to MATCH clauses',
                impact: 'medium',
                applied: true,
            });
        }
        return optimizations;
    }
    applyCypherRewrite(query, optimization) {
        let rewrittenQuery = query;
        switch (optimization.name) {
            case 'add_limit':
                if (!query.toLowerCase().includes('limit')) {
                    rewrittenQuery = query + ' LIMIT 1000';
                }
                break;
            case 'early_filtering':
                // This would require more sophisticated AST manipulation
                // For now, just return the original query
                break;
            case 'aggregation_optimization':
                // Similarly, this would need AST manipulation
                break;
        }
        return rewrittenQuery;
    }
    generateCacheStrategy(analysis, context) {
        // Don't cache write operations
        if (analysis.isWrite) {
            return { enabled: false, ttl: 0, keyPattern: '', invalidationRules: [] };
        }
        // Cache read-heavy queries with low complexity
        if (analysis.isRead && analysis.complexity < 20) {
            const ttl = this.calculateCacheTTL(analysis);
            const keyPattern = this.generateCacheKeyPattern(analysis, context);
            return {
                enabled: true,
                ttl,
                keyPattern,
                invalidationRules: this.generateInvalidationRules(analysis),
                partitionKeys: ['tenant_id', 'region'],
            };
        }
        return { enabled: false, ttl: 0, keyPattern: '', invalidationRules: [] };
    }
    calculateCacheTTL(analysis) {
        // Base TTL on query complexity and data volatility
        let ttl = 300; // 5 minutes base
        if (analysis.complexity < 10)
            ttl = 1800; // 30 minutes for simple queries
        if (analysis.aggregationCount > 0)
            ttl = 600; // 10 minutes for aggregations
        if (analysis.hasWildcard)
            ttl = 60; // 1 minute for wildcard queries
        return ttl;
    }
    generateCacheKeyPattern(analysis, context) {
        const components = [
            'query_cache',
            context.tenantId,
            context.queryType,
            ...analysis.affectedLabels.sort(),
        ];
        return components.join(':');
    }
    generateInvalidationRules(analysis) {
        // Generate cache invalidation rules based on affected labels
        return analysis.affectedLabels.map((label) => `${label}:*`);
    }
    generateExecutionHints(analysis, context) {
        const hints = [];
        // Parallel execution for complex queries
        if (analysis.complexity > 50) {
            hints.push({
                type: 'parallel',
                value: 'true',
                description: 'Enable parallel execution for complex query',
            });
        }
        // Memory hints for large aggregations
        if (analysis.aggregationCount > 2) {
            hints.push({
                type: 'memory',
                value: '2GB',
                description: 'Increase memory allocation for aggregations',
            });
        }
        // Timeout based on complexity
        const timeoutMs = Math.min(context.timeoutMs || 30000, analysis.complexity * 1000);
        hints.push({
            type: 'timeout',
            value: timeoutMs,
            description: `Set query timeout to ${timeoutMs}ms`,
        });
        return hints;
    }
    estimateResultSize(analysis) {
        // Simple heuristic for result set size estimation
        let estimate = 1;
        estimate *= Math.pow(10, analysis.nodeCount);
        estimate *= Math.pow(10, analysis.relationshipCount);
        estimate /= Math.pow(2, analysis.filterCount);
        if (analysis.aggregationCount > 0) {
            estimate /= 10; // Aggregations reduce result set size
        }
        return Math.max(1, Math.floor(estimate));
    }
    getAvailableIndexes(requiredIndexes) {
        // In a real implementation, this would query the database for existing indexes
        // For now, return a subset based on common patterns
        const commonIndexes = [
            'User.id',
            'User.email',
            'User.tenant_id',
            'Signal.id',
            'Signal.tenant_id',
            'Signal.timestamp',
            'Session.id',
            'Session.user_id',
            'Session.tenant_id',
        ];
        return requiredIndexes.filter((idx) => commonIndexes.includes(idx));
    }
    buildCacheKey(query, params, context) {
        const queryHash = crypto
            .createHash('sha256')
            .update(query + JSON.stringify(params))
            .digest('hex')
            .substring(0, 16);
        return `${this.cachePrefix}:${context.tenantId}:${context.queryType}:${queryHash}`;
    }
    async getFromCache(cacheKey) {
        try {
            const redis = (0, redis_js_1.getRedisClient)();
            const cached = await redis.get(cacheKey);
            if (cached) {
                // BOLT: Optimized cache retrieval.
                // Cached values are consistently base64-encoded compressed strings (prefixed with 0 or 1 marker).
                // Redundant JSON.parse attempt removed to avoid guaranteed-to-fail try-catch overhead.
                return compression_js_1.CompressionUtils.decompressFromString(cached);
            }
            return null;
        }
        catch (error) {
            console.error('Query optimizer cache read error:', error);
            return null;
        }
    }
    async cacheOptimization(cacheKey, plan) {
        try {
            const redis = (0, redis_js_1.getRedisClient)();
            const serialized = await compression_js_1.CompressionUtils.compressToString(plan);
            await redis.set(cacheKey, serialized, 'EX', this.defaultTTL);
        }
        catch (error) {
            console.error('Query optimizer cache write error:', error);
        }
    }
    initializeIndexHints() {
        // Initialize common index hints
        this.indexHints.set('User', ['id', 'email', 'tenant_id']);
        this.indexHints.set('Signal', ['id', 'tenant_id', 'timestamp']);
        this.indexHints.set('Session', ['id', 'user_id', 'tenant_id']);
    }
    loadOptimizationPatterns() {
        // Load common query optimization patterns
        // This could be loaded from a configuration file or database
    }
    async getOptimizationStats(tenantId) {
        // Return optimization statistics
        return {
            totalOptimizations: 0,
            cacheHitRate: 0,
            averageOptimizationTime: 0,
            topOptimizations: [],
        };
    }
    async clearOptimizationCache(tenantId, pattern) {
        const clearPattern = pattern ||
            (tenantId
                ? `${this.cachePrefix}:${tenantId}:*`
                : `${this.cachePrefix}:*`);
        logger_js_1.logger.info('Clearing query optimization cache:', { pattern: clearPattern });
        const redis = (0, redis_js_1.getRedisClient)();
        // Use SCAN instead of KEYS to avoid blocking Redis
        const stream = redis.scanStream({
            match: clearPattern,
            count: 100
        });
        stream.on('data', async (keys) => {
            if (keys.length) {
                await redis.del(...keys);
            }
        });
        stream.on('end', () => {
            logger_js_1.logger.info('Cache clear complete');
        });
    }
}
exports.QueryOptimizer = QueryOptimizer;
exports.queryOptimizer = new QueryOptimizer();

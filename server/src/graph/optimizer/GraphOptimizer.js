"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.graphOptimizer = exports.GraphOptimizer = void 0;
const QueryAnalyzer_js_1 = require("./QueryAnalyzer.js");
const QueryRewriter_js_1 = require("./QueryRewriter.js");
const QueryCache_js_1 = require("./QueryCache.js");
const QueryCostEstimator_js_1 = require("./QueryCostEstimator.js");
const IndexAdvisor_js_1 = require("./IndexAdvisor.js");
const neo4j_js_1 = require("../../db/neo4j.js");
const BatchQueryExecutor_js_1 = require("./BatchQueryExecutor.js");
const QueryProfiler_js_1 = require("./QueryProfiler.js");
const ParallelExecutor_js_1 = require("./ParallelExecutor.js");
const parser_js_1 = require("../dsl/parser.js");
const execution_js_1 = require("../dsl/execution.js");
class GraphOptimizer {
    analyzer = new QueryAnalyzer_js_1.QueryAnalyzer();
    rewriter = new QueryRewriter_js_1.QueryRewriter();
    cache = new QueryCache_js_1.QueryCache();
    costEstimator = new QueryCostEstimator_js_1.QueryCostEstimator();
    indexAdvisor = new IndexAdvisor_js_1.IndexAdvisor();
    batchExecutor = new BatchQueryExecutor_js_1.BatchQueryExecutor();
    parallelExecutor = new ParallelExecutor_js_1.ParallelExecutor();
    dslParser = new parser_js_1.DSLParser();
    async optimize(query, params, context, profiler) {
        profiler?.start('planning');
        // Handle Custom DSL
        let targetQuery = query;
        let targetParams = params;
        if (context.queryType === 'dsl') {
            profiler?.start('parsing');
            const parsed = this.dslParser.parse(query);
            profiler?.end('parsing');
            const converted = (0, execution_js_1.buildCypherFromDSL)(parsed, context.tenantId);
            targetQuery = converted.cypher;
            targetParams = { ...params, ...converted.params };
        }
        const analysis = this.analyzer.analyze(targetQuery, context);
        profiler?.start('optimization');
        const { optimizedQuery, optimizations } = this.rewriter.rewrite(targetQuery, analysis);
        const cost = this.costEstimator.estimate(analysis);
        const indexRecommendation = this.indexAdvisor.recommend(analysis.requiredIndexes);
        if (indexRecommendation.name === 'missing_indexes') {
            optimizations.push(indexRecommendation);
        }
        const cacheStrategy = this.cache.generateStrategy(analysis, context);
        profiler?.end('optimization');
        profiler?.end('planning');
        return {
            originalQuery: query,
            optimizedQuery,
            indexes: analysis.requiredIndexes,
            estimatedCost: cost.cost,
            estimatedRows: cost.rows,
            optimizations,
            cacheStrategy,
            executionHints: [] // Populate with heuristics if needed
        };
    }
    async executeCached(query, params, context, executeFn) {
        const profiler = new QueryProfiler_js_1.QueryProfiler(context.tenantId + Date.now());
        profiler.start('total');
        // 1. Optimize
        const plan = await this.optimize(query, params, context, profiler);
        // 2. Check Cache
        if (plan.cacheStrategy?.enabled) {
            const key = this.cache.generateKey(plan.optimizedQuery, params, context); // Use optimized query for cache key consistency
            const cached = await this.cache.get(key);
            if (cached) {
                // telemetry.subsystems.database.cache.hits.add(1);
                profiler.end('total');
                return { result: cached, profile: profiler.getProfile() };
            }
            // telemetry.subsystems.database.cache.misses.add(1);
        }
        // 3. Execute
        profiler.start('execution');
        const rawResult = await executeFn(plan.optimizedQuery, params);
        profiler.end('execution');
        // 4. Normalize
        const normalized = (0, neo4j_js_1.transformNeo4jIntegers)(rawResult);
        // 5. Write Cache
        if (plan.cacheStrategy?.enabled) {
            const key = this.cache.generateKey(plan.optimizedQuery, params, context);
            // Fire and forget
            this.cache.set(key, normalized, plan.cacheStrategy.ttl).catch(() => { });
        }
        profiler.end('total');
        return { result: normalized, profile: profiler.getProfile() };
    }
    executeBatch(query, params) {
        return this.batchExecutor.execute(query, params);
    }
    executeParallel(queries) {
        return this.parallelExecutor.executeParallel(queries);
    }
    async invalidate(tenantId, labels) {
        await this.cache.invalidate(tenantId, labels);
    }
}
exports.GraphOptimizer = GraphOptimizer;
exports.graphOptimizer = new GraphOptimizer();

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryExecutionService = exports.QueryExecutionService = void 0;
const neo4j_js_1 = require("../db/neo4j.js");
const logger_js_1 = require("../config/logger.js");
const graphTenantScope_js_1 = require("./graphTenantScope.js");
class QueryExecutionService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!QueryExecutionService.instance) {
            QueryExecutionService.instance = new QueryExecutionService();
        }
        return QueryExecutionService.instance;
    }
    /**
     * Executes a Cypher query in "Sandbox Mode" (Read-Only, Limited).
     */
    async executeSandbox(cypher, params = {}, options) {
        const { tenantId, rowLimit = 50, timeoutMs = 5000 } = options;
        // 1. Quota Check (Placeholder)
        // 2. Safety Checks
        this.validateSafety(cypher);
        // 3. Enforce Limits
        const safeCypher = this.enforceLimits(cypher, rowLimit);
        const scoped = await (0, graphTenantScope_js_1.enforceTenantScopeForCypher)(safeCypher, params, {
            tenantId,
            action: 'graph.read',
            resource: 'graph.sandbox.query',
        });
        const driver = (0, neo4j_js_1.getNeo4jDriver)();
        // Use READ session
        const session = driver.session({
            defaultAccessMode: 'READ',
            database: 'neo4j',
        });
        try {
            const result = await session.run(scoped.cypher, scoped.params, {
                timeout: timeoutMs,
            });
            const records = result.records.map((r) => r.toObject());
            const summary = result.summary;
            return {
                records,
                summary: {
                    query: summary.query.text,
                    parameters: summary.query.parameters,
                    executionTimeMs: summary.resultConsumedAfter.toNumber(),
                    resultAvailableAfterMs: summary.resultAvailableAfter.toNumber(),
                },
                truncated: records.length >= rowLimit,
            };
        }
        catch (error) {
            logger_js_1.logger.error({ error, cypher, tenantId }, 'Sandbox Query Failed');
            throw new Error(`Query Execution Failed: ${error.message}`);
        }
        finally {
            await session.close();
        }
    }
    validateSafety(cypher) {
        const upperCypher = cypher.toUpperCase();
        if (/\b(CREATE|MERGE|DELETE|SET|REMOVE|DROP)\b/i.test(upperCypher)) {
            throw new Error('Write operations are not allowed in Query Studio.');
        }
    }
    enforceLimits(cypher, limit) {
        const limitRegex = /\bLIMIT\s+(\d+)/i;
        const match = cypher.match(limitRegex);
        if (match) {
            const userLimit = parseInt(match[1], 10);
            if (userLimit > limit) {
                // Replace user limit with safe limit
                return cypher.replace(limitRegex, `LIMIT ${limit}`);
            }
            return cypher;
        }
        return `${cypher} LIMIT ${limit}`;
    }
}
exports.QueryExecutionService = QueryExecutionService;
exports.queryExecutionService = QueryExecutionService.getInstance();

/**
 * IntelGraph GA-Core Cypher Sandbox
 * Committee Requirement: Cost limits, authority binding, query safety
 *
 * Implements secure Cypher query execution with committee-mandated controls
 */
import logger from '../utils/logger.js';
export class CypherSandbox {
    config;
    constructor(config) {
        this.config = {
            maxExecutionTime: 30000, // 30 seconds
            maxNodesReturned: 10000,
            maxRelationshipsReturned: 50000,
            costLimit: 1000000, // Committee requirement: Cost limits
            allowedOperations: [
                'MATCH',
                'WHERE',
                'RETURN',
                'WITH',
                'ORDER BY',
                'LIMIT',
                'SKIP',
                'UNWIND',
                'COLLECT',
                'COUNT',
                'DISTINCT',
                'AS',
                'AND',
                'OR',
                'NOT',
                'IN',
            ],
            blockedPatterns: [
                /apoc\./i, // Block APOC procedures
                /call\s+db\./i, // Block database procedures
                /create\s+constraint/i, // Block schema changes
                /drop\s+constraint/i, // Block schema changes
                /create\s+index/i, // Block index creation
                /drop\s+index/i, // Block index deletion
                /load\s+csv/i, // Block CSV loading
                /periodic\s+commit/i, // Block batch operations
                /foreach/i, // Block loops
                /call\s*\{.*\}/i, // Block subquery calls
                /;\s*match/i, // Block query chaining
                /union\s+all/i, // Block union operations
            ],
            ...config,
        };
    }
    // Committee requirement: Query analysis and cost estimation
    analyzeQuery(query) {
        const normalizedQuery = query.toLowerCase().trim();
        const analysis = {
            estimatedCost: 0,
            operations: [],
            returnsNodes: false,
            returnsRelationships: false,
            hasWrites: false,
            securityRisks: [],
        };
        // Extract operations
        const operations = normalizedQuery.match(/\b(match|create|merge|delete|set|remove|detach)\b/g) || [];
        analysis.operations = [...new Set(operations)];
        // Check for write operations (Committee security requirement)
        analysis.hasWrites = /\b(create|merge|delete|set|remove|detach)\b/i.test(query);
        // Check return patterns
        analysis.returnsNodes = /return.*\([^)]*\)/i.test(query);
        analysis.returnsRelationships = /return.*\[[^\]]*\]/i.test(query);
        // Cost estimation (simplified)
        let cost = 100; // Base cost
        // Pattern matching costs
        const matchCount = (normalizedQuery.match(/match/g) || []).length;
        cost += matchCount * 1000;
        // Cartesian product risk
        if (matchCount > 1 && !/where/i.test(query)) {
            cost += 50000;
            analysis.securityRisks.push('Potential cartesian product without WHERE clause');
        }
        // No LIMIT clause on large operations
        if (matchCount > 0 && !/limit\s+\d+/i.test(query)) {
            cost += 10000;
            analysis.securityRisks.push('No LIMIT clause - potential large result set');
        }
        // Complex path patterns
        if (/\*\d*\.\.\d*/.test(query)) {
            cost += 25000;
            analysis.securityRisks.push('Variable length path pattern detected');
        }
        analysis.estimatedCost = cost;
        return analysis;
    }
    // Committee requirement: Authority-based query validation
    validateAuthority(query, userClearance) {
        const analysis = this.analyzeQuery(query);
        // Write operations require higher clearance
        if (analysis.hasWrites && userClearance < 3) {
            return {
                valid: false,
                reason: 'Write operations require clearance level 3 or higher',
            };
        }
        // High-cost queries require administrative clearance
        if (analysis.estimatedCost > this.config.costLimit && userClearance < 4) {
            return {
                valid: false,
                reason: `High-cost query (${analysis.estimatedCost}) requires administrative clearance`,
            };
        }
        // Dangerous patterns require maximum clearance
        if (analysis.securityRisks.length > 2 && userClearance < 5) {
            return {
                valid: false,
                reason: 'Query contains multiple security risks requiring maximum clearance',
            };
        }
        return { valid: true };
    }
    // Committee requirement: Query sanitization
    sanitizeQuery(query) {
        let sanitized = query.trim();
        // Remove comments that could hide malicious code
        sanitized = sanitized.replace(/\/\*[\s\S]*?\*\//g, '');
        sanitized = sanitized.replace(/\/\/.*$/gm, '');
        // Normalize whitespace
        sanitized = sanitized.replace(/\s+/g, ' ');
        // Add LIMIT if missing and query is potentially expensive
        if (!/limit\s+\d+/i.test(sanitized) && /match/i.test(sanitized)) {
            const maxLimit = Math.min(this.config.maxNodesReturned, 1000);
            sanitized += ` LIMIT ${maxLimit}`;
            logger.info({
                message: 'Auto-added LIMIT to query for safety',
                limit: maxLimit,
            });
        }
        return sanitized;
    }
    // Main sandbox execution validation
    validateQuery(query, userClearance = 1, authorityBindings = []) {
        const analysis = this.analyzeQuery(query);
        // Check blocked patterns (Committee security requirement)
        for (const pattern of this.config.blockedPatterns) {
            if (pattern.test(query)) {
                logger.warn({
                    message: 'Blocked query pattern detected',
                    pattern: pattern.source,
                    query: query.substring(0, 100),
                });
                return {
                    allowed: false,
                    reason: `Query contains blocked pattern: ${pattern.source}`,
                    analysis,
                };
            }
        }
        // Check for disallowed operations
        const disallowedOps = analysis.operations.filter((op) => !this.config.allowedOperations
            .map((allowed) => allowed.toLowerCase())
            .includes(op));
        if (disallowedOps.length > 0) {
            return {
                allowed: false,
                reason: `Disallowed operations: ${disallowedOps.join(', ')}`,
                analysis,
            };
        }
        // Committee requirement: Cost limiting
        if (analysis.estimatedCost > this.config.costLimit) {
            return {
                allowed: false,
                reason: `Query cost (${analysis.estimatedCost}) exceeds limit (${this.config.costLimit})`,
                analysis,
            };
        }
        // Authority validation
        const authorityCheck = this.validateAuthority(query, userClearance);
        if (!authorityCheck.valid) {
            return {
                allowed: false,
                reason: authorityCheck.reason,
                analysis,
            };
        }
        // Write operations require additional authority
        if (analysis.hasWrites && !authorityBindings.includes('ADMIN_AUTH')) {
            return {
                allowed: false,
                reason: 'Write operations require ADMIN_AUTH authority binding',
                analysis,
            };
        }
        const sanitizedQuery = this.sanitizeQuery(query);
        logger.info({
            message: 'Cypher query validated and sanitized',
            originalLength: query.length,
            sanitizedLength: sanitizedQuery.length,
            estimatedCost: analysis.estimatedCost,
            operations: analysis.operations,
            userClearance,
        });
        return {
            allowed: true,
            query: sanitizedQuery,
            sanitizedQuery,
            analysis,
        };
    }
    // Committee requirement: Execution monitoring
    createExecutionWrapper() {
        return {
            execute: async (query, params = {}) => {
                const startTime = Date.now();
                try {
                    // This would integrate with actual Neo4j driver
                    // const result = await neo4jSession.run(query, params);
                    const duration = Date.now() - startTime;
                    // Committee requirement: Performance monitoring
                    if (duration > this.config.maxExecutionTime) {
                        logger.error({
                            message: 'Query execution timeout',
                            duration,
                            maxTime: this.config.maxExecutionTime,
                            query: query.substring(0, 100),
                        });
                        throw new Error(`Query execution timeout: ${duration}ms > ${this.config.maxExecutionTime}ms`);
                    }
                    logger.info({
                        message: 'Query executed successfully',
                        duration,
                        query: query.substring(0, 50),
                    });
                    // Return mock result for now
                    return { records: [], summary: { resultAvailableAfter: duration } };
                }
                catch (error) {
                    logger.error({
                        message: 'Query execution failed',
                        error: error instanceof Error ? error.message : String(error),
                        query: query.substring(0, 100),
                    });
                    throw error;
                }
            },
        };
    }
}
// Express middleware for Cypher sandbox
export const cypherSandboxMiddleware = (req, res, next) => {
    const sandbox = new CypherSandbox();
    const { query, params = {} } = req.body;
    if (!query) {
        return res.status(400).json({
            error: 'Query required',
            code: 'QUERY_REQUIRED',
        });
    }
    const user = req.user || {};
    const clearance = user.clearance_level || 1;
    const authorities = user.authority_bindings?.map((auth) => auth.type) || [];
    const validation = sandbox.validateQuery(query, clearance, authorities);
    if (!validation.allowed) {
        logger.warn({
            message: 'Cypher query blocked by sandbox',
            reason: validation.reason,
            user_id: user.id,
            query: query.substring(0, 100),
        });
        return res.status(403).json({
            error: 'Query blocked by security sandbox',
            reason: validation.reason,
            analysis: validation.analysis,
            code: 'QUERY_BLOCKED',
        });
    }
    // Attach validated query and execution wrapper to request
    req.sanitized_query = validation.sanitizedQuery;
    req.query_analysis = validation.analysis;
    req.cypher_executor = sandbox.createExecutionWrapper();
    next();
};
export default {
    CypherSandbox,
    cypherSandboxMiddleware,
};
//# sourceMappingURL=cypher-sandbox.js.map
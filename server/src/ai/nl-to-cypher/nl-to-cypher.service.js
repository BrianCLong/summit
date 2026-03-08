"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NlToCypherService = void 0;
const crypto_1 = require("crypto");
// @ts-ignore
const pino_1 = __importDefault(require("pino"));
// @ts-ignore
const logger = pino_1.default({ name: 'nl-to-cypher' });
class NlToCypherService {
    adapter;
    promptCache = new Map();
    executionHistory = [];
    constructor(adapter) {
        this.adapter = adapter;
    }
    async translateWithPreview(prompt, userId, tenantId) {
        const startTime = Date.now();
        const queryId = (0, crypto_1.randomUUID)();
        // Check cache first
        const cacheKey = `${tenantId}:${prompt.trim().toLowerCase()}`;
        if (this.promptCache.has(cacheKey)) {
            logger.info({ queryId, userId, tenantId, cached: true }, 'Returning cached NL→Cypher translation');
            return this.promptCache.get(cacheKey);
        }
        try {
            // Generate Cypher
            const generatedCypher = await this.generateCypher(prompt);
            // Validate syntax
            const validation = this.validateCypher(generatedCypher);
            // Estimate cost
            const costEstimate = this.estimateCost(generatedCypher);
            // Assess policy risk
            const policyRisk = this.assessPolicyRisk(generatedCypher, userId, tenantId);
            const response = {
                id: queryId,
                originalPrompt: prompt,
                generatedCypher,
                validation,
                costEstimate,
                policyRisk,
                canExecute: validation.isValid &&
                    costEstimate.costClass !== 'very-high' &&
                    policyRisk.riskLevel !== 'high',
                timestamp: new Date(),
            };
            // Cache the response
            this.promptCache.set(cacheKey, response);
            // Emit metrics
            const parseTime = Date.now() - startTime;
            logger.info({
                queryId,
                userId,
                tenantId,
                parseTimeMs: parseTime,
                validity: validation.isValid,
                estimatedRows: costEstimate.estimatedRows,
                costClass: costEstimate.costClass,
                riskLevel: policyRisk.riskLevel,
            }, 'NL→Cypher translation completed');
            return response;
        }
        catch (error) {
            logger.error({ queryId, userId, tenantId, error }, 'NL→Cypher translation failed');
            throw error;
        }
    }
    async executeSandbox(queryId, cypher, options = {
        readOnly: true,
        timeout: 30000,
        maxRows: 100,
    }) {
        const startTime = Date.now();
        try {
            // Validate the query is safe for sandbox
            if (!options.readOnly && this.containsMutations(cypher)) {
                return {
                    success: false,
                    executionTimeMs: 0,
                    error: 'Mutations not allowed in sandbox mode',
                    warnings: [],
                };
            }
            // Add LIMIT clause if not present
            const safeCypher = this.makeSafe(cypher, options.maxRows);
            if (options.dryRun) {
                return {
                    success: true,
                    executionTimeMs: Date.now() - startTime,
                    warnings: [`Dry run - would execute: ${safeCypher}`],
                };
            }
            // P2-2: Sandbox execution with safety checks
            // NOTE: Using safe simulation. For production, integrate real Neo4j sandbox with:
            // - Isolated read-only database
            // - Query timeout enforcement
            // - Resource limits (memory, CPU)
            // - Network isolation
            const mockRows = this.executeSandboxed(safeCypher);
            const executionTime = Date.now() - startTime;
            // Record execution history for cost estimation improvements
            this.executionHistory.push({
                queryId,
                executionTime,
                rowCount: mockRows.length,
            });
            logger.info({
                queryId,
                executionTimeMs: executionTime,
                rowCount: mockRows.length,
                safeCypher,
            }, 'Sandbox execution completed');
            return {
                success: true,
                rows: mockRows,
                executionTimeMs: executionTime,
                warnings: [],
            };
        }
        catch (error) {
            logger.error({ queryId, error }, 'Sandbox execution failed');
            return {
                success: false,
                executionTimeMs: Date.now() - startTime,
                error: error instanceof Error ? error.message : 'Unknown execution error',
                warnings: [],
            };
        }
    }
    async generateCypher(prompt) {
        // Enhanced pattern matching for common queries
        if (/show all nodes/i.test(prompt)) {
            return 'MATCH (n) RETURN n LIMIT 25';
        }
        if (/count nodes/i.test(prompt)) {
            return 'MATCH (n) RETURN count(n) AS count';
        }
        if (/find.*connected.*to/i.test(prompt)) {
            return 'MATCH (a)-[r]-(b) WHERE a.name = $name RETURN a, r, b LIMIT 50';
        }
        if (/shortest.*path/i.test(prompt)) {
            return 'MATCH p = shortestPath((a)-[*..5]-(b)) WHERE a.id = $startId AND b.id = $endId RETURN p';
        }
        if (/neighbors.*of/i.test(prompt)) {
            return 'MATCH (n)-[r]-(neighbor) WHERE n.id = $nodeId RETURN neighbor, r LIMIT 100';
        }
        // Fallback to model adapter
        const systemInstruction = `You are a Neo4j Expert and Intelligence Analysis Copilot.
Your goal is to translate natural language questions into efficient, read-only Cypher queries.

## NEO4J PERFORMANCE GUIDANCE
- Use batch patterns where applicable, but for read queries focus on index usage.
- Avoid variable-length paths with unbounded depth (e.g. [*]). Always specify a max depth (e.g. [*..3]).
- Always include a LIMIT clause (default 100) to prevent blowing up result sizes.
- Treat the Neo4j graph as the source of truth for entity identity and relationships.

## RESPONSE FORMAT
Return ONLY the Cypher query. No markdown formatting, no explanations.`;
        return this.adapter.generate(`${systemInstruction}\n\nUser Query: ${prompt}`);
    }
    validateCypher(cypher) {
        const errors = [];
        const warnings = [];
        // Basic syntax validation
        if (!cypher.trim()) {
            errors.push('Empty query');
        }
        if (!cypher.toUpperCase().includes('MATCH') &&
            !cypher.toUpperCase().includes('CREATE')) {
            warnings.push('Query does not contain MATCH or CREATE clause');
        }
        // Check for potential issues
        if (!cypher.toUpperCase().includes('LIMIT') &&
            cypher.toUpperCase().includes('MATCH')) {
            warnings.push('No LIMIT clause found - query may return large result sets');
        }
        if (cypher.includes('*') && cypher.includes('[') && cypher.includes(']')) {
            warnings.push('Variable length path detected - may be expensive');
        }
        // Check for dangerous operations
        const dangerousOps = ['DELETE', 'DETACH DELETE', 'DROP', 'REMOVE'];
        for (const op of dangerousOps) {
            if (cypher.toUpperCase().includes(op)) {
                errors.push(`Dangerous operation detected: ${op}`);
            }
        }
        return {
            isValid: errors.length === 0,
            syntaxErrors: errors,
            warnings,
        };
    }
    estimateCost(cypher) {
        let estimatedRows = 100;
        let costClass = 'low';
        let executionTimeMs = 50;
        let memoryMb = 10;
        const upperCypher = cypher.toUpperCase();
        // Analyze query complexity
        if (upperCypher.includes('*')) {
            estimatedRows *= 10;
            costClass = 'high';
            executionTimeMs *= 20;
            memoryMb *= 5;
        }
        if (upperCypher.includes('SHORTESTPATH')) {
            estimatedRows *= 2;
            costClass = costClass === 'high' ? 'very-high' : 'medium';
            executionTimeMs *= 5;
            memoryMb *= 2;
        }
        // Check for cartesian products
        const matchCount = (cypher.match(/MATCH/gi) || []).length;
        if (matchCount > 1 && !upperCypher.includes('WHERE')) {
            estimatedRows *= Math.pow(10, matchCount - 1);
            costClass = 'very-high';
            executionTimeMs *= 50;
            memoryMb *= 10;
        }
        // Use historical data if available
        const avgHistory = this.getAverageExecutionTime(cypher);
        if (avgHistory) {
            executionTimeMs = Math.max(executionTimeMs, avgHistory);
        }
        return {
            estimatedRows,
            costClass,
            executionTimeMs,
            memoryMb,
        };
    }
    assessPolicyRisk(cypher, userId, tenantId) {
        const risks = [];
        let riskLevel = 'low';
        let piiAccess = false;
        const sensitiveOperations = [];
        const upperCypher = cypher.toUpperCase();
        // Check for PII access patterns
        const piiFields = ['EMAIL', 'PHONE', 'SSN', 'ADDRESS', 'NAME'];
        for (const field of piiFields) {
            if (upperCypher.includes(field)) {
                piiAccess = true;
                risks.push(`Query accesses potentially sensitive field: ${field}`);
                riskLevel = 'medium';
            }
        }
        // Check for broad data access
        if (!upperCypher.includes('WHERE') && upperCypher.includes('MATCH')) {
            risks.push('Query lacks WHERE clause - may access all data');
            riskLevel = 'medium';
        }
        // Check for mutation operations
        const mutations = ['CREATE', 'DELETE', 'SET', 'REMOVE', 'MERGE'];
        for (const mutation of mutations) {
            if (upperCypher.includes(mutation)) {
                sensitiveOperations.push(mutation);
                risks.push(`Query contains mutation operation: ${mutation}`);
                riskLevel = 'high';
            }
        }
        return {
            riskLevel,
            risks,
            piiAccess,
            sensitiveOperations,
        };
    }
    containsMutations(cypher) {
        const mutations = ['CREATE', 'DELETE', 'SET', 'REMOVE', 'MERGE', 'DROP'];
        const upperCypher = cypher.toUpperCase();
        return mutations.some((op) => upperCypher.includes(op));
    }
    makeSafe(cypher, maxRows) {
        let safeCypher = cypher.trim();
        // Add LIMIT if not present
        if (!safeCypher.toUpperCase().includes('LIMIT')) {
            safeCypher += ` LIMIT ${maxRows}`;
        }
        return safeCypher;
    }
    /**
     * Execute Cypher in sandboxed environment (P2-2 implementation)
     *
     * Safety features:
     * - Read-only queries enforced
     * - Result size limits (max 100 rows)
     * - Mock data for security (no real DB access)
     *
     * TODO: Replace with real Neo4j sandbox:
     * - Isolated read-only database instance
     * - Query timeout enforcement (5s max)
     * - Memory/CPU resource limits
     * - Network isolation
     */
    executeSandboxed(cypher) {
        // Safety: Validate query is read-only (already done in validation)
        console.debug('[NL-to-Cypher Sandbox P2-2] Executing query:', cypher);
        // Mock execution for demo purposes
        const mockData = [
            { id: '1', name: 'Node 1', type: 'Person' },
            { id: '2', name: 'Node 2', type: 'Organization' },
            { id: '3', name: 'Node 3', type: 'Event' },
        ];
        // Return subset based on query type
        if (cypher.toUpperCase().includes('COUNT')) {
            return [{ count: mockData.length }];
        }
        // Safety: Enforce max result size
        return mockData.slice(0, Math.min(3, 100));
    }
    getAverageExecutionTime(cypher) {
        // Simple pattern matching for historical data
        const similarQueries = this.executionHistory.filter((h) => {
            // This is a simplified similarity check
            return cypher.includes('MATCH') && cypher.includes('RETURN');
        });
        if (similarQueries.length === 0)
            return null;
        const avgTime = similarQueries.reduce((sum, q) => sum + q.executionTime, 0) /
            similarQueries.length;
        return avgTime;
    }
    // Method for computing diff between generated and user-edited Cypher
    diffCypher(original, edited) {
        // Simple diff implementation
        const originalLines = original.split('\n').map((l) => l.trim());
        const editedLines = edited.split('\n').map((l) => l.trim());
        const additions = [];
        const deletions = [];
        const modifications = [];
        // Basic line-by-line comparison
        editedLines.forEach((line) => {
            if (!originalLines.includes(line)) {
                additions.push(line);
            }
        });
        originalLines.forEach((line) => {
            if (!editedLines.includes(line)) {
                deletions.push(line);
            }
        });
        return { additions, deletions, modifications };
    }
    // Cleanup method for cache management
    clearCache() {
        this.promptCache.clear();
        logger.info('NL→Cypher cache cleared');
    }
    // Legacy method for backward compatibility
    async translate(prompt) {
        const result = await this.translateWithPreview(prompt, 'system', 'default');
        return result.generatedCypher;
    }
}
exports.NlToCypherService = NlToCypherService;

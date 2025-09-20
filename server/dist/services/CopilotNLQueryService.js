/**
 * CopilotNLQueryService - Natural Language to Cypher Translation
 * Provides preview functionality with guardrails for GA Core
 */
export class CopilotNLQueryService {
    /**
     * Convert natural language query to Cypher with guardrails
     * This is a preview implementation for GA Core
     */
    async translateToVypher(request) {
        // Basic guardrails - only allow safe read operations
        const safePatterns = ['MATCH', 'RETURN', 'WHERE', 'WITH'];
        // Simple pattern matching for MVP
        const { query } = request;
        if (query.toLowerCase().includes('find') || query.toLowerCase().includes('show')) {
            return {
                cypher: 'MATCH (n) RETURN n LIMIT 10',
                explanation: `Generated safe Cypher for: "${query}"`,
                confidence: 0.7,
                preview: true,
            };
        }
        return {
            cypher: 'MATCH (n) RETURN count(n) as total_nodes',
            explanation: 'Default safe query - preview mode',
            confidence: 0.5,
            preview: true,
        };
    }
    /**
     * Validate query is safe for execution
     */
    validateSafety(cypher) {
        const dangerous = ['DELETE', 'CREATE', 'SET', 'REMOVE', 'MERGE'];
        return !dangerous.some((op) => cypher.toUpperCase().includes(op));
    }
}
//# sourceMappingURL=CopilotNLQueryService.js.map
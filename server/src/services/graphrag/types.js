"use strict";
/**
 * Evidence-First GraphRAG Types
 *
 * Detected Stack:
 * - TypeScript/Node.js backend
 * - Neo4j graph database (src/graph/neo4j.ts)
 * - PostgreSQL/TimescaleDB for structured data
 * - Existing provenance ledger (src/services/provenance-ledger.ts)
 * - Policy service with classification levels (src/services/policy.ts)
 *
 * This service is mounted at: src/services/graphrag/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoEvidenceError = exports.PolicyViolationError = exports.CitationValidationError = exports.GraphRagError = void 0;
// =============================================================================
// 13. Error Types
// =============================================================================
class GraphRagError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'GraphRagError';
    }
}
exports.GraphRagError = GraphRagError;
class CitationValidationError extends GraphRagError {
    constructor(message, details) {
        super(message, 'CITATION_VALIDATION_FAILED', details);
        this.name = 'CitationValidationError';
    }
}
exports.CitationValidationError = CitationValidationError;
class PolicyViolationError extends GraphRagError {
    constructor(message, details) {
        super(message, 'POLICY_VIOLATION', details);
        this.name = 'PolicyViolationError';
    }
}
exports.PolicyViolationError = PolicyViolationError;
class NoEvidenceError extends GraphRagError {
    constructor(message, details) {
        super(message, 'NO_EVIDENCE_AVAILABLE', details);
        this.name = 'NoEvidenceError';
    }
}
exports.NoEvidenceError = NoEvidenceError;

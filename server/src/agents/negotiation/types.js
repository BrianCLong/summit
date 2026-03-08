"use strict";
/**
 * Multi-Agent Negotiation Types
 *
 * Type definitions for the negotiation runtime.
 * All types conform to the Negotiation Protocol.
 *
 * @module agents/negotiation/types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NegotiationError = exports.DEFAULT_SCORING_WEIGHTS = void 0;
exports.DEFAULT_SCORING_WEIGHTS = {
    feasibility: 0.25,
    compliance: 0.3,
    costBenefit: 0.2,
    riskMitigation: 0.15,
    stakeholderAlignment: 0.1,
};
// ============================================================================
// Errors
// ============================================================================
class NegotiationError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'NegotiationError';
    }
}
exports.NegotiationError = NegotiationError;

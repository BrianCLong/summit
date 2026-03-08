"use strict";
/**
 * Type definitions for Prov-Ledger Service Client
 * Shared types for communicating with the provenance and claims ledger
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvLedgerError = void 0;
// ============================================================================
// Error Types
// ============================================================================
class ProvLedgerError extends Error {
    statusCode;
    code;
    constructor(message, statusCode, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'ProvLedgerError';
    }
}
exports.ProvLedgerError = ProvLedgerError;

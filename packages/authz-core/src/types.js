"use strict";
/**
 * Core Authorization Types
 * Comprehensive type definitions for multi-tenant authorization with warrant and license enforcement
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LicenseError = exports.WarrantError = exports.AuthorizationError = void 0;
// ============================================================================
// Error Types
// ============================================================================
class AuthorizationError extends Error {
    code;
    statusCode;
    details;
    constructor(message, code, statusCode = 403, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'AuthorizationError';
    }
}
exports.AuthorizationError = AuthorizationError;
class WarrantError extends Error {
    code;
    statusCode;
    details;
    constructor(message, code, statusCode = 403, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'WarrantError';
    }
}
exports.WarrantError = WarrantError;
class LicenseError extends Error {
    code;
    statusCode;
    details;
    constructor(message, code, statusCode = 403, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'LicenseError';
    }
}
exports.LicenseError = LicenseError;

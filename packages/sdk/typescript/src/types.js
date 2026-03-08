"use strict";
/**
 * Summit SDK Types
 *
 * Core type definitions for the Summit SDK.
 *
 * SOC 2 Controls: CC6.1 (Access Control), CC7.1 (System Operations)
 *
 * @module @summit/sdk/types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummitError = void 0;
/**
 * Summit SDK error
 */
class SummitError extends Error {
    code;
    statusCode;
    requestId;
    details;
    constructor(message, code, statusCode, requestId, details) {
        super(message);
        this.name = 'SummitError';
        this.code = code;
        this.statusCode = statusCode;
        this.requestId = requestId;
        this.details = details;
    }
}
exports.SummitError = SummitError;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractError = exports.ErrorCode = void 0;
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ErrorCode["NOT_FOUND"] = "NOT_FOUND";
    ErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    ErrorCode["FORBIDDEN"] = "FORBIDDEN";
    ErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
    ErrorCode["SERVICE_UNAVAILABLE"] = "SERVICE_UNAVAILABLE";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
class ContractError extends Error {
    code;
    details;
    timestamp;
    constructor(message, code = ErrorCode.INTERNAL_ERROR, details) {
        super(message);
        this.name = 'ContractError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            details: this.details,
            timestamp: this.timestamp,
        };
    }
}
exports.ContractError = ContractError;

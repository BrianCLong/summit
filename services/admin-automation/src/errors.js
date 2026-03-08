"use strict";
/**
 * Custom error types for admin automation service.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseError = exports.AutoResolveError = exports.ServiceNeedNotFoundError = exports.ProfileValidationError = exports.CitizenNotFoundError = exports.AdminAutomationError = void 0;
exports.isAdminAutomationError = isAdminAutomationError;
exports.withErrorHandling = withErrorHandling;
class AdminAutomationError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'AdminAutomationError';
    }
}
exports.AdminAutomationError = AdminAutomationError;
class CitizenNotFoundError extends AdminAutomationError {
    constructor(citizenId) {
        super(`Citizen not found: ${citizenId}`, 'CITIZEN_NOT_FOUND', { citizenId });
        this.name = 'CitizenNotFoundError';
    }
}
exports.CitizenNotFoundError = CitizenNotFoundError;
class ProfileValidationError extends AdminAutomationError {
    validationErrors;
    constructor(message, validationErrors) {
        super(message, 'PROFILE_VALIDATION_ERROR', { validationErrors });
        this.validationErrors = validationErrors;
        this.name = 'ProfileValidationError';
    }
}
exports.ProfileValidationError = ProfileValidationError;
class ServiceNeedNotFoundError extends AdminAutomationError {
    constructor(needId) {
        super(`Service need not found: ${needId}`, 'SERVICE_NEED_NOT_FOUND', { needId });
        this.name = 'ServiceNeedNotFoundError';
    }
}
exports.ServiceNeedNotFoundError = ServiceNeedNotFoundError;
class AutoResolveError extends AdminAutomationError {
    constructor(needId, reason) {
        super(`Cannot auto-resolve need ${needId}: ${reason}`, 'AUTO_RESOLVE_ERROR', { needId, reason });
        this.name = 'AutoResolveError';
    }
}
exports.AutoResolveError = AutoResolveError;
class DatabaseError extends AdminAutomationError {
    constructor(operation, cause) {
        super(`Database error during ${operation}: ${cause?.message || 'Unknown'}`, 'DATABASE_ERROR', {
            operation,
            cause: cause?.message,
        });
        this.name = 'DatabaseError';
    }
}
exports.DatabaseError = DatabaseError;
/**
 * Type guard for AdminAutomationError
 */
function isAdminAutomationError(error) {
    return error instanceof AdminAutomationError;
}
/**
 * Wraps async operations with error handling
 */
async function withErrorHandling(operation, fn) {
    try {
        return await fn();
    }
    catch (error) {
        if (isAdminAutomationError(error)) {
            throw error;
        }
        throw new DatabaseError(operation, error instanceof Error ? error : undefined);
    }
}

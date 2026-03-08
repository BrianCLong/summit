"use strict";
/**
 * Error Handling Utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncError = exports.ExportError = exports.TimeoutError = exports.NotFoundError = exports.ValidationError = exports.AuthenticationError = exports.ConnectionError = exports.CLIError = void 0;
exports.setupErrorHandling = setupErrorHandling;
exports.handleError = handleError;
exports.formatError = formatError;
const constants_js_1 = require("../lib/constants.js");
class CLIError extends Error {
    code;
    cause;
    constructor(message, code = 'GENERAL_ERROR', cause) {
        super(message);
        this.code = code;
        this.cause = cause;
        this.name = 'CLIError';
    }
    get exitCode() {
        return constants_js_1.EXIT_CODES[this.code];
    }
}
exports.CLIError = CLIError;
class ConnectionError extends CLIError {
    constructor(message, cause) {
        super(message, 'CONNECTION_ERROR', cause);
        this.name = 'ConnectionError';
    }
}
exports.ConnectionError = ConnectionError;
class AuthenticationError extends CLIError {
    constructor(message, cause) {
        super(message, 'AUTHENTICATION_ERROR', cause);
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
class ValidationError extends CLIError {
    constructor(message, cause) {
        super(message, 'INVALID_ARGUMENT', cause);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends CLIError {
    constructor(message, cause) {
        super(message, 'NOT_FOUND', cause);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class TimeoutError extends CLIError {
    constructor(message, cause) {
        super(message, 'TIMEOUT', cause);
        this.name = 'TimeoutError';
    }
}
exports.TimeoutError = TimeoutError;
class ExportError extends CLIError {
    constructor(message, cause) {
        super(message, 'EXPORT_ERROR', cause);
        this.name = 'ExportError';
    }
}
exports.ExportError = ExportError;
class SyncError extends CLIError {
    constructor(message, cause) {
        super(message, 'SYNC_ERROR', cause);
        this.name = 'SyncError';
    }
}
exports.SyncError = SyncError;
function setupErrorHandling() {
    process.on('uncaughtException', (error) => {
        console.error('Uncaught exception:', error.message);
        if (process.env.DEBUG) {
            console.error(error.stack);
        }
        process.exit(constants_js_1.EXIT_CODES.GENERAL_ERROR);
    });
    process.on('unhandledRejection', (reason) => {
        console.error('Unhandled rejection:', reason instanceof Error ? reason.message : String(reason));
        if (process.env.DEBUG && reason instanceof Error) {
            console.error(reason.stack);
        }
        process.exit(constants_js_1.EXIT_CODES.GENERAL_ERROR);
    });
    // Handle SIGINT gracefully
    process.on('SIGINT', () => {
        console.log('\nOperation cancelled');
        process.exit(constants_js_1.EXIT_CODES.SUCCESS);
    });
    // Handle SIGTERM gracefully
    process.on('SIGTERM', () => {
        console.log('\nTermination signal received');
        process.exit(constants_js_1.EXIT_CODES.SUCCESS);
    });
}
function handleError(error) {
    if (error instanceof CLIError) {
        console.error(`Error: ${error.message}`);
        if (process.env.DEBUG && error.cause) {
            console.error('Caused by:', error.cause.message);
            console.error(error.cause.stack);
        }
        process.exit(error.exitCode);
    }
    if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
        if (process.env.DEBUG) {
            console.error(error.stack);
        }
        process.exit(constants_js_1.EXIT_CODES.GENERAL_ERROR);
    }
    console.error('Unknown error:', String(error));
    process.exit(constants_js_1.EXIT_CODES.GENERAL_ERROR);
}
function formatError(error) {
    if (error instanceof CLIError) {
        return error.message;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}

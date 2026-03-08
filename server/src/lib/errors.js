"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseError = exports.NotFoundError = exports.AppError = exports.UserFacingError = void 0;
exports.mapGraphRAGError = mapGraphRAGError;
const node_crypto_1 = require("node:crypto");
// @ts-ignore
const pino_1 = __importDefault(require("pino"));
// @ts-ignore
const logger = pino_1.default({ name: 'ErrorMapper' });
class UserFacingError extends Error {
    statusCode;
    traceId;
    constructor(message, statusCode, traceId) {
        super(message);
        this.statusCode = statusCode;
        this.traceId = traceId;
    }
}
exports.UserFacingError = UserFacingError;
class AppError extends Error {
    statusCode;
    code;
    constructor(message, statusCode = 500, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class DatabaseError extends AppError {
    constructor(message = 'Database error') {
        super(message, 500, 'DATABASE_ERROR');
        this.name = 'DatabaseError';
    }
}
exports.DatabaseError = DatabaseError;
function mapGraphRAGError(error) {
    const traceId = (0, node_crypto_1.randomUUID)();
    let summary = 'Unknown error';
    if (error && typeof error === 'object' && 'issues' in error && Array.isArray(error.issues)) {
        summary = error.issues
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join('; ');
    }
    else if (error instanceof Error) {
        summary = error.message;
    }
    logger.warn({ traceId, issues: summary }, 'GraphRAG schema validation failed');
    return new UserFacingError(`Invalid GraphRAG response. Trace ID: ${traceId}`, 400, traceId);
}

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.centralizedErrorHandler = void 0;
const graphql_1 = require("graphql");
const zod_1 = require("zod");
const ZodError = zod_1.z.ZodError;
const logger_js_1 = require("../config/logger.js");
const reliability_metrics_js_1 = require("../observability/reliability-metrics.js");
const fs = __importStar(require("node:fs"));
const deriveStatusCode = (error) => {
    if (error instanceof graphql_1.GraphQLError) {
        const httpStatus = error.extensions?.http?.status;
        if (typeof httpStatus === 'number')
            return httpStatus;
    }
    if (error instanceof ZodError) {
        return 400;
    }
    const candidateStatus = error?.statusCode ??
        error?.status;
    if (typeof candidateStatus === 'number') {
        return candidateStatus;
    }
    if (error?.type === 'entity.parse.failed') {
        return 400;
    }
    return 500;
};
const normalizeGraphQLError = (error, statusCode) => {
    if (error instanceof graphql_1.GraphQLError) {
        return error;
    }
    const code = statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_USER_INPUT';
    const message = statusCode >= 500 ? 'Internal server error' : 'Invalid request payload';
    return new graphql_1.GraphQLError(message, {
        extensions: {
            code,
            http: { status: statusCode },
        },
    });
};
const deriveMessage = (error, fallback) => {
    if (error instanceof graphql_1.GraphQLError) {
        return error.message;
    }
    if (error instanceof ZodError) {
        return 'Invalid request payload';
    }
    if (error instanceof Error) {
        return error.message || fallback;
    }
    return fallback;
};
const centralizedErrorHandler = (err, req, res, next) => {
    // Debug logging for GraphQL routes
    if (req.path?.startsWith('/graphql')) {
        try {
            fs.appendFileSync('/tmp/debug_error_handler.txt', `[centralizedErrorHandler] GraphQL error caught\n`);
            fs.appendFileSync('/tmp/debug_error_handler.txt', `[centralizedErrorHandler] Error type: ${err?.constructor?.name}\n`);
            fs.appendFileSync('/tmp/debug_error_handler.txt', `[centralizedErrorHandler] Error message: ${err?.message}\n`);
            fs.appendFileSync('/tmp/debug_error_handler.txt', `[centralizedErrorHandler] Is GraphQLError? ${err instanceof graphql_1.GraphQLError}\n`);
            if (err?.stack) {
                fs.appendFileSync('/tmp/debug_error_handler.txt', `[centralizedErrorHandler] Stack: ${err?.stack?.split('\n').slice(0, 3).join('\n')}\n`);
            }
        }
        catch (e) {
            // Ignore logging errors
        }
    }
    if (res.headersSent) {
        return next(err);
    }
    const statusCode = deriveStatusCode(err);
    const isGraphQLRoute = req.path?.startsWith('/graphql');
    const graphQLError = isGraphQLRoute
        ? normalizeGraphQLError(err, statusCode)
        : err instanceof graphql_1.GraphQLError
            ? err
            : null;
    const message = deriveMessage(graphQLError ?? err, statusCode >= 500 ? 'Internal server error' : 'Bad request');
    logger_js_1.logger.error({
        err,
        path: req.path,
        method: req.method,
        statusCode,
        correlationId: req.correlationId,
    }, 'Request failed');
    (0, reliability_metrics_js_1.recordEndpointResult)({
        endpoint: req.path,
        statusCode,
        durationSeconds: res.locals.duration || 0,
        tenantId: req.tenantId ||
            req.user?.tenantId ||
            'unknown',
    });
    const responseBody = {
        error: {
            message,
            code: graphQLError?.extensions?.code,
            correlationId: req.correlationId ||
                req.headers['x-correlation-id'] ||
                req.headers['x-request-id'],
        },
    };
    if (graphQLError?.extensions?.details && process.env.NODE_ENV !== 'production') {
        responseBody.error.details = graphQLError.extensions.details;
    }
    res.status(statusCode).json(responseBody);
};
exports.centralizedErrorHandler = centralizedErrorHandler;

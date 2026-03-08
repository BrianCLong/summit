"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorFactory = exports.SummitError = exports.ErrorCategories = void 0;
exports.isSummitError = isSummitError;
const uuid_1 = require("uuid");
const logger_1 = require("@intelgraph/logger");
exports.ErrorCategories = [
    'auth',
    'validation',
    'rate-limit',
    'internal',
    'LLM',
    'upstream',
];
const categoryStatusMap = {
    auth: 401,
    validation: 422,
    'rate-limit': 429,
    internal: 500,
    LLM: 502,
    upstream: 502,
};
const logger = (0, logger_1.createLogger)({ serviceName: process.env.SERVICE_NAME || 'platform-errors' });
class SummitError extends Error {
    envelope;
    statusCode;
    constructor(envelope, statusCode, cause) {
        super(envelope.developer_message ?? envelope.human_message);
        this.name = 'SummitError';
        this.envelope = envelope;
        this.statusCode = statusCode;
        if (cause) {
            this.cause = cause;
        }
    }
}
exports.SummitError = SummitError;
function normalizeCategory(category) {
    const normalized = category;
    return exports.ErrorCategories.includes(normalized) ? normalized : 'internal';
}
function toEnvelope(category, input) {
    const timestamp = new Date().toISOString();
    const normalizedCategory = normalizeCategory(category);
    const traceId = input.traceId || (0, uuid_1.v4)();
    const envelope = {
        error_code: input.errorCode,
        human_message: input.humanMessage,
        developer_message: input.developerMessage,
        category: normalizedCategory,
        trace_id: traceId,
        suggested_action: input.suggestedAction,
        timestamp,
        context: input.context,
    };
    const statusCode = input.statusCode ?? categoryStatusMap[normalizedCategory] ?? 500;
    return { envelope, statusCode };
}
function buildError(category, input) {
    const { envelope, statusCode } = toEnvelope(category, input);
    const summitError = new SummitError(envelope, statusCode, input.cause);
    logger.error({
        event: 'platform.error',
        error: envelope,
        statusCode,
    }, envelope.developer_message || envelope.human_message);
    return summitError;
}
function isSummitError(error) {
    return Boolean(error && error.envelope);
}
exports.errorFactory = {
    auth: (input) => buildError('auth', input),
    validation: (input) => buildError('validation', input),
    rateLimit: (input) => buildError('rate-limit', input),
    internal: (input) => buildError('internal', input),
    llm: (input) => buildError('LLM', input),
    upstream: (input) => buildError('upstream', input),
    fromUnknown: (error, fallback) => {
        if (isSummitError(error)) {
            return error;
        }
        const developerMessage = error instanceof Error ? error.message : 'Unknown error';
        const category = normalizeCategory(fallback.category || 'internal');
        return buildError(category, {
            developerMessage,
            ...fallback,
        });
    },
};

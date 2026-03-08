"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isResponse = exports.isRequest = exports.redactSensitive = exports.formatLogEvent = void 0;
// @ts-nocheck
const pino_1 = __importDefault(require("pino"));
const stdSerializers = pino_1.default.stdSerializers;
const SENSITIVE_KEYS = new Set([
    'authorization',
    'cookie',
    'password',
    'secret',
    'token',
    'apiKey',
    'apikey',
    'ssn',
    'card',
    'cardnumber',
    'x-api-key',
]);
const isPlainObject = (value) => {
    if (value === null || typeof value !== 'object')
        return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
};
const isRequestLike = (value) => {
    return (typeof value === 'object' &&
        value !== null &&
        'method' in value &&
        typeof value.method === 'string' &&
        'headers' in value);
};
const isResponseLike = (value) => {
    return typeof value === 'object' && value !== null && 'statusCode' in value;
};
const redactValue = (value, seen) => {
    if (value === null || typeof value !== 'object')
        return value;
    if (seen.has(value))
        return undefined;
    seen.add(value);
    if (Array.isArray(value)) {
        return value
            .map((entry) => redactValue(entry, seen))
            .filter((entry) => entry !== undefined);
    }
    if (value instanceof Error) {
        return stdSerializers.err(value);
    }
    if (!isPlainObject(value)) {
        return undefined;
    }
    return Object.entries(value).reduce((acc, [key, val]) => {
        if (SENSITIVE_KEYS.has(key.toLowerCase())) {
            return acc;
        }
        const redacted = redactValue(val, seen);
        if (redacted !== undefined) {
            acc[key] = redacted;
        }
        return acc;
    }, {});
};
const serialize = (value) => {
    if (value instanceof Error)
        return { error: stdSerializers.err(value) };
    if (isRequestLike(value)) {
        const req = value;
        return {
            req: {
                id: req.id ?? req.headers?.['x-request-id'],
                method: req.method,
                url: req.url,
                remoteAddress: req.socket?.remoteAddress,
            },
        };
    }
    if (isResponseLike(value)) {
        const res = value;
        return {
            res: {
                statusCode: res.statusCode,
                contentLength: typeof res.getHeader === 'function' ? res.getHeader('content-length') : undefined,
            },
        };
    }
    if (isPlainObject(value)) {
        return redactValue(value, new WeakSet()) ?? {};
    }
    return { value };
};
const extractMessage = (first, rest) => {
    if (typeof first === 'string')
        return first;
    const firstStringInRest = rest.find((entry) => typeof entry === 'string');
    if (typeof firstStringInRest === 'string')
        return firstStringInRest;
    if (isPlainObject(first) && typeof first.message === 'string') {
        return first.message;
    }
    return 'log';
};
const formatLogEvent = (level, args) => {
    const [first, ...rest] = args;
    const contextParts = [];
    const addContext = (value) => {
        const serialized = serialize(value);
        if (serialized && Object.keys(serialized).length > 0) {
            contextParts.push(serialized);
        }
    };
    if (first !== undefined)
        addContext(first);
    rest.forEach((value) => {
        if (value && typeof value === 'object')
            addContext(value);
    });
    const mergedContext = Object.assign({}, ...contextParts);
    return {
        level,
        message: extractMessage(first, rest),
        timestamp: new Date().toISOString(),
        correlationId: mergedContext.correlationId ?? undefined,
        traceId: mergedContext.traceId ?? undefined,
        spanId: mergedContext.spanId ?? undefined,
        tenantId: mergedContext.tenantId ?? undefined,
        userId: mergedContext.userId ?? undefined,
        service: mergedContext.service ?? 'summit-api',
        context: mergedContext,
    };
};
exports.formatLogEvent = formatLogEvent;
const redactSensitive = (value) => redactValue(value, new WeakSet());
exports.redactSensitive = redactSensitive;
exports.isRequest = isRequestLike;
exports.isResponse = isResponseLike;

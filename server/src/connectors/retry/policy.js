"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRetryableError = isRetryableError;
exports.createRetryPolicy = createRetryPolicy;
// @ts-nocheck
const backoff_js_1 = require("./backoff.js");
const DEFAULT_POLICY = {
    maxAttempts: 5,
    maxElapsedMs: 60_000,
    backoff: {},
};
function isRetryableError(error) {
    if (!error || typeof error !== 'object') {
        return false;
    }
    const maybeStatus = getStatusCode(error);
    if (maybeStatus !== undefined) {
        if (maybeStatus === 429)
            return true;
        if (maybeStatus >= 500 && maybeStatus < 600)
            return true;
    }
    const code = getErrorCode(error)?.toUpperCase();
    if (code && ['ETIMEDOUT', 'ECONNRESET', 'ECONNABORTED', 'EAI_AGAIN'].includes(code)) {
        return true;
    }
    const message = getMessage(error);
    if (message) {
        const normalized = message.toLowerCase();
        if (normalized.includes('timeout') || normalized.includes('timed out')) {
            return true;
        }
    }
    return false;
}
function createRetryPolicy(options = {}) {
    const merged = {
        ...DEFAULT_POLICY,
        ...options,
        backoff: { ...DEFAULT_POLICY.backoff, ...options.backoff },
    };
    const backoffStep = (0, backoff_js_1.createDeterministicBackoff)(merged.backoff);
    return {
        shouldRetry(error, attempt, elapsedMs) {
            if (attempt >= merged.maxAttempts) {
                return { retry: false, reason: 'max-attempts-exceeded' };
            }
            if (elapsedMs >= merged.maxElapsedMs) {
                return { retry: false, reason: 'max-elapsed-exceeded' };
            }
            if (!isRetryableError(error)) {
                return { retry: false, reason: 'non-retryable-error' };
            }
            const state = backoffStep();
            const delayMs = state.delays[state.delays.length - 1];
            return { retry: true, delayMs, reason: 'retryable' };
        },
    };
}
function getStatusCode(error) {
    if (typeof error.status === 'number')
        return error.status;
    const response = error.response;
    if (response && typeof response.status === 'number')
        return response.status;
    return undefined;
}
function getErrorCode(error) {
    if (typeof error.code === 'string')
        return error.code;
    return undefined;
}
function getMessage(error) {
    if (typeof error.message === 'string')
        return error.message;
    return undefined;
}

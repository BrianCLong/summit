"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const retryPolicy_js_1 = require("../retryPolicy.js");
(0, globals_1.describe)('RetryPolicy', () => {
    (0, globals_1.describe)('classifyError', () => {
        (0, globals_1.it)('should classify 4xx errors as NonRetryable', () => {
            const error = { status: 400 };
            (0, globals_1.expect)((0, retryPolicy_js_1.classifyError)(error)).toBe(retryPolicy_js_1.RetryClassification.NonRetryable);
        });
        (0, globals_1.it)('should classify 408 as Retryable', () => {
            const error = { status: 408 };
            (0, globals_1.expect)((0, retryPolicy_js_1.classifyError)(error)).toBe(retryPolicy_js_1.RetryClassification.Retryable);
        });
        (0, globals_1.it)('should classify 429 as Retryable', () => {
            const error = { status: 429 };
            (0, globals_1.expect)((0, retryPolicy_js_1.classifyError)(error)).toBe(retryPolicy_js_1.RetryClassification.Retryable);
        });
        (0, globals_1.it)('should classify 5xx errors as Retryable', () => {
            const error = { status: 500 };
            (0, globals_1.expect)((0, retryPolicy_js_1.classifyError)(error)).toBe(retryPolicy_js_1.RetryClassification.Retryable);
        });
        (0, globals_1.it)('should classify network errors as Retryable', () => {
            const error = { code: 'ECONNRESET' };
            (0, globals_1.expect)((0, retryPolicy_js_1.classifyError)(error)).toBe(retryPolicy_js_1.RetryClassification.Retryable);
        });
        (0, globals_1.it)('should classify errors with specific messages as Retryable', () => {
            const error = { message: 'Connection timed out' };
            (0, globals_1.expect)((0, retryPolicy_js_1.classifyError)(error)).toBe(retryPolicy_js_1.RetryClassification.Retryable);
        });
        (0, globals_1.it)('should classify unknown errors as Unknown', () => {
            const error = { message: 'Something went wrong' };
            (0, globals_1.expect)((0, retryPolicy_js_1.classifyError)(error)).toBe(retryPolicy_js_1.RetryClassification.Unknown);
        });
    });
    (0, globals_1.describe)('shouldRetry', () => {
        (0, globals_1.it)('should return true for Retryable errors', () => {
            const error = { status: 503 };
            (0, globals_1.expect)((0, retryPolicy_js_1.shouldRetry)(error)).toBe(true);
        });
        (0, globals_1.it)('should return false for NonRetryable errors', () => {
            const error = { status: 400 };
            (0, globals_1.expect)((0, retryPolicy_js_1.shouldRetry)(error)).toBe(false);
        });
        (0, globals_1.it)('should return true for Unknown errors (default safe)', () => {
            const error = { message: 'Who knows' };
            (0, globals_1.expect)((0, retryPolicy_js_1.shouldRetry)(error)).toBe(true);
        });
    });
});

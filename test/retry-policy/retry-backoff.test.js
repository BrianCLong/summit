"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const backoff_js_1 = require("../../server/src/connectors/retry/backoff.js");
const policy_js_1 = require("../../server/src/connectors/retry/policy.js");
(0, node_test_1.default)('generates deterministic jittered delays for a fixed seed', () => {
    const delays = (0, backoff_js_1.previewDelays)(5, { seed: 'ci-seed' });
    strict_1.default.deepStrictEqual(delays, [214, 363, 800, 1411, 3833]);
    const rerun = (0, backoff_js_1.previewDelays)(5, { seed: 'ci-seed' });
    strict_1.default.deepStrictEqual(rerun, delays);
});
(0, node_test_1.default)('clamps jitter to the configured maximum delay', () => {
    const options = {
        baseDelayMs: 1_000,
        factor: 3,
        maxDelayMs: 5_000,
        jitterRatio: 0.8,
        seed: 'clamp-check',
    };
    const delays = (0, backoff_js_1.previewDelays)(8, options);
    strict_1.default.ok(delays.every((delay) => delay >= 0 && delay <= 5_000));
    strict_1.default.ok(delays.includes(5_000));
});
(0, node_test_1.default)('retry policy respects retryability and limits', () => {
    const policy = (0, policy_js_1.createRetryPolicy)({
        maxAttempts: 3,
        maxElapsedMs: 12_000,
        backoff: { seed: 'policy-seed', baseDelayMs: 300 },
    });
    const retryable = policy.shouldRetry({ status: 503 }, 1, 0);
    strict_1.default.strictEqual(retryable.retry, true);
    strict_1.default.strictEqual(retryable.reason, 'retryable');
    const delays = [retryable.delayMs];
    const second = policy.shouldRetry({ code: 'ETIMEDOUT' }, 2, 1_000);
    delays.push(second.delayMs ?? 0);
    strict_1.default.ok(second.retry);
    strict_1.default.deepStrictEqual(delays, (0, backoff_js_1.previewDelays)(2, { seed: 'policy-seed', baseDelayMs: 300 }));
    const exhausted = policy.shouldRetry({ status: 503 }, 3, 11_000);
    strict_1.default.strictEqual(exhausted.retry, false);
    strict_1.default.strictEqual(exhausted.reason, 'max-attempts-exceeded');
});
(0, node_test_1.default)('classifies only transient signals as retryable', () => {
    strict_1.default.ok((0, policy_js_1.isRetryableError)({ status: 429 }));
    strict_1.default.ok((0, policy_js_1.isRetryableError)({ status: 500 }));
    strict_1.default.ok((0, policy_js_1.isRetryableError)({ response: { status: 502 } }));
    strict_1.default.ok((0, policy_js_1.isRetryableError)({ code: 'ECONNRESET' }));
    strict_1.default.ok((0, policy_js_1.isRetryableError)({ message: 'Request timeout after 10s' }));
    strict_1.default.equal((0, policy_js_1.isRetryableError)({ status: 400 }), false);
    strict_1.default.equal((0, policy_js_1.isRetryableError)({ message: 'Validation failed' }), false);
    strict_1.default.equal((0, policy_js_1.isRetryableError)(null), false);
});

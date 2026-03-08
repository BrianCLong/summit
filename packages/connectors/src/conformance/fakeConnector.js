"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FakeConnector = void 0;
const crypto_1 = require("crypto");
class FakeConnector {
    name = 'fake-connector';
    store = new Map();
    transientBudget = 2;
    dataset = [];
    rateLimitState = { limit: 3, remaining: 3, resetSeconds: 30 };
    async reset() {
        await Promise.resolve();
        this.store.clear();
        this.transientBudget = 2;
        this.dataset = Array.from({ length: 5 }, (_, index) => ({ id: `item-${index + 1}`, value: index + 1 }));
        this.rateLimitState = { limit: 3, remaining: 3, resetSeconds: 30 };
    }
    async performIdempotentWrite(payload) {
        await Promise.resolve();
        const checksum = JSON.stringify(payload);
        if (!this.store.has(checksum)) {
            const id = `fake-${(0, crypto_1.randomUUID)()}`;
            this.store.set(checksum, { id, checksum, data: payload });
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.store.get(checksum);
    }
    async performIdempotentRead(id) {
        await Promise.resolve();
        const record = Array.from(this.store.values()).find((entry) => entry.id === id);
        if (!record) {
            throw new Error('Record not found');
        }
        return record.data;
    }
    async simulateTransientFailure(attempt) {
        await Promise.resolve();
        if (attempt <= this.transientBudget) {
            return {
                success: false,
                error: this.buildError('TRANSIENT', 503, true, `Transient failure on attempt ${attempt}`),
            };
        }
        return { success: true };
    }
    async fetchPage(cursor = null, pageSize = 2) {
        await Promise.resolve();
        const start = cursor ? Number.parseInt(cursor, 10) : 0;
        const items = this.dataset.slice(start, start + pageSize);
        const nextCursor = start + pageSize < this.dataset.length ? String(start + pageSize) : null;
        return { items, nextCursor };
    }
    async invokeWithRateLimit() {
        await Promise.resolve();
        if (this.rateLimitState.remaining === 0) {
            this.rateLimitState = { ...this.rateLimitState, remaining: this.rateLimitState.limit - 1 };
            return { success: true, rateLimitInfo: this.rateLimitState };
        }
        this.rateLimitState = {
            ...this.rateLimitState,
            remaining: Math.max(0, this.rateLimitState.remaining - 1),
        };
        if (this.rateLimitState.remaining === 0) {
            this.rateLimitState = { ...this.rateLimitState, remaining: this.rateLimitState.limit - 1 };
        }
        return { success: true, rateLimitInfo: this.rateLimitState };
    }
    async mapError(code) {
        await Promise.resolve();
        switch (code) {
            case 'NOT_FOUND':
                return this.buildError('NOT_FOUND', 404, false, 'Resource was not found');
            case 'UNAUTHORIZED':
                return this.buildError('UNAUTHORIZED', 401, false, 'Authentication failed');
            case 'RATE_LIMIT':
                return this.buildError('RATE_LIMIT', 429, true, 'Rate limit exceeded');
            default:
                return this.buildError('UNKNOWN', 500, false, 'Unknown error');
        }
    }
    async collectEvidence() {
        await Promise.resolve();
        return {
            timestamp: new Date().toISOString(),
            operations: ['idempotentWrite', 'pagination', 'rateLimit', 'errorMapping', 'redaction'],
            coverage: {
                idempotency: true,
                retries: true,
                pagination: true,
                rateLimits: true,
                errors: true,
                redaction: true,
            },
            notes: 'Synthetic connector used for harness validation.',
        };
    }
    async redactSecrets(record) {
        await Promise.resolve();
        const scrub = (value) => {
            if (value && typeof value === 'object') {
                if (Array.isArray(value)) {
                    return value.map((entry) => scrub(entry));
                }
                return Object.entries(value).reduce((acc, [key, val]) => {
                    if (['token', 'password', 'apiKey', 'authorization', 'secret'].includes(key)) {
                        acc[key] = '[REDACTED]';
                    }
                    else {
                        acc[key] = scrub(val);
                    }
                    return acc;
                }, {});
            }
            return value;
        };
        return scrub(record);
    }
    buildError(code, status, retryable, message) {
        return { code, status, retryable, message };
    }
}
exports.FakeConnector = FakeConnector;
exports.default = FakeConnector;

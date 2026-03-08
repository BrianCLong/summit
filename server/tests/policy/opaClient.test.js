"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const node_fetch_1 = __importDefault(require("node-fetch"));
const opaClient_1 = require("../../src/policy/opaClient");
globals_1.jest.mock('node-fetch', () => globals_1.jest.fn());
const mockedFetch = node_fetch_1.default;
const buildResponse = (body, ok = true, status = 200) => ({
    ok,
    status,
    json: async () => body,
});
describe('opaClient', () => {
    const originalFailOpen = process.env.OPA_FAIL_OPEN;
    const originalDebug = process.env.POLICY_DEBUG;
    beforeEach(() => {
        (0, opaClient_1.clearOpaDecisionCache)();
        mockedFetch.mockReset();
        process.env.OPA_FAIL_OPEN = 'false';
        process.env.POLICY_DEBUG = '0';
    });
    afterAll(() => {
        process.env.OPA_FAIL_OPEN = originalFailOpen;
        process.env.POLICY_DEBUG = originalDebug;
    });
    it('caches decisions keyed by input and path', async () => {
        mockedFetch.mockResolvedValue(buildResponse({ result: { allow: true } }));
        const input = { action: 'read', tenant: 't1', user: { id: 'u1' }, resource: '/case/1' };
        const first = await (0, opaClient_1.opaAllow)('test/allow', input, { cacheTtlMs: 10_000 });
        const second = await (0, opaClient_1.opaAllow)('test/allow', input, { cacheTtlMs: 10_000 });
        expect(first.allow).toBe(true);
        expect(second.allow).toBe(true);
        expect(mockedFetch).toHaveBeenCalledTimes(1);
    });
    it('retries on failure with exponential backoff', async () => {
        mockedFetch
            .mockRejectedValueOnce(new Error('network'))
            .mockResolvedValueOnce(buildResponse({ result: { allow: true, reason: 'ok' } }));
        const result = await (0, opaClient_1.opaAllow)('test/retry', { action: 'read', tenant: 't1' }, { baseBackoffMs: 0, maxRetries: 1, cacheTtlMs: 0 });
        expect(result.allow).toBe(true);
        expect(mockedFetch).toHaveBeenCalledTimes(2);
    });
    it('fails closed when retries exhausted and fail-open disabled', async () => {
        mockedFetch.mockRejectedValue(new Error('unreachable'));
        const result = await (0, opaClient_1.opaAllow)('test/deny', { action: 'read', tenant: 't1' }, { cacheTtlMs: 0, maxRetries: 0 });
        expect(result.allow).toBe(false);
    });
    it('honors fail-open flag when enabled', async () => {
        mockedFetch.mockRejectedValue(new Error('unreachable'));
        process.env.OPA_FAIL_OPEN = 'true';
        const result = await (0, opaClient_1.opaAllow)('test/fail-open', { action: 'read' }, { cacheTtlMs: 0, maxRetries: 0 });
        expect(result.allow).toBe(true);
        expect(result.reason).toBe('fail-open');
    });
});

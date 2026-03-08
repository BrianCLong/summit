"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const QuotaEnforcer_js_1 = require("../QuotaEnforcer.js");
const RateLimiter_js_1 = require("../../../services/RateLimiter.js");
const QuotaConfig_js_1 = require("../QuotaConfig.js");
const globals_1 = require("@jest/globals");
// Mock dependencies
globals_1.jest.mock('../../../services/RateLimiter.js', () => ({
    rateLimiter: {
        checkLimit: globals_1.jest.fn(),
    },
}));
globals_1.jest.mock('../QuotaConfig.js', () => ({
    quotaConfigService: {
        getTenantPlan: globals_1.jest.fn(),
        getTenantOverrides: globals_1.jest.fn(),
        getFeatureAllowlist: globals_1.jest.fn(),
    },
    DEFAULT_PLANS: {
        starter: { api_rpm: 100, ingest_eps: 10, egress_gb_day: 1 },
        standard: { api_rpm: 6000, ingest_eps: 1000, egress_gb_day: 50 },
    }
}));
// Mock PrometheusMetrics
globals_1.jest.mock('../../../utils/metrics.js', () => {
    return {
        PrometheusMetrics: globals_1.jest.fn().mockImplementation(() => ({
            createCounter: globals_1.jest.fn(),
            incrementCounter: globals_1.jest.fn(),
            createGauge: globals_1.jest.fn(),
            setGauge: globals_1.jest.fn(),
        })),
    };
});
describe('QuotaEnforcer', () => {
    let enforcer;
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
        enforcer = QuotaEnforcer_js_1.QuotaEnforcer.getInstance();
        QuotaConfig_js_1.quotaConfigService.getTenantPlan.mockReturnValue('starter');
        QuotaConfig_js_1.quotaConfigService.getTenantOverrides.mockReturnValue({});
        QuotaConfig_js_1.quotaConfigService.getFeatureAllowlist.mockReturnValue(['allowed-tenant']);
    });
    it('should enforce API quota', async () => {
        RateLimiter_js_1.rateLimiter.checkLimit.mockImplementation(async () => ({
            allowed: true,
            total: 100,
            remaining: 99,
            reset: 12345,
        }));
        const result = await enforcer.checkApiQuota('demo-tenant');
        expect(result.allowed).toBe(true);
        expect(RateLimiter_js_1.rateLimiter.checkLimit).toHaveBeenCalledWith('quota:demo-tenant:api_rpm', 100, // Starter plan limit
        60000);
    });
    it('should enforce Ingest quota with custom amount', async () => {
        RateLimiter_js_1.rateLimiter.checkLimit.mockImplementation(async () => ({
            allowed: false,
            total: 10,
            remaining: 0,
            reset: 12345,
        }));
        const result = await enforcer.checkIngestQuota('demo-tenant', 5);
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('INGEST_EPS_EXCEEDED');
        expect(RateLimiter_js_1.rateLimiter.checkLimit).toHaveBeenCalledWith('quota:demo-tenant:ingest_eps', 10, // Starter plan limit
        1000, 5);
    });
    it('should respect tenant overrides', async () => {
        QuotaConfig_js_1.quotaConfigService.getTenantPlan.mockReturnValue('standard');
        QuotaConfig_js_1.quotaConfigService.getTenantOverrides.mockReturnValue({ api_rpm: 8000 });
        RateLimiter_js_1.rateLimiter.checkLimit.mockImplementation(async () => ({
            allowed: true,
            total: 8000,
            remaining: 7999,
            reset: 12345,
        }));
        await enforcer.checkApiQuota('acme-corp');
        expect(RateLimiter_js_1.rateLimiter.checkLimit).toHaveBeenCalledWith('quota:acme-corp:api_rpm', 8000, // Overridden limit
        60000);
    });
    it('should check feature allowlist', () => {
        expect(enforcer.isFeatureAllowed('allowed-tenant', 'write_aware_sharding')).toBe(true);
        expect(enforcer.isFeatureAllowed('blocked-tenant', 'write_aware_sharding')).toBe(false);
    });
});

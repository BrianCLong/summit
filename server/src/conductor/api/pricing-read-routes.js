"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pricingReadRoutes = void 0;
const express_1 = require("express");
const rbac_middleware_js_1 = require("../auth/rbac-middleware.js");
const pools_js_1 = require("../scheduling/pools.js");
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const prometheus_js_1 = require("../observability/prometheus.js");
const router = (0, express_1.Router)();
exports.pricingReadRoutes = router;
const recordMetrics = (route, status, durationMs) => {
    prometheus_js_1.pricingReadRequestsTotal.inc({ route, status });
    prometheus_js_1.pricingReadLatencyMs.observe({ route }, durationMs);
};
router.get('/pools', (0, rbac_middleware_js_1.requirePermission)('pricing:read'), async (_req, res) => {
    const start = Date.now();
    const route = '/pools';
    try {
        const pools = await (0, pools_js_1.listPools)();
        const durationMs = Date.now() - start;
        recordMetrics(route, 'success', durationMs);
        return res.json({
            success: true,
            data: { pools },
        });
    }
    catch (error) {
        const durationMs = Date.now() - start;
        recordMetrics(route, 'error', durationMs);
        logger_js_1.default.error('Failed to list pools', { error: error.message });
        return res
            .status(500)
            .json({ success: false, error: 'Failed to fetch pools' });
    }
});
router.get('/pricing/current', (0, rbac_middleware_js_1.requirePermission)('pricing:read'), async (_req, res) => {
    const start = Date.now();
    const route = '/pricing/current';
    try {
        const pricing = await (0, pools_js_1.currentPricing)();
        const durationMs = Date.now() - start;
        recordMetrics(route, 'success', durationMs);
        return res.json({
            success: true,
            data: { pricing },
        });
    }
    catch (error) {
        const durationMs = Date.now() - start;
        recordMetrics(route, 'error', durationMs);
        logger_js_1.default.error('Failed to fetch current pricing', {
            error: error.message,
        });
        return res
            .status(500)
            .json({ success: false, error: 'Failed to fetch pricing' });
    }
});
router.post('/pricing/simulate-selection', (0, rbac_middleware_js_1.requirePermission)('pricing:read'), async (req, res) => {
    const start = Date.now();
    const route = '/pricing/simulate-selection';
    const { est, residency, tenantId, includeReservations = false } = req.body || {};
    if (!est) {
        const durationMs = Date.now() - start;
        recordMetrics(route, 'bad_request', durationMs);
        return res
            .status(400)
            .json({ success: false, error: 'est is required for simulation' });
    }
    try {
        const pools = await (0, pools_js_1.listPools)();
        const pricing = await (0, pools_js_1.currentPricing)();
        const considered = pools.map((pool) => {
            const entry = {
                id: pool.id,
                eligible: true,
                price: null,
                reason: 'ok',
            };
            if (residency &&
                !pool.region.toLowerCase().startsWith(residency.toLowerCase())) {
                entry.eligible = false;
                entry.reason = 'residency_mismatch';
            }
            if (pool.capacity !== undefined && pool.capacity <= 0) {
                entry.eligible = false;
                entry.reason = 'no_capacity';
            }
            const cost = pricing[pool.id];
            if (!cost) {
                entry.eligible = false;
                entry.reason = entry.reason === 'ok' ? 'missing_pricing' : entry.reason;
            }
            if (entry.eligible && cost) {
                const price = (est.cpuSec || 0) * Number(cost.cpu_sec_usd) +
                    (est.gbSec || 0) * Number(cost.gb_sec_usd) +
                    (est.egressGb || 0) * Number(cost.egress_gb_usd);
                entry.price = price;
                if (includeReservations) {
                    entry.reservedEligible = false;
                    entry.effectivePrice = price;
                }
            }
            else if (includeReservations) {
                entry.reservedEligible = false;
                entry.effectivePrice = null;
            }
            return entry;
        });
        const eligible = considered.filter((c) => c.eligible && c.price !== null);
        const chosen = eligible.reduce((best, current) => {
            if (!best)
                return { id: current.id, price: current.price };
            if (current.price < best.price) {
                return { id: current.id, price: current.price };
            }
            if (current.price === best.price) {
                return current.id < best.id ? { id: current.id, price: best.price } : best;
            }
            return best;
        }, null);
        const durationMs = Date.now() - start;
        recordMetrics(route, 'success', durationMs);
        logger_js_1.default.info('Simulated pricing selection', {
            tenantId,
            residency,
            chosenPoolId: chosen?.id || null,
            durationMs,
        });
        return res.json({
            success: true,
            data: {
                chosen,
                considered,
                inputs: { est, residency, tenantId, includeReservations },
            },
        });
    }
    catch (error) {
        const durationMs = Date.now() - start;
        recordMetrics(route, 'error', durationMs);
        logger_js_1.default.error('Failed to simulate pricing selection', {
            error: error.message,
            tenantId,
            residency,
        });
        return res.status(500).json({
            success: false,
            error: 'Failed to simulate pricing selection',
        });
    }
});

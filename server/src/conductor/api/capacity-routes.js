"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.capacityRoutes = void 0;
// @ts-nocheck
const express_1 = require("express");
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const rbac_middleware_js_1 = require("../auth/rbac-middleware.js");
const capacity_futures_js_1 = require("../scheduling/capacity-futures.js");
const router = (0, express_1.Router)();
exports.capacityRoutes = router;
router.post('/reserve', (0, rbac_middleware_js_1.requirePermission)('capacity:manage'), async (req, res) => {
    const start = Date.now();
    try {
        const { poolId, computeUnits, durationHours, startAt, endAt } = req.body;
        if (!poolId || !computeUnits) {
            return res.status(400).json({
                error: 'poolId and computeUnits are required',
            });
        }
        if (!durationHours && !(startAt && endAt)) {
            return res.status(400).json({
                error: 'Provide durationHours or both startAt and endAt',
            });
        }
        const tenantId = req.user?.tenantId;
        const reservation = await (0, capacity_futures_js_1.reserveCapacity)({
            poolId,
            computeUnits: Number(computeUnits),
            durationHours: durationHours ? Number(durationHours) : undefined,
            startAt,
            endAt,
            tenantId,
        });
        logger_js_1.default.info('🆕 Capacity reservation created via API', {
            tenantId,
            poolId,
            reservationId: reservation.reservationId,
            durationMs: Date.now() - start,
        });
        return res.json({
            reservationId: reservation.reservationId,
            costEstimate: reservation.costEstimate,
            startAt: reservation.startAt,
            endAt: reservation.endAt,
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger_js_1.default.error('❌ Capacity reservation failed', {
            error: errorMessage,
            poolId: req.body?.poolId,
        });
        return res.status(500).json({ error: errorMessage });
    }
});
router.post('/release', (0, rbac_middleware_js_1.requirePermission)('capacity:manage'), async (req, res) => {
    try {
        const { reservationId } = req.body;
        if (!reservationId) {
            return res.status(400).json({ error: 'reservationId is required' });
        }
        const tenantId = req.user?.tenantId;
        const released = await (0, capacity_futures_js_1.releaseReservation)(reservationId, tenantId);
        if (!released) {
            return res.status(404).json({ error: 'Reservation not found' });
        }
        logger_js_1.default.info('🗑️ Capacity reservation released via API', {
            reservationId,
            tenantId,
        });
        return res.json({ released: true });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger_js_1.default.error('❌ Capacity reservation release failed', {
            error: errorMessage,
            reservationId: req.body?.reservationId,
        });
        return res.status(500).json({ error: errorMessage });
    }
});
router.get('/list', (0, rbac_middleware_js_1.requirePermission)('capacity:read'), async (req, res) => {
    try {
        const includeExpired = req.query.includeExpired === 'true';
        const tenantId = req.user?.tenantId;
        const reservations = await (0, capacity_futures_js_1.listReservations)(tenantId, includeExpired);
        logger_js_1.default.info('📄 Capacity reservations listed via API', {
            tenantId,
            count: reservations.length,
            includeExpired,
        });
        return res.json({ reservations });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger_js_1.default.error('❌ Failed to list capacity reservations', {
            error: errorMessage,
        });
        return res.status(500).json({ error: errorMessage });
    }
});

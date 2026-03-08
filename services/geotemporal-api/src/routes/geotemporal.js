"use strict";
/**
 * Geo-Temporal Analytics Routes
 *
 * REST API endpoints for trajectory, stay-point, co-presence, and convoy analytics.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createRouter;
const express_1 = require("express");
const zod_1 = require("zod");
// Validation schemas
const TimeRangeSchema = zod_1.z.object({
    from: zod_1.z.string().datetime(),
    to: zod_1.z.string().datetime(),
});
const StayPointParamsSchema = zod_1.z.object({
    radiusMeters: zod_1.z.number().positive(),
    minDurationMinutes: zod_1.z.number().positive(),
});
const CoPresenceParamsSchema = zod_1.z.object({
    maxDistanceMeters: zod_1.z.number().positive(),
    minOverlapMinutes: zod_1.z.number().positive(),
});
const ConvoyParamsSchema = zod_1.z.object({
    maxDistanceMeters: zod_1.z.number().positive(),
    minGroupSize: zod_1.z.number().int().min(2),
    minSteps: zod_1.z.number().int().min(1),
    stepDurationMinutes: zod_1.z.number().positive().optional(),
});
const TrajectoryQuerySchema = zod_1.z.object({
    from: zod_1.z.string().datetime().optional(),
    to: zod_1.z.string().datetime().optional(),
});
const StayPointQuerySchema = zod_1.z.object({
    from: zod_1.z.string().datetime(),
    to: zod_1.z.string().datetime(),
    radiusMeters: zod_1.z.coerce.number().positive(),
    minDurationMinutes: zod_1.z.coerce.number().positive(),
});
const CoPresenceBodySchema = zod_1.z.object({
    entityIds: zod_1.z.array(zod_1.z.string()).min(2),
    timeRange: TimeRangeSchema,
    params: CoPresenceParamsSchema,
});
const ConvoyBodySchema = zod_1.z.object({
    entityIds: zod_1.z.array(zod_1.z.string()).optional().default([]),
    timeRange: TimeRangeSchema,
    params: ConvoyParamsSchema,
});
/**
 * Create router with service dependency injection
 */
function createRouter(service) {
    const router = (0, express_1.Router)();
    /**
     * GET /api/geotemporal/entities/:entityId/trajectory
     *
     * Get trajectory for an entity
     */
    router.get('/entities/:entityId/trajectory', async (req, res, next) => {
        try {
            const { entityId } = req.params;
            const queryValidation = TrajectoryQuerySchema.safeParse(req.query);
            if (!queryValidation.success) {
                return res.status(400).json({
                    error: 'Invalid query parameters',
                    details: queryValidation.error.flatten(),
                });
            }
            const timeRange = queryValidation.data.from
                ? {
                    from: queryValidation.data.from,
                    to: queryValidation.data.to,
                }
                : undefined;
            const trajectory = await service.getTrajectory(entityId, timeRange);
            res.json({
                entityId,
                trajectory,
                count: trajectory.length,
            });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * GET /api/geotemporal/entities/:entityId/trajectory/analysis
     *
     * Get trajectory with computed metrics (distance, speed)
     */
    router.get('/entities/:entityId/trajectory/analysis', async (req, res, next) => {
        try {
            const { entityId } = req.params;
            const queryValidation = TrajectoryQuerySchema.safeParse(req.query);
            if (!queryValidation.success) {
                return res.status(400).json({
                    error: 'Invalid query parameters',
                    details: queryValidation.error.flatten(),
                });
            }
            const timeRange = queryValidation.data.from
                ? {
                    from: queryValidation.data.from,
                    to: queryValidation.data.to,
                }
                : undefined;
            const analysis = await service.getTrajectoryAnalysis(entityId, timeRange);
            res.json(analysis);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * GET /api/geotemporal/entities/:entityId/staypoints
     *
     * Detect stay points for an entity
     */
    router.get('/entities/:entityId/staypoints', async (req, res, next) => {
        try {
            const { entityId } = req.params;
            const queryValidation = StayPointQuerySchema.safeParse(req.query);
            if (!queryValidation.success) {
                return res.status(400).json({
                    error: 'Invalid query parameters',
                    details: queryValidation.error.flatten(),
                });
            }
            const { from, to, radiusMeters, minDurationMinutes } = queryValidation.data;
            const stayPoints = await service.getStayPoints(entityId, { from, to }, { radiusMeters, minDurationMinutes });
            res.json({
                entityId,
                stayPoints,
                count: stayPoints.length,
                parameters: {
                    radiusMeters,
                    minDurationMinutes,
                },
            });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * POST /api/geotemporal/copresence
     *
     * Detect co-presence intervals between entities
     */
    router.post('/copresence', async (req, res, next) => {
        try {
            const bodyValidation = CoPresenceBodySchema.safeParse(req.body);
            if (!bodyValidation.success) {
                return res.status(400).json({
                    error: 'Invalid request body',
                    details: bodyValidation.error.flatten(),
                });
            }
            const { entityIds, timeRange, params } = bodyValidation.data;
            const intervals = await service.getCoPresence(entityIds, timeRange, params);
            res.json({
                entityIds,
                timeRange,
                parameters: params,
                intervals,
                count: intervals.length,
            });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * POST /api/geotemporal/convoys
     *
     * Detect convoys (groups moving together)
     */
    router.post('/convoys', async (req, res, next) => {
        try {
            const bodyValidation = ConvoyBodySchema.safeParse(req.body);
            if (!bodyValidation.success) {
                return res.status(400).json({
                    error: 'Invalid request body',
                    details: bodyValidation.error.flatten(),
                });
            }
            const { entityIds, timeRange, params } = bodyValidation.data;
            const convoys = await service.getConvoys(entityIds || [], timeRange, params);
            res.json({
                entityIds: entityIds || 'all',
                timeRange,
                parameters: params,
                convoys,
                count: convoys.length,
            });
        }
        catch (error) {
            next(error);
        }
    });
    return router;
}

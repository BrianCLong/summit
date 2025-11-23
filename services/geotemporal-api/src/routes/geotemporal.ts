/**
 * Geo-Temporal Analytics Routes
 *
 * REST API endpoints for trajectory, stay-point, co-presence, and convoy analytics.
 */

import { Router } from 'express';
import { z } from 'zod';
import type { GeoTemporalService } from '@intelgraph/geospatial';

// Validation schemas
const TimeRangeSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
});

const StayPointParamsSchema = z.object({
  radiusMeters: z.number().positive(),
  minDurationMinutes: z.number().positive(),
});

const CoPresenceParamsSchema = z.object({
  maxDistanceMeters: z.number().positive(),
  minOverlapMinutes: z.number().positive(),
});

const ConvoyParamsSchema = z.object({
  maxDistanceMeters: z.number().positive(),
  minGroupSize: z.number().int().min(2),
  minSteps: z.number().int().min(1),
  stepDurationMinutes: z.number().positive().optional(),
});

const TrajectoryQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const StayPointQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  radiusMeters: z.coerce.number().positive(),
  minDurationMinutes: z.coerce.number().positive(),
});

const CoPresenceBodySchema = z.object({
  entityIds: z.array(z.string()).min(2),
  timeRange: TimeRangeSchema,
  params: CoPresenceParamsSchema,
});

const ConvoyBodySchema = z.object({
  entityIds: z.array(z.string()).optional().default([]),
  timeRange: TimeRangeSchema,
  params: ConvoyParamsSchema,
});

/**
 * Create router with service dependency injection
 */
export default function createRouter(service: GeoTemporalService): Router {
  const router = Router();

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
    } catch (error) {
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
    } catch (error) {
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

      const stayPoints = await service.getStayPoints(
        entityId,
        { from, to },
        { radiusMeters, minDurationMinutes },
      );

      res.json({
        entityId,
        stayPoints,
        count: stayPoints.length,
        parameters: {
          radiusMeters,
          minDurationMinutes,
        },
      });
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      next(error);
    }
  });

  return router;
}

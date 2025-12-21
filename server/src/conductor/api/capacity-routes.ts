import { Router } from 'express';
import logger from '../../config/logger.js';
import {
  AuthenticatedRequest,
  requirePermission,
} from '../auth/rbac-middleware.js';
import {
  listReservations,
  releaseReservation,
  reserveCapacity,
} from '../scheduling/capacity-futures.js';

const router = Router();

router.post(
  '/reserve',
  requirePermission('capacity:manage'),
  async (req, res) => {
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

      const tenantId = (req as AuthenticatedRequest).user?.tenantId;
      const reservation = await reserveCapacity({
        poolId,
        computeUnits: Number(computeUnits),
        durationHours: durationHours ? Number(durationHours) : undefined,
        startAt,
        endAt,
        tenantId,
      });

      logger.info('🆕 Capacity reservation created via API', {
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('❌ Capacity reservation failed', {
        error: errorMessage,
        poolId: req.body?.poolId,
      });
      return res.status(500).json({ error: errorMessage });
    }
  },
);

router.post(
  '/release',
  requirePermission('capacity:manage'),
  async (req, res) => {
    try {
      const { reservationId } = req.body;
      if (!reservationId) {
        return res.status(400).json({ error: 'reservationId is required' });
      }
      const tenantId = (req as AuthenticatedRequest).user?.tenantId;
      const released = await releaseReservation(reservationId, tenantId);
      if (!released) {
        return res.status(404).json({ error: 'Reservation not found' });
      }

      logger.info('🗑️ Capacity reservation released via API', {
        reservationId,
        tenantId,
      });

      return res.json({ released: true });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('❌ Capacity reservation release failed', {
        error: errorMessage,
        reservationId: req.body?.reservationId,
      });
      return res.status(500).json({ error: errorMessage });
    }
  },
);

router.get(
  '/list',
  requirePermission('capacity:read'),
  async (req, res) => {
    try {
      const includeExpired = req.query.includeExpired === 'true';
      const tenantId = (req as AuthenticatedRequest).user?.tenantId;
      const reservations = await listReservations(tenantId, includeExpired);
      logger.info('📄 Capacity reservations listed via API', {
        tenantId,
        count: reservations.length,
        includeExpired,
      });
      return res.json({ reservations });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('❌ Failed to list capacity reservations', {
        error: errorMessage,
      });
      return res.status(500).json({ error: errorMessage });
    }
  },
);

export { router as capacityRoutes };

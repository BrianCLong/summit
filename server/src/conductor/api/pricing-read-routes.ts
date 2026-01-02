import { Router } from 'express';
import { requirePermission } from '../auth/rbac-middleware.js';
import { listPools, currentPricing } from '../scheduling/pools.js';
import logger from '../../config/logger.js';
import {
  pricingReadLatencyMs,
  pricingReadRequestsTotal,
} from '../observability/prometheus.js';

const router = Router();

const recordMetrics = (
  route: string,
  status: 'success' | 'error' | 'bad_request',
  durationMs: number,
) => {
  pricingReadRequestsTotal.inc({ route, status });
  pricingReadLatencyMs.observe({ route }, durationMs);
};

router.get('/pools', requirePermission('pricing:read'), async (_req, res) => {
  const start = Date.now();
  const route = '/pools';
  try {
    const pools = await listPools();
    const durationMs = Date.now() - start;
    recordMetrics(route, 'success', durationMs);
    return res.json({
      success: true,
      data: { pools },
    });
  } catch (error: any) {
    const durationMs = Date.now() - start;
    recordMetrics(route, 'error', durationMs);
    logger.error('Failed to list pools', { error: (error as Error).message });
    return res
      .status(500)
      .json({ success: false, error: 'Failed to fetch pools' });
  }
});

router.get(
  '/pricing/current',
  requirePermission('pricing:read'),
  async (_req, res) => {
    const start = Date.now();
    const route = '/pricing/current';
    try {
      const pricing = await currentPricing();
      const durationMs = Date.now() - start;
      recordMetrics(route, 'success', durationMs);
      return res.json({
        success: true,
        data: { pricing },
      });
    } catch (error: any) {
      const durationMs = Date.now() - start;
      recordMetrics(route, 'error', durationMs);
      logger.error('Failed to fetch current pricing', {
        error: (error as Error).message,
      });
      return res
        .status(500)
        .json({ success: false, error: 'Failed to fetch pricing' });
    }
  },
);

router.post(
  '/pricing/simulate-selection',
  requirePermission('pricing:read'),
  async (req, res) => {
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
      const pools = await listPools();
      const pricing = await currentPricing();

      const considered = pools.map((pool) => {
        const entry: {
          id: string;
          eligible: boolean;
          price: number | null;
          reason: 'ok' | 'residency_mismatch' | 'missing_pricing' | 'no_capacity';
          reservedEligible?: boolean;
          effectivePrice?: number | null;
        } = {
          id: pool.id,
          eligible: true,
          price: null,
          reason: 'ok',
        };

        if (
          residency &&
          !pool.region.toLowerCase().startsWith(residency.toLowerCase())
        ) {
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
          const price =
            (est.cpuSec || 0) * Number(cost.cpu_sec_usd) +
            (est.gbSec || 0) * Number(cost.gb_sec_usd) +
            (est.egressGb || 0) * Number(cost.egress_gb_usd);
          entry.price = price;
          if (includeReservations) {
            entry.reservedEligible = false;
            entry.effectivePrice = price;
          }
        } else if (includeReservations) {
          entry.reservedEligible = false;
          entry.effectivePrice = null;
        }

        return entry;
      });

      const eligible = considered.filter((c) => c.eligible && c.price !== null);
      const chosen = eligible.reduce<null | { id: string; price: number }>(
        (best, current) => {
          if (!best) return { id: current.id, price: current.price as number };
          if ((current.price as number) < best.price) {
            return { id: current.id, price: current.price as number };
          }
          if ((current.price as number) === best.price) {
            return current.id < best.id ? { id: current.id, price: best.price } : best;
          }
          return best;
        },
        null,
      );

      const durationMs = Date.now() - start;
      recordMetrics(route, 'success', durationMs);
      logger.info('Simulated pricing selection', {
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
    } catch (error: any) {
      const durationMs = Date.now() - start;
      recordMetrics(route, 'error', durationMs);
      logger.error('Failed to simulate pricing selection', {
        error: (error as Error).message,
        tenantId,
        residency,
      });
      return res.status(500).json({
        success: false,
        error: 'Failed to simulate pricing selection',
      });
    }
  },
);

export { router as pricingReadRoutes };

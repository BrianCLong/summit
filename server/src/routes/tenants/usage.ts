import { Router } from 'express';
import { z } from 'zod';
import { getPostgresPool } from '../../config/database.js';
import { ensureAuthenticated } from '../../middleware/auth.js';
import { buildRequestValidator } from '../../middleware/request-schema-validator.js';
import { TenantValidator } from '../../middleware/tenantValidator.js';

const router = Router({ mergeParams: true });

const querySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  dimension: z.string().optional(),
  dimensions: z.union([z.string(), z.array(z.string())]).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

const validateRequest = buildRequestValidator({
  zodSchema: querySchema,
  target: 'query',
  allowUnknown: true,
});

const enforceTenant = (req: any, res: any, next: any) => {
  try {
    const tenantId = req.params.tenantId;
    const context = TenantValidator.validateTenantAccess(
      { user: req.user },
      tenantId,
      { validateOwnership: true },
    );
    req.tenantContext = context;
    next();
  } catch (error: any) {
    const status =
      error?.extensions?.code === 'TENANT_REQUIRED' ? 401 : 403;
    res.status(status).json({
      error: 'tenant_access_denied',
      message: error?.message || 'Tenant access denied',
    });
  }
};

router.get('/', ensureAuthenticated, validateRequest, enforceTenant, async (req, res) => {
  const pool = getPostgresPool();
  let client;

  try {
    client = await pool.connect();
  } catch (error: any) {
    return res.status(500).json({
      error: 'usage_rollup_failed',
      message: error?.message || 'Failed to acquire database connection',
    });
  }

  const { tenantId } = req.params;
  const { from, to, dimension, dimensions, limit } = req.query as Record<
    string,
    any
  >;

  const windowEnd = to ?? new Date().toISOString();
  const windowStart =
    from ??
    new Date(Date.parse(windowEnd) - 30 * 24 * 60 * 60 * 1000).toISOString();

  const params: any[] = [tenantId, windowStart, windowEnd];
  const predicates = ['tenant_id = $1', 'period_start >= $2', 'period_end <= $3'];
  let paramIndex = 4;

  const dimensionList =
    (Array.isArray(dimensions) ? dimensions : dimensions ? [dimensions] : [])
      .concat(dimension ? [dimension] : [])
      .filter(Boolean);

  if (dimensionList.length > 0) {
    predicates.push(`kind = ANY($${paramIndex++}::text[])`);
    params.push(dimensionList);
  }

  const effectiveLimit = limit ?? 100;
  const sql = `
    SELECT period_start, period_end, kind, total_quantity, unit, breakdown
    FROM usage_summaries
    WHERE ${predicates.join(' AND ')}
    ORDER BY period_start DESC, kind ASC
    LIMIT ${Number(effectiveLimit)}
  `;

  try {
    const { rows } = await client.query(sql, params);

    res.json({
      tenantId,
      window: { from: windowStart, to: windowEnd },
      rollups: rows.map((row: any) => ({
        dimension: row.kind,
        periodStart:
          typeof row.period_start === 'string'
            ? row.period_start
            : row.period_start?.toISOString?.() || row.period_start,
        periodEnd:
          typeof row.period_end === 'string'
            ? row.period_end
            : row.period_end?.toISOString?.() || row.period_end,
        totalQuantity: Number(row.total_quantity ?? 0),
        unit: row.unit,
        breakdown: row.breakdown || {},
      })),
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'usage_rollup_failed',
      message: error?.message || 'Failed to load usage rollups',
    });
  } finally {
    client.release();
  }
});

export default router;

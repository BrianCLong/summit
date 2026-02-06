import { Router } from 'express';
import { z } from 'zod';
import { getPostgresPool } from '../../config/database.js';
import { ensureAuthenticated } from '../../middleware/auth.js';
import { buildRequestValidator } from '../../middleware/request-schema-validator.js';
import { TenantValidator } from '../../middleware/tenantValidator.js';
import PricingEngine from '../../services/PricingEngine.js';

const router = Router({ mergeParams: true });
const singleParam = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] : value ?? '';

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
    const tenantId = singleParam(req.params.tenantId);
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

  const tenantId = singleParam(req.params.tenantId);
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
    let plan: any = null;
    try {
      const pricing = await PricingEngine.getEffectivePlan(tenantId);
      plan = pricing?.plan || null;
    } catch (error: any) {
      plan = null;
    }

    const { rows } = await client.query(sql, params);
    const rollups = rows.map((row: any) => {
      const totalQuantity = Number(row.total_quantity ?? 0);
      const unitPrice = plan?.limits?.[row.kind]?.unitPrice || 0;
      const estimatedCost = totalQuantity * unitPrice;
      return {
        dimension: row.kind,
        periodStart:
          typeof row.period_start === 'string'
            ? row.period_start
            : row.period_start?.toISOString?.() || row.period_start,
        periodEnd:
          typeof row.period_end === 'string'
            ? row.period_end
            : row.period_end?.toISOString?.() || row.period_end,
        totalQuantity,
        unit: row.unit,
        breakdown: row.breakdown || {},
        estimatedCost,
      };
    });
    const totalEstimatedCost = rollups.reduce(
      (sum: number, rollup: any) => sum + rollup.estimatedCost,
      0,
    );

    res.json({
      tenantId,
      window: { from: windowStart, to: windowEnd },
      rollups,
      totalEstimatedCost,
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

const buildCsv = (rows: Array<Record<string, any>>) => {
  const header = [
    'period_start',
    'period_end',
    'dimension',
    'total_quantity',
    'unit',
    'estimated_cost',
  ];
  const lines = rows.map(row =>
    [
      row.periodStart,
      row.periodEnd,
      row.dimension,
      row.totalQuantity,
      row.unit ?? '',
      row.estimatedCost?.toFixed?.(4) ?? row.estimatedCost ?? 0,
    ]
      .map((value: any) =>
        typeof value === 'string' && value.includes(',')
          ? `"${value.replace(/"/g, '""')}"`
          : value,
      )
      .join(','),
  );
  return [header.join(','), ...lines].join('\n');
};

router.get(
  '/export.json',
  ensureAuthenticated,
  validateRequest,
  enforceTenant,
  async (req, res) => {
    const pool = getPostgresPool();
    const tenantId = singleParam(req.params.tenantId);
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

    const effectiveLimit = limit ?? 500;
    const sql = `
      SELECT period_start, period_end, kind, total_quantity, unit, breakdown
      FROM usage_summaries
      WHERE ${predicates.join(' AND ')}
      ORDER BY period_start DESC, kind ASC
      LIMIT ${Number(effectiveLimit)}
    `;

    let client;
    try {
      client = await pool.connect();
      let plan: any = null;
      try {
        const pricing = await PricingEngine.getEffectivePlan(tenantId);
        plan = pricing?.plan || null;
      } catch (error: any) {
        plan = null;
      }
      const { rows } = await client.query(sql, params);
      const rollups = rows.map((row: any) => {
        const totalQuantity = Number(row.total_quantity ?? 0);
        const unitPrice = plan?.limits?.[row.kind]?.unitPrice || 0;
        const estimatedCost = totalQuantity * unitPrice;
        return {
          dimension: row.kind,
          periodStart:
            typeof row.period_start === 'string'
              ? row.period_start
              : row.period_start?.toISOString?.() || row.period_start,
          periodEnd:
            typeof row.period_end === 'string'
              ? row.period_end
              : row.period_end?.toISOString?.() || row.period_end,
          totalQuantity,
          unit: row.unit,
          breakdown: row.breakdown || {},
          estimatedCost,
        };
      });
      const payload = {
        tenantId,
        window: { from: windowStart, to: windowEnd },
        rollups,
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="usage-${tenantId}.json"`,
      );
      res.status(200).send(JSON.stringify(payload, null, 2));
    } catch (error: any) {
      res.status(500).json({
        error: 'usage_export_failed',
        message: error?.message || 'Failed to export usage rollups',
      });
    } finally {
      client?.release?.();
    }
  },
);

router.get(
  '/export.csv',
  ensureAuthenticated,
  validateRequest,
  enforceTenant,
  async (req, res) => {
    const pool = getPostgresPool();
    const tenantId = singleParam(req.params.tenantId);
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

    const effectiveLimit = limit ?? 500;
    const sql = `
      SELECT period_start, period_end, kind, total_quantity, unit, breakdown
      FROM usage_summaries
      WHERE ${predicates.join(' AND ')}
      ORDER BY period_start DESC, kind ASC
      LIMIT ${Number(effectiveLimit)}
    `;

    let client;
    try {
      client = await pool.connect();
      let plan: any = null;
      try {
        const pricing = await PricingEngine.getEffectivePlan(tenantId);
        plan = pricing?.plan || null;
      } catch (error: any) {
        plan = null;
      }
      const { rows } = await client.query(sql, params);
      const rollups = rows.map((row: any) => {
        const totalQuantity = Number(row.total_quantity ?? 0);
        const unitPrice = plan?.limits?.[row.kind]?.unitPrice || 0;
        const estimatedCost = totalQuantity * unitPrice;
        return {
          dimension: row.kind,
          periodStart:
            typeof row.period_start === 'string'
              ? row.period_start
              : row.period_start?.toISOString?.() || row.period_start,
          periodEnd:
            typeof row.period_end === 'string'
              ? row.period_end
              : row.period_end?.toISOString?.() || row.period_end,
          totalQuantity,
          unit: row.unit,
          breakdown: row.breakdown || {},
          estimatedCost,
        };
      });
      const csv = buildCsv(rollups);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="usage-${tenantId}.csv"`,
      );
      res.status(200).send(csv);
    } catch (error: any) {
      res.status(500).json({
        error: 'usage_export_failed',
        message: error?.message || 'Failed to export usage rollups',
      });
    } finally {
      client?.release?.();
    }
  },
);

export default router;

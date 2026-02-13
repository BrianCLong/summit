import { Router } from 'express';
import crypto from 'crypto';
import { getPostgresPool } from '../db/postgres.js';
import { ProvenanceRepo, ProvenanceFilter } from '../repos/ProvenanceRepo.js';
import { tenantHeader } from '../middleware/tenantHeader.js';

function sign(params: Record<string, string>, secret: string) {
  const base = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHmac('sha256', secret).update(base).digest('hex');
}

function verify(params: Record<string, string>, sig: string, secret: string) {
  const expected = sign(params, secret);
  const expectedBuf = Buffer.from(expected);
  const sigBuf = Buffer.from(sig);
  if (expectedBuf.length !== sigBuf.length) return false;
  try {
    return crypto.timingSafeEqual(expectedBuf, sigBuf);
  } catch {
    return false;
  }
}

function redactForeignTenantIdentifiers(value: any, tenantId: string): any {
  if (Array.isArray(value)) {
    return value.map((item) => redactForeignTenantIdentifiers(item, tenantId));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, val]) => {
      const normalizedKey = key.toLowerCase();
      if (
        typeof val === 'string' &&
        normalizedKey.includes('tenant') &&
        val !== tenantId
      ) {
        acc[key] = '[redacted:foreign-tenant]';
        return acc;
      }
      acc[key] = redactForeignTenantIdentifiers(val, tenantId);
      return acc;
    }, {} as any);
  }
  if (
    typeof value === 'string' &&
    value.startsWith('tenant-') &&
    value !== tenantId
  ) {
    return '[redacted:foreign-tenant]';
  }
  return value;
}

// Optional Redis cache/ratelimit
let redis: any = null;
try {
  const Redis = require('ioredis');
  if (process.env.REDIS_URL) redis = new Redis(process.env.REDIS_URL);
} catch {}

export const exportRouter = Router();

exportRouter.use(tenantHeader());

exportRouter.get('/provenance', async (req, res) => {
  try {
    const scope = String((req.query.scope as any) || '');
    const id = String((req.query.id as any) || '');
    const format = String((req.query.format as any) || 'json').toLowerCase();
    const ts = Number((req.query.ts as any) || 0);
    const sig = String((req.query.sig as any) || '');
    const reasonCodeIn = String((req.query.reasonCodeIn as any) || '');
    const kindIn = String((req.query as any).kindIn || '');
    const sourceIn = String((req.query as any).sourceIn || '');
    const tenant = String((req.query as any).tenant || '');
    const headerTenant = String((req as any).tenantId || '');
    const from = (req.query.from as any) ? String((req.query.from as any)) : undefined;
    const to = (req.query.to as any) ? String((req.query.to as any)) : undefined;
    const contains = (req.query.contains as any)
      ? String((req.query.contains as any))
      : undefined;

    if (!['incident', 'investigation'].includes(scope) || !id) {
      return res.status(400).json({ error: 'invalid_scope_or_id' });
    }
    if (!tenant) return res.status(400).json({ error: 'tenant_required' });
    if (!headerTenant || headerTenant !== tenant)
      return res.status(403).json({ error: 'tenant_mismatch' });

    // Rate limit per-tenant: 5/minute
    if (redis) {
      try {
        const rk = `rate:export:${tenant}:${Math.floor(Date.now() / 60000)}`;
        const c = await redis.incr(rk);
        if (c === 1) await redis.expire(rk, 60);
        if (c > 5)
          return res
            .status(429)
            .json({ error: 'rate_limited', reasonCode: 'RATE_LIMIT' });
      } catch {}
    }

    const secret = process.env.EXPORT_SIGNING_SECRET || 'dev-secret';
    const params: Record<string, string> = {
      scope,
      id,
      format,
      ts: String(ts),
      tenant,
      reasonCodeIn,
      ...(kindIn ? { kindIn } : {}),
      ...(sourceIn ? { sourceIn } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      ...(contains ? { contains } : {}),
    };
    if (!sig || !verify(params, sig, secret))
      return res.status(403).json({ error: 'invalid_signature' });
    if (Math.abs(Date.now() - ts) > 15 * 60 * 1000)
      return res.status(403).json({ error: 'expired' });

    const pg = getPostgresPool();
    const repo = new ProvenanceRepo(pg);
    const filter: ProvenanceFilter = {};
    if (reasonCodeIn)
      filter.reasonCodeIn = reasonCodeIn.split(',').filter(Boolean);
    if (kindIn) filter.kindIn = kindIn.split(',').filter(Boolean);
    if (sourceIn) filter.sourceIn = sourceIn.split(',').filter(Boolean);
    if (from) filter.from = from;
    if (to) filter.to = to;
    if (contains) filter.contains = contains;
    const first = Math.min(Number((req.query.first as any) || 1000), 5000);
    const offset = Math.max(Number((req.query.offset as any) || 0), 0);

    // Cache JSON responses 60s
    const cacheKey = `exp:${crypto
      .createHash('sha1')
      .update(JSON.stringify({ scope, id, filter, first, offset, tenant }))
      .digest('hex')}`;
    if (format === 'json' && redis) {
      try {
        const hit = await redis.get(cacheKey);
        if (hit) return res.json(JSON.parse(hit));
      } catch {}
    }

    const rows = await repo.by(scope as any, id, filter, first, offset, tenant);

    const scopedRows = rows
      .filter((row: any) => !row.tenantId || row.tenantId === tenant)
      .map((row: any) => ({
        ...row,
        metadata: redactForeignTenantIdentifiers(row.metadata, tenant),
      }));

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('X-Row-Count', String(scopedRows.length));
      res.write('id,kind,createdAt,reasonCode\n');
      for (const r of scopedRows) {
        const line = `${r.id || ''},${r.kind || ''},${new Date(r.createdAt || Date.now()).toISOString()},${
          (r.metadata && (r.metadata.reasonCode || r.metadata.reason_code)) ||
          ''
        }\n`;
        res.write(line);
      }
      return res.end();
    }

    const payload = { count: scopedRows.length, data: scopedRows };
    if (redis && format === 'json') {
      try {
        await redis.setex(cacheKey, 60, JSON.stringify(payload));
      } catch {}
    }
    return res.json(payload);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'export_failed' });
  }
});

export default exportRouter;

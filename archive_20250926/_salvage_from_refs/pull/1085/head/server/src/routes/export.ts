import { Router } from 'express';
import crypto from 'crypto';
import { getPostgresPool } from '../db/postgres.js';
import { ProvenanceRepo, ProvenanceFilter } from '../repos/ProvenanceRepo.js';

function sign(params: Record<string, string>, secret: string) {
  const base = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHmac('sha256', secret).update(base).digest('hex');
}

function verify(params: Record<string, string>, sig: string, secret: string) {
  const expected = sign(params, secret);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

// Optional Redis cache/ratelimit
let redis: any = null;
try {
   
  const Redis = require('ioredis');
  if (process.env.REDIS_URL) redis = new Redis(process.env.REDIS_URL);
} catch {}

export const exportRouter = Router();

exportRouter.get('/provenance', async (req, res) => {
  try {
    const scope = String(req.query.scope || '');
    const id = String(req.query.id || '');
    const format = String(req.query.format || 'json').toLowerCase();
    const ts = Number(req.query.ts || 0);
    const sig = String(req.query.sig || '');
    const reasonCodeIn = String(req.query.reasonCodeIn || '');
    const kindIn = String((req.query as any).kindIn || '');
    const sourceIn = String((req.query as any).sourceIn || '');
    const tenant = String((req.query as any).tenant || '');
    const headerTenant = String(((req as any).tenantId || ''));
    const from = req.query.from ? String(req.query.from) : undefined;
    const to = req.query.to ? String(req.query.to) : undefined;
    const contains = req.query.contains ? String(req.query.contains) : undefined;

    if (!['incident', 'investigation'].includes(scope) || !id) {
      return res.status(400).json({ error: 'invalid_scope_or_id' });
    }
    if (!tenant) return res.status(400).json({ error: 'tenant_required' });
    if (!headerTenant || headerTenant !== tenant) return res.status(403).json({ error: 'tenant_mismatch' });

    // Rate limit per-tenant: 5/minute
    if (redis) {
      try {
        const rk = `rate:export:${tenant}:${Math.floor(Date.now() / 60000)}`;
        const c = await redis.incr(rk);
        if (c === 1) await redis.expire(rk, 60);
        if (c > 5) return res.status(429).json({ error: 'rate_limited', reasonCode: 'RATE_LIMIT' });
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
    if (!sig || !verify(params, sig, secret)) return res.status(403).json({ error: 'invalid_signature' });
    if (Math.abs(Date.now() - ts) > 15 * 60 * 1000) return res.status(403).json({ error: 'expired' });

    const pg = getPostgresPool();
    const repo = new ProvenanceRepo(pg);
    const filter: ProvenanceFilter = {};
    if (reasonCodeIn) filter.reasonCodeIn = reasonCodeIn.split(',').filter(Boolean);
    if (kindIn) filter.kindIn = kindIn.split(',').filter(Boolean);
    if (sourceIn) filter.sourceIn = sourceIn.split(',').filter(Boolean);
    if (from) filter.from = from;
    if (to) filter.to = to;
    if (contains) filter.contains = contains;
    const first = Math.min(Number(req.query.first || 1000), 5000);
    const offset = Math.max(Number(req.query.offset || 0), 0);

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

    const rows = await repo.by(scope as any, id, filter, first, offset);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('X-Row-Count', String(rows.length));
      res.write('id,kind,createdAt,reasonCode\n');
      for (const r of rows) {
        const line = `${r.id || ''},${r.kind || ''},${new Date(r.createdAt || Date.now()).toISOString()},${
          (r.metadata && (r.metadata.reasonCode || r.metadata.reason_code)) || ''
        }\n`;
        res.write(line);
      }
      return res.end();
    }

    const payload = { count: rows.length, data: rows };
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

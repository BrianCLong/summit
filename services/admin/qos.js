"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pg_1 = require("pg");
const zod_1 = require("zod");
const r = (0, express_1.Router)();
const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
const OverrideSchema = zod_1.z.object({
    tenant_id: zod_1.z.string().min(1),
    expert: zod_1.z.string().optional(), // optional = all
    explore_max: zod_1.z.number().min(0).max(1),
    ttl_minutes: zod_1.z
        .number()
        .int()
        .min(5)
        .max(24 * 60),
    reason: zod_1.z.string().min(3),
});
r.post('/admin/qos/override', async (req, res) => {
    // RBAC: require admin role
    if (!req.user?.roles?.includes('admin'))
        return res.status(403).json({ error: 'forbidden' });
    const p = OverrideSchema.safeParse(req.body);
    if (!p.success)
        return res
            .status(400)
            .json({ error: 'invalid', details: p.error.flatten() });
    const { tenant_id, expert, explore_max, ttl_minutes, reason } = p.data;
    const actor = req.user?.id ?? 'unknown';
    const q = `
    insert into qos_overrides(tenant_id, expert, explore_max, expires_at, reason, actor)
    values ($1,$2,$3, now() + ($4 || ' minutes')::interval, $5, $6)
    returning id, expires_at`;
    const { rows } = await pool.query(q, [
        tenant_id,
        expert ?? null,
        explore_max,
        ttl_minutes,
        reason,
        actor,
    ]);
    res
        .status(201)
        .json({ ok: true, id: rows[0].id, expires_at: rows[0].expires_at });
});
r.get('/admin/qos/override', async (req, res) => {
    const { tenant_id, expert } = req.query;
    const { rows } = await pool.query(`select * from qos_overrides
     where tenant_id=$1 and (expert is null or expert=$2) and expires_at > now()
     order by expires_at desc`, [tenant_id, expert ?? null]);
    res.json({ items: rows });
});
const ExtendSchema = zod_1.z.object({
    reason: zod_1.z.string().min(3),
    extend_minutes: zod_1.z
        .number()
        .int()
        .min(5)
        .optional()
        .default(7 * 24 * 60),
});
r.post('/admin/qos/override/:id/extend', async (req, res) => {
    if (!req.user?.roles?.includes('admin'))
        return res.status(403).json({ error: 'forbidden' });
    const p = ExtendSchema.safeParse(req.body);
    if (!p.success)
        return res
            .status(400)
            .json({ error: 'invalid', details: p.error.flatten() });
    const { reason, extend_minutes } = p.data;
    const actor = req.user?.id ?? 'unknown';
    const q = `
        update qos_overrides
        set expires_at = expires_at + ($1 || ' minutes')::interval,
            reason = reason || '; extended by ' || $2 || ' for ' || $3
        where id = $4 and expires_at > now()
        returning id, expires_at`;
    const { rows } = await pool.query(q, [
        extend_minutes,
        actor,
        reason,
        req.params.id,
    ]);
    if (rows.length === 0)
        return res.status(404).json({ error: 'not_found_or_expired' });
    res.json({ ok: true, id: rows[0].id, expires_at: rows[0].expires_at });
});
exports.default = r;

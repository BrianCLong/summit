"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pg_1 = require("pg");
const r = (0, express_1.Router)();
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
r.get('/admin/notices', async (req, res) => {
    const tenant = req.user?.tenant;
    if (!tenant)
        return res.status(401).json({ error: 'unauthenticated' });
    const { rows } = await pg.query('select id, kind, message, severity, expires_at from tenant_notices where tenant_id=$1 and expires_at > now() order by created_at desc', [tenant]);
    res.json({ items: rows });
});
exports.default = r;

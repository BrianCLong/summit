"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pg_1 = require("pg");
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
const r = (0, express_1.Router)();
r.get('/replicate', async (req, res) => {
    const since = Number(req.query.since || 0);
    res.setHeader('content-type', 'application/x-ndjson');
    const { rows } = await pg.query(`SELECT seq, region, site_id, run_id, event, payload, lamport, ts
     FROM run_ledger WHERE seq > $1 ORDER BY seq ASC LIMIT 10000`, [since]);
    for (const row of rows)
        res.write(JSON.stringify(row) + '\n');
    res.end();
});
exports.default = r;

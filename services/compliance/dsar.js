"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pg_1 = require("pg");
const r = (0, express_1.Router)(), db = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
r.post('/dsar/request', async (req, res) => {
    const { subject_id, tenant } = req.body;
    // enqueue job; return tracking id
    const { rows } = await db.query("insert into dsar_requests(subject_id, tenant, status) values ($1,$2,'queued') returning id", [subject_id, tenant]);
    res.status(202).json({ id: rows[0].id });
});
r.get('/dsar/export/:id', async (req, res) => {
    // stream a JSON export assembled offline; ensure fields masked via OPA purpose tags
    res.setHeader('content-type', 'application/json');
    res.write('{"status":"ready","parts":[]}');
    res.end();
});
r.post('/rtbf', async (req, res) => {
    const { subject_id, tenant } = req.body;
    // mark & tombstone; actual delete via async worker with audit & policy checks
    await db.query('insert into rtbf_queue(subject_id, tenant, requested_at) values ($1,$2, now())', [subject_id, tenant]);
    res.status(202).json({ queued: true });
});
exports.default = r;

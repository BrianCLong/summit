"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pg_1 = require("pg");
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
const r = (0, express_1.Router)();
r.get('/regions/stream', async (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });
    const tick = async () => {
        const { rows: latest } = await pg.query(`SELECT COALESCE(MAX(seq),0) AS max FROM run_ledger`);
        const max = Number(latest[0].max || 0);
        const { rows: wms } = await pg.query(`SELECT peer, last_seq, EXTRACT(EPOCH FROM now()-updated_at)::int AS age FROM ledger_watermarks`);
        const out = wms.map((w) => ({
            region: process.env.REGION_ID,
            peer: w.peer,
            seq: Number(w.last_seq || 0),
            lag: Math.max(0, max - Number(w.last_seq || 0)),
            status: Number(w.age || 9999) < 30 ? 'healthy' : 'stale',
        }));
        res.write(`data: ${JSON.stringify(out)}\n\n`);
    };
    const id = setInterval(tick, 2000);
    await tick();
    req.on('close', () => clearInterval(id));
});
exports.default = r;

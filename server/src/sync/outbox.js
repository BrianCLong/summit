"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueSync = enqueueSync;
exports.pump = pump;
const pg_1 = require("pg");
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
async function enqueueSync(siteId, kind, ref, payload) {
    await pg.query(`INSERT INTO sync_outbox(site_id,kind,ref,payload) VALUES ($1,$2,$3,$4)`, [siteId, kind, ref, payload || null]);
}
async function pump(siteId, send) {
    const { rows } = await pg.query(`SELECT * FROM sync_outbox WHERE site_id=$1 AND status='QUEUED' ORDER BY id LIMIT 500`, [siteId]);
    for (const r of rows) {
        const ok = await send(r);
        if (ok)
            await pg.query(`UPDATE sync_outbox SET status='SENT' WHERE id=$1`, [
                r.id,
            ]);
        else
            await pg.query(`UPDATE sync_outbox SET retries=retries+1 WHERE id=$1`, [
                r.id,
            ]);
    }
}

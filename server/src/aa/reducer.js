"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reduce = reduce;
const pg_1 = require("pg");
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
async function reduce(events) {
    // deterministic replay (L, then region tie-breaker)
    for (const e of events.sort((a, b) => a.lamport - b.lamport || a.region.localeCompare(b.region))) {
        switch (e.event) {
            case 'run.start':
                await pg.query(`INSERT INTO run(id,status,started_at,meta)
           VALUES ($1,'RUNNING',now(),$2)
           ON CONFLICT (id) DO NOTHING`, [e.run_id, e.payload?.meta || {}]);
                break;
            case 'step.done':
                await pg.query(`INSERT INTO run_event(run_id,kind,payload) VALUES ($1,'step.done',$2)`, [e.run_id, e.payload || {}]);
                break;
            case 'attach.artifact':
                await pg.query(`INSERT INTO cas_objects(digest,size,storage_uri)
           VALUES ($1,$2,$3) ON CONFLICT (digest) DO NOTHING`, [e.payload?.digest, e.payload?.size || 0, e.payload?.uri || '']);
                break;
            case 'run.end':
                await pg.query(`UPDATE run SET status=$2, finished_at=now() WHERE id=$1`, [e.run_id, e.payload?.status || 'DONE']);
                break;
            default:
                // ignore unknowns
                break;
        }
    }
}

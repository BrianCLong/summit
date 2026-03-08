"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCached = getCached;
exports.putCached = putCached;
const pg_1 = require("pg");
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
async function getCached(key) {
    const { rows: [r], } = await pg.query(`SELECT artifact_digests FROM step_cache WHERE key=$1`, [
        key,
    ]);
    return r?.artifact_digests || null;
}
async function putCached(key, digests) {
    await pg.query(`INSERT INTO step_cache(key,artifact_digests) VALUES ($1,$2) ON CONFLICT (key) DO NOTHING`, [key, digests]);
}

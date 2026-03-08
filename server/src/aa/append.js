"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.append = append;
const pg_1 = require("pg");
const lamport_js_1 = require("./lamport.js");
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
async function append(runId, event, payload, siteId) {
    const L = (0, lamport_js_1.nextLamport)();
    await pg.query(`INSERT INTO run_ledger(region,site_id,run_id,event,payload,lamport)
     VALUES ($1,$2,$3,$4,$5,$6)`, [
        process.env.REGION_ID || 'US',
        siteId || null,
        runId,
        event,
        payload || {},
        L,
    ]);
}

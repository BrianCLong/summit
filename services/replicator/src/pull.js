"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pullFrom = pullFrom;
const node_fetch_1 = __importDefault(require("node-fetch"));
const readline_1 = __importDefault(require("readline"));
const pg_1 = require("pg");
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
async function pullFrom(peer, url) {
    const { rows: [wm], } = await pg.query(`SELECT last_seq FROM ledger_watermarks WHERE peer=$1`, [
        peer,
    ]);
    const since = wm?.last_seq || 0;
    const res = await (0, node_fetch_1.default)(`${url}?since=${since}`, {
        headers: { 'x-peer': String(process.env.REGION_ID || '') },
    });
    const rl = readline_1.default.createInterface({ input: res.body });
    let last = since;
    for await (const line of rl) {
        const ev = JSON.parse(line);
        await pg.query(`INSERT INTO run_ledger(region,site_id,run_id,event,payload,lamport,ts)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`, [
            ev.region,
            ev.site_id || null,
            ev.run_id,
            ev.event,
            ev.payload || {},
            ev.lamport,
            ev.ts || new Date().toISOString(),
        ]);
        last = Math.max(last, Number(ev.seq || 0));
    }
    await pg.query(`INSERT INTO ledger_watermarks(peer,last_seq,updated_at)
     VALUES ($1,$2,now()) ON CONFLICT (peer) DO UPDATE SET last_seq=EXCLUDED.last_seq, updated_at=now()`, [peer, last]);
}

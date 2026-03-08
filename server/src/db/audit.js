"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAssistantEvent = logAssistantEvent;
const pg_1 = require("pg");
const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
async function logAssistantEvent(opts) {
    await pool.query(`insert into assistant_audit (req_id, user_id, mode, input, tokens, ms, status)
     values ($1,$2,$3,$4,$5,$6,$7)`, [
        opts.reqId,
        opts.userId,
        opts.mode,
        opts.input,
        opts.tokens,
        opts.ms,
        opts.status,
    ]);
}

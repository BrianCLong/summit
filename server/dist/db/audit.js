import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export async function logAssistantEvent(opts) {
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
//# sourceMappingURL=audit.js.map
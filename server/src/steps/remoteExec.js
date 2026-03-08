"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remoteExecStep = remoteExecStep;
const queue_js_1 = require("../relay/queue.js");
const pg_1 = require("pg");
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
async function remoteExecStep(ctx, step) {
    const siteId = step.inputs?.siteId || ctx.meta?.siteId;
    if (!siteId)
        throw new Error('REMOTE.EXEC requires siteId');
    const payload = {
        runId: ctx.id,
        stepId: step.id,
        snapshotRef: ctx.snapshot?.digest,
        args: step.inputs?.args || {},
    };
    const ticket = await (0, queue_js_1.enqueue)(siteId, 'exec.step', payload);
    await pg.query(`INSERT INTO remote_tickets(ticket_id, site_id, run_id, step_id, status)
     VALUES ($1,$2,$3,$4,'PENDING') ON CONFLICT DO NOTHING`, [ticket, siteId, ctx.id, step.id]);
    const start = Date.now();
    const timeout = Number(step.inputs?.timeoutMs || 30 * 60 * 1000);
    for (;;) {
        const { rows: [r], } = await pg.query(`SELECT status, result FROM remote_tickets WHERE ticket_id=$1`, [ticket]);
        if (r?.status === 'DONE') {
            const digests = r.result?.artifacts || [];
            if (digests.length)
                await ctx.attachArtifacts(digests);
            return { ticket };
        }
        if (Date.now() - start > timeout)
            throw new Error('REMOTE.EXEC timeout');
        await new Promise((res) => setTimeout(res, 1500));
    }
}

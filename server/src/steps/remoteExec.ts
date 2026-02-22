import { enqueue } from '../relay/queue';
import { Pool } from 'pg';
const pg = new Pool({ connectionString: process.env.DATABASE_URL });

export async function remoteExecStep(ctx: any, step: any) {
  const siteId = step.inputs?.siteId || ctx.meta?.siteId;
  if (!siteId) throw new Error('REMOTE.EXEC requires siteId');
  const payload = {
    runId: ctx.id,
    stepId: step.id,
    snapshotRef: ctx.snapshot?.digest,
    args: step.inputs?.args || {},
  };
  const ticket = await enqueue(siteId, 'exec.step', payload);
  await pg.query(
    `INSERT INTO remote_tickets(ticket_id, site_id, run_id, step_id, status)
     VALUES ($1,$2,$3,$4,'PENDING') ON CONFLICT DO NOTHING`,
    [ticket, siteId, ctx.id, step.id],
  );
  const start = Date.now();
  const timeout = Number(step.inputs?.timeoutMs || 30 * 60 * 1000);
  for (;;) {
    const {
      rows: [r],
    } = await pg.query(
      `SELECT status, result FROM remote_tickets WHERE ticket_id=$1`,
      [ticket],
    );
    if (r?.status === 'DONE') {
      const digests: string[] = (r.result?.artifacts as string[]) || [];
      if (digests.length) await ctx.attachArtifacts(digests);
      return { ticket };
    }
    if (Date.now() - start > timeout) throw new Error('REMOTE.EXEC timeout');
    await new Promise((res) => setTimeout(res, 1500));
  }
}

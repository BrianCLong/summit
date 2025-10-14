import crypto from 'node:crypto';

export async function emitAudit(ctx: any, input: any) {
  const evidenceId = crypto.randomUUID();
  const ts = new Date().toISOString();
  const evt = { evidenceId, ts, actor: ctx.actor.id, input };
  // In production: write to SIEM sink + evidence store
  ctx.logger.info({ audit: evt }, 'audit_emit');
  return { evidenceId, ts, actor: ctx.actor.id };
}
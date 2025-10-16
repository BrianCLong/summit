import { applyDp } from '../../dp';

export async function cleanroomJoin(ctx: any, step: any) {
  const cfg = step.inputs || {};
  const joined = await ctx.enclave.join(cfg.joinKeys || [], cfg.select || []);
  if (cfg.dp && Array.isArray(cfg.dp.columns)) {
    for (const col of cfg.dp.columns)
      joined[col] = applyDp(joined[col], cfg.dp);
  }
  ctx.emitArtifact('cleanroom.json', Buffer.from(JSON.stringify(joined)));
}

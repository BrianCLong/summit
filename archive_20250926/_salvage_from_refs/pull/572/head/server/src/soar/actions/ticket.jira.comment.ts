export default async function comment(params: any, ctx: any) {
  if (ctx.simulate) return { simulated: true };
  return { ok: true };
}

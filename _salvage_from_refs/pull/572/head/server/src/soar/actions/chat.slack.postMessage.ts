export default async function postMessage(params: any, ctx: any) {
  if (ctx.simulate) return { simulated: true };
  if (!ctx.token) throw new Error('missing_token');
  return { ok: true, channel: params.channel };
}

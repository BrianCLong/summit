export default async function close(params: any, ctx: any) {
  if (ctx.simulate) return { simulated: true };
  return { closed: true };
}

export default async function tagEntity(params: any, ctx: any) {
  if (ctx.simulate) return { simulated: true };
  return { tagged: params.id };
}

export default async function create(params: any, ctx: any) {
  if (ctx.simulate) return { simulated: true };
  return { sys_id: 'SN-1', ...params };
}

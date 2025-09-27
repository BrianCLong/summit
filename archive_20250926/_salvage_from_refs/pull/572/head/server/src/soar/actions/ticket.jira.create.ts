export default async function create(params: any, ctx: any) {
  if (ctx.simulate) return { simulated: true };
  return { key: 'JIRA-1', ...params };
}

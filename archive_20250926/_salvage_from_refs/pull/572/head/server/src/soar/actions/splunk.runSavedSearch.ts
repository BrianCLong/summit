export default async function runSavedSearch(params: any, ctx: any) {
  if (ctx.simulate) return { simulated: true };
  return { results: [] };
}

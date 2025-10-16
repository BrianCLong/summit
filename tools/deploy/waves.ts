import fetch from 'node-fetch';
type Region = { name: string; weight: number; traffic: string };
const regions: Region[] = [
  { name: 'eu-west-1', weight: 1, traffic: 'low' },
  { name: 'us-east-1', weight: 2, traffic: 'high' },
  { name: 'ap-south-1', weight: 1, traffic: 'med' },
];
async function healthy() {
  const r = await fetch(process.env.SLO_URL!);
  return (await r.json()).burnRateP95 < 1.0;
}
(async () => {
  const wave0 = regions.filter((r) => r.traffic === 'low');
  const wave1 = regions.filter((r) => r.traffic !== 'low');
  await rollout(wave0);
  if (await healthy())
    await Promise.all([rollout([wave1[0]]), rollout([wave1[1]])]);
  else process.exit(1);
})();
async function rollout(rs: Region[]) {
  for (const r of rs) {
    console.log('rollout', r.name); /* kubectl/argo here */
  }
}

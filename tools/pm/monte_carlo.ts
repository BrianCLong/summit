import * as fs from 'fs';
const samples = JSON.parse(fs.readFileSync('ci_cycle_samples.json', 'utf8')); // minutes per PR from engintel
function monte(n = 10000) {
  let out: number[] = [];
  for (let i = 0; i < n; i++) {
    const s = [...Array(12)].reduce(
      (a) => a + samples[Math.floor(Math.random() * samples.length)],
      0,
    );
    out.push(s);
  }
  return out.sort((a, b) => a - b);
}
const dist = monte();
console.log(
  JSON.stringify({
    p50: dist[Math.floor(dist.length * 0.5)],
    p90: dist[Math.floor(dist.length * 0.9)],
    p95: dist[Math.floor(dist.length * 0.95)],
  }),
);

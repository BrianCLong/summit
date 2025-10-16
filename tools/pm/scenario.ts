import fs from 'fs';
const cap = JSON.parse(fs.readFileSync('capacity.json', 'utf8')); // per-dev hours/week + skills
const items = JSON.parse(fs.readFileSync('sprint_candidates.json', 'utf8')); // {effort, skill, risk}
function simulate(weeks = 2, trials = 5000) {
  const res = [];
  for (let t = 0; t < trials; t++) {
    let hours = cap.total * weeks,
      done = 0,
      risk = 0;
    for (const it of items) {
      const e = gauss(it.effort, it.effort * 0.2);
      if (hours >= e) {
        hours -= e;
        done++;
        risk += it.risk || 0.1;
      }
    }
    res.push({ done, risk });
  }
  return percentile(
    res.map((x) => x.done),
    0.5,
  );
}
function gauss(mu, sig) {
  const u = Math.random(),
    v = Math.random();
  return mu + Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * sig;
}
function percentile(a, p) {
  a.sort((x, y) => x - y);
  return a[Math.floor(a.length * p)];
}
console.log(JSON.stringify({ p50Done: simulate() }));

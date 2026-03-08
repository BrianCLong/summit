#!/usr/bin/env node
// MIT: load `releases.json` (array of {date,release,determinism_score (0..1),gates:{pass:n, fail:m}})
// -> writes reports/release-sparkline.html
import fs from 'fs';

const input = process.argv[2] || './build/releases.json';
if (!fs.existsSync(input)) {
  console.error(`Missing ${input}`);
  process.exit(2);
}
const data = JSON.parse(fs.readFileSync(input, 'utf8'));
if (!Array.isArray(data) || data.length === 0) {
  console.error('No releases in input JSON');
  process.exit(2);
}

function svgSparkline(points, w = 600, h = 40) {
  const vals = points.map(p => p.v);
  const min = Math.min(...vals), max = Math.max(...vals);
  const norm = vals.map(v => (max === min ? h / 2 : h - ((v - min) / (max - min)) * h));
  const step = w / (Math.max(vals.length - 1, 1));
  const d = norm.map((y, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${y}`).join(' ');
  return `<svg width='${w}' height='${h}' viewBox='0 0 ${w} ${h}' xmlns='http://www.w3.org/2000/svg'><path d='${d}' fill='none' stroke='#2563eb' stroke-width='1.5' stroke-linejoin='round'/></svg>`;
}

const points = data.map(r => ({
  t: r.date,
  v: r.determinism_score ?? 0,
  release: r.release,
  gates: r.gates || {}
}));

const spark = svgSparkline(points);
const rows = points.map(p =>
  `<tr><td>${p.t}</td><td>${p.release}</td><td>${Math.round(p.v * 100)}%</td><td>${p.gates.pass || 0}/${p.gates.fail || 0}</td></tr>`
).join('\n');

const html = `<!doctype html><meta charset='utf-8'><title>Release sparkline timeline</title>
<style>
  body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial;background:#fff;color:#0f172a;padding:12px}
  h3{margin:0 0 8px 0}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th,td{padding:6px;border-top:1px solid #eef2f7;font-size:13px;text-align:left}
  thead th{position:sticky;top:0;background:#fff}
</style>
<h3>Release determinism sparkline</h3>
${spark}
<table>
  <thead><tr><th>date</th><th>release</th><th>determinism</th><th>gates pass/fail</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;

fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/release-sparkline.html', html);
console.log('wrote reports/release-sparkline.html');

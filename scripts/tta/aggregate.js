const fs = require('fs');
const path = require('path');
const byDay = {};
if (!fs.existsSync('docs/ops/tta/log.ndjson')) process.exit(0);
fs.readFileSync('docs/ops/tta/log.ndjson', 'utf8')
  .trim()
  .split(/\n/)
  .forEach((line) => {
    if (!line) return;
    const r = JSON.parse(line);
    const day = new Date(r.ts).toISOString().slice(0, 10);
    byDay[day] ||= { searches: 0, clicks: 0, successes: 0, tta_ms: [] };
    if (r.ev === 'search_input') byDay[day].searches++;
    if (r.ev === 'doc_click') byDay[day].clicks++;
    if (r.ev === 'doc_success' && r.attrs?.tta_ms) {
      byDay[day].successes++;
      byDay[day].tta_ms.push(r.attrs.tta_ms);
    }
  });
const out = Object.entries(byDay).map(([d, v]) => ({
  date: d,
  searches: v.searches,
  clicks: v.clicks,
  successes: v.successes,
  tta_p50: p(v.tta_ms, 0.5),
  tta_p90: p(v.tta_ms, 0.9),
}));
function p(arr, q) {
  if (!arr.length) return null;
  const a = [...arr].sort((a, b) => a - b);
  const i = Math.max(0, Math.min(a.length - 1, Math.floor(q * (a.length - 1))));
  return a[i];
}
fs.mkdirSync('docs/ops/tta', { recursive: true });
fs.writeFileSync('docs/ops/tta/summary.json', JSON.stringify(out, null, 2));

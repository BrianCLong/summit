const fs = require('fs');
function safe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return [];
  }
}
const stale = safe('docs-stale-report.json'); // from existing sweep
const a11y = safe('docs/ops/telemetry/build.json');
const tta = safe('docs/ops/tta/summary.json');
const zeros = safe('docs/search-queries.json'); // produce via Algolia API job
const broken = Number(process.env.LINK_FAILS || 0);
const latestTta = tta[tta.length - 1] || {};
function score(page) {
  const isStale = stale.includes(page) ? 1 : 0;
  const zr = zeros.find?.((z) => z.page === page)?.count || 0;
  const s =
    isStale * 2 +
    (zr > 0 ? 1 : 0) +
    (latestTta.tta_p90 > 60000 ? 1 : 0) +
    (broken > 0 ? 1 : 0);
  return s;
}
// naive: rank stale pages by score
const ranked = (stale || [])
  .map((p) => ({ page: p, score: score(p) }))
  .sort((a, b) => b.score - a.score);
fs.writeFileSync('docs/ops/debt-radar.json', JSON.stringify(ranked, null, 2));

#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const fg = require('fast-glob');

function scoreClaim(claim) {
  const hasCitation = Array.isArray(claim.citations) && claim.citations.length > 0;
  const hasUrl = hasCitation && claim.citations.every(c => typeof c.url === 'string' && c.url.startsWith('http'));
  const hasQuote = hasCitation && claim.citations.every(c => typeof c.quote === 'string' && c.quote.length > 0);
  const grounded = hasCitation && hasUrl && hasQuote;
  const penalties = [];
  if (!hasCitation) penalties.push('no-citations');
  if (!hasUrl) penalties.push('bad-url');
  if (!hasQuote) penalties.push('no-quote');
  const base = grounded ? 1 : 0;
  return { grounded, score: base, penalties };
}

function evaluateDoc(doc) {
  const results = doc.claims.map((cl, i) => ({ idx: i, ...scoreClaim(cl) }));
  const avgScore = results.reduce((a,b)=>a+b.score,0)/(results.length||1);
  const gaps = results.filter(r=>!r.grounded).length;
  return { avgScore, gaps, results };
}

function loadJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

function toSarif(report) {
  return {
    version: '2.1.0',
    runs: [{
      tool: { driver: { name: 'GroundingVerifier', rules: [{ id: 'GROUNDING_GAP', name: 'Missing or invalid citations' }] } },
      results: report.cases.flatMap(c => c.results.filter(r=>!r.grounded).map(r => ({
        ruleId: 'GROUNDING_GAP',
        level: 'warning',
        message: { text: `Ungrounded claim idx=${r.idx} in ${c.file}: ${r.penalties.join(',')}` },
        locations: [{ physicalLocation: { artifactLocation: { uri: c.file } } }]
      })))
    }]
  };
}

async function main() {
  const args = process.argv.slice(2);
  const cfg = { input: 'tools/check-grounding/cases', json: 'reports/grounding-report.json', sarif: 'reports/grounding.sarif', md: 'reports/grounding-summary.md', minScore: 0.9, maxGaps: 0 };
  for (let i=0;i<args.length;i+=2){
    const k=args[i], v=args[i+1]; if (!v) continue;
    if (k==='--input') cfg.input=v;
    if (k==='--json') cfg.json=v;
    if (k==='--sarif') cfg.sarif=v;
    if (k==='--md') cfg.md=v;
    if (k==='--min-score') cfg.minScore=parseFloat(v);
    if (k==='--max-gaps') cfg.maxGaps=parseInt(v,10);
  }
  const files = await fg([`${cfg.input}/**/*.json`]);
  const cases = files.map(f => ({ file: f, ...evaluateDoc(loadJson(f)) }));
  const avg = cases.reduce((a,c)=>a+c.avgScore,0)/(cases.length||1);
  const totalGaps = cases.reduce((a,c)=>a+c.gaps,0);
  const report = { summary: { files: cases.length, avgScore: avg, totalGaps }, cases };

  fs.mkdirSync(path.dirname(cfg.json), { recursive: true });
  fs.writeFileSync(cfg.json, JSON.stringify(report, null, 2));
  fs.writeFileSync(cfg.sarif, JSON.stringify(toSarif(report), null, 2));
  fs.writeFileSync(cfg.md, `**Grounding Verification**
- Files: ${cases.length}
- Avg score: ${(avg*100).toFixed(1)}%
- Gaps: ${totalGaps}
`);

  if (avg < cfg.minScore || totalGaps > cfg.maxGaps) {
    console.error(`Grounding thresholds not met: avg=${avg}, gaps=${totalGaps}`);
    process.exit(1);
  }
}

if (require.main === module) { main(); }
module.exports = { evaluateDoc };

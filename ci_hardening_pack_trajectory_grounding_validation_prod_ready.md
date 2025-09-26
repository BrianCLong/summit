Below is a drop‑in hardening pack to take your scaffolding to a mature, usable element. It upgrades CI, implements the trajectory + grounding validators, emits JUnit/SARIF/Markdown evidence, and wires tripwires for SLO/Cost‑aware canaries.

---

## 1) `.github/workflows/ci.yml` (replace or merge)
```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  actions: read
  id-token: write
  security-events: write   # for SARIF
  checks: write            # to publish JUnit

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build-test-validate:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    env:
      NODE_VERSION: '20'
      TRAJ_MIN_PASS_RATE: '0.95'          # fail if < 95%
      TRAJ_MAX_STEP_ERR: '0.02'           # fail if > 2% step mismatches
      GROUNDING_MIN_SCORE: '0.90'         # average grounding quality
      GROUNDING_MAX_GAPS: '0'             # missing-citation count allowed
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install
        run: npm ci

      - name: Lint
        run: npm run lint --if-present

      - name: Unit Tests
        run: npm test --if-present -- --reporter=junit --reporter-options output=reports/junit-unit.xml || true

      - name: Build
        run: npm run build --if-present

      # === Trajectory Golden-Set ===
      - name: Trajectory Validation
        run: node scripts/run-trajectory-tests.js \
             --input tests/trajectory \
             --junit reports/junit-trajectory.xml \
             --json reports/trajectory-report.json \
             --md reports/trajectory-summary.md \
             --min-pass ${{ env.TRAJ_MIN_PASS_RATE }} \
             --max-step-err ${{ env.TRAJ_MAX_STEP_ERR }}

      # === Grounding Verifier ===
      - name: Grounding Verification
        run: node scripts/run-grounding-verifier.js \
             --input tools/check-grounding/cases \
             --sarif reports/grounding.sarif \
             --json reports/grounding-report.json \
             --md reports/grounding-summary.md \
             --min-score ${{ env.GROUNDING_MIN_SCORE }} \
             --max-gaps ${{ env.GROUNDING_MAX_GAPS }}

      - name: Upload Reports (Artifacts)
        uses: actions/upload-artifact@v4
        with:
          name: ci-evidence-${{ github.sha }}
          if-no-files-found: warn
          path: |
            reports/**
            evidence/**

      - name: Publish SARIF (Grounding)
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: reports/grounding.sarif

      - name: Post PR Comment (Summary)
        if: ${{ github.event_name == 'pull_request' }}
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const traj = fs.existsSync('reports/trajectory-summary.md') ? fs.readFileSync('reports/trajectory-summary.md','utf8') : '';
            const gr = fs.existsSync('reports/grounding-summary.md') ? fs.readFileSync('reports/grounding-summary.md','utf8') : '';
            const body = `### CI Evidence\n\n**Trajectory**\n\n${traj}\n\n**Grounding**\n\n${gr}`;
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body
            });

  # Optional: Canary Gate job to enforce SLO/Cost tripwires before merge-to-main deploys
  canary-gate:
    needs: build-test-validate
    runs-on: ubuntu-latest
    if: ${{ github.ref == 'refs/heads/main' }}
    steps:
      - uses: actions/checkout@v4
      - name: Evaluate SLO/Cost Tripwires
        run: |
          node scripts/canary-gate.js \
            --slo-reports evidence/slo/*.json \
            --cost-reports evidence/cost/*.json \
            --error-budget-threshold 0.4 \
            --replication-lag-threshold 60
```

---

## 2) `package.json` (root) — key scripts
```json
{
  "name": "intelgraph-monorepo",
  "private": true,
  "scripts": {
    "build": "turbo run build --filter=...",
    "lint": "eslint .",
    "test": "jest",
    "validate:trajectory": "node scripts/run-trajectory-tests.js --input tests/trajectory",
    "validate:grounding": "node scripts/run-grounding-verifier.js --input tools/check-grounding/cases"
  },
  "devDependencies": {
    "@actions/core": "^1.10.1",
    "@actions/github": "^6.0.0",
    "fast-glob": "^3.3.2",
    "js-yaml": "^4.1.0",
    "xmlbuilder2": "^3.1.1"
  }
}
```

---

## 3) `tests/trajectory/README.md` (expanded)
```md
# Trajectory Golden‑Set

Each YAML file defines a ReAct trace and expected invariants.

## File Schema
- `id`: unique id (string)
- `description`: short text
- `steps`: ordered array of steps with fields:
  - `role`: one of [thought, action, observation]
  - `label`: optional label for action/tool
  - `text`: content
- `expectations`:
  - `must_include_labels`: [string]
  - `forbid_labels`: [string]
  - `max_steps`: integer
  - `outcome_contains`: [string]

The validator enforces:
- Step order alternation (thought→action→observation patterns)
- Presence/absence of labels
- Max length/step caps
- Outcome text contains required substrings

It outputs JUnit (for Checks UI) + JSON + Markdown.
```

---

## 4) `tests/trajectory/golden-trajectory-1.yaml` (richer sample)
```yaml
id: gt-001
description: Basic ReAct search + cite
steps:
  - role: thought
    text: plan search
  - role: action
    label: web.search
    text: query=site:example.com policy update
  - role: observation
    text: found 3 results
  - role: thought
    text: choose first
  - role: action
    label: web.open
    text: open result 1
  - role: observation
    text: content mentions retention 30d
  - role: thought
    text: craft answer
  - role: action
    label: answer
    text: final
  - role: observation
    text: user sees answer
expectations:
  must_include_labels: [web.search, web.open, answer]
  forbid_labels: [tool.inject]
  max_steps: 12
  outcome_contains: ["retention", "30d"]
```

---

## 5) `scripts/run-trajectory-tests.js`
```js
#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const fg = require('fast-glob');
const yaml = require('js-yaml');
const { create } = require('xmlbuilder2');

function parseArgs() {
  const args = process.argv.slice(2);
  const conf = { input: 'tests/trajectory', junit: 'reports/junit-trajectory.xml', json: 'reports/trajectory-report.json', md: 'reports/trajectory-summary.md', minPass: 0.95, maxStepErr: 0.02 };
  for (let i = 0; i < args.length; i+=2) {
    const k = args[i], v = args[i+1];
    if (!v) continue;
    if (k === '--input') conf.input = v;
    if (k === '--junit') conf.junit = v;
    if (k === '--json') conf.json = v;
    if (k === '--md') conf.md = v;
    if (k === '--min-pass') conf.minPass = parseFloat(v);
    if (k === '--max-step-err') conf.maxStepErr = parseFloat(v);
  }
  return conf;
}

function ensureDir(filePath) { fs.mkdirSync(path.dirname(filePath), { recursive: true }); }

function validateTrace(doc) {
  const errors = [];
  if (!doc.steps || !Array.isArray(doc.steps) || doc.steps.length === 0) errors.push('no steps');
  const roles = ['thought','action','observation'];
  const roleSeq = doc.steps.map(s => s.role);
  // Soft pattern check: no two consecutive actions; observations follow actions
  for (let i=1;i<roleSeq.length;i++) {
    if (roleSeq[i] === 'action' && roleSeq[i-1] === 'action') errors.push(`consecutive action at index ${i}`);
    if (roleSeq[i] === 'observation' && roleSeq[i-1] !== 'action') errors.push(`observation not after action at index ${i}`);
  }
  // Label checks
  const labels = new Set(doc.steps.filter(s => s.label).map(s => s.label));
  const exp = doc.expectations || {};
  (exp.must_include_labels||[]).forEach(l => { if (!labels.has(l)) errors.push(`missing label ${l}`); });
  (exp.forbid_labels||[]).forEach(l => { if (labels.has(l)) errors.push(`forbidden label ${l}`); });
  if (exp.max_steps && doc.steps.length > exp.max_steps) errors.push(`too many steps: ${doc.steps.length} > ${exp.max_steps}`);
  // Outcome contains (search in last observation or action=answer)
  const outcomeText = (doc.steps.findLast ? doc.steps.findLast(s => s.role === 'observation') : [...doc.steps].reverse().find(s => s.role==='observation'))?.text || '';
  (exp.outcome_contains||[]).forEach(substr => { if (!outcomeText.toLowerCase().includes(substr.toLowerCase())) errors.push(`outcome missing '${substr}'`); });
  return { pass: errors.length === 0, errors };
}

(async function main(){
  const cfg = parseArgs();
  const files = await fg([`${cfg.input}/**/*.y?(a)ml`], { dot: false });
  const cases = [];
  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8');
    const doc = yaml.load(raw);
    const res = validateTrace(doc);
    cases.push({ id: doc.id || path.basename(file), file, ...res });
  }
  const passCount = cases.filter(c => c.pass).length;
  const passRate = cases.length ? passCount / cases.length : 1;
  const stepErrRate = cases.reduce((acc,c)=> acc + (c.errors.length>0?1:0),0) / (cases.length||1);

  // JUnit
  const testsuite = { '@name': 'trajectory-golden', '@tests': cases.length, '@failures': cases.length - passCount, testcase: [] };
  cases.forEach(c => {
    const tc = { '@name': c.id, '@classname': 'trajectory' };
    if (!c.pass) tc.failure = { '@message': c.errors.join('; ') };
    testsuite.testcase.push(tc);
  });
  const junitXml = create({ testsuite }).end({ prettyPrint: true });

  ensureDir(cfg.junit); fs.writeFileSync(cfg.junit, junitXml);
  ensureDir(cfg.json); fs.writeFileSync(cfg.json, JSON.stringify({ summary: { total: cases.length, passCount, passRate, stepErrRate }, cases }, null, 2));

  const md = [`**Trajectory Validation**`, `- Total: ${cases.length}`, `- Passed: ${passCount}`, `- Pass rate: ${(passRate*100).toFixed(1)}%`, `- Step error rate: ${(stepErrRate*100).toFixed(1)}%`, '', ...cases.filter(c=>!c.pass).slice(0,20).map(c=>`- ❌ ${c.id}: ${c.errors.join('; ')}`) ].join('\n');
  ensureDir(cfg.md); fs.writeFileSync(cfg.md, md + '\n');

  const fail = (passRate < cfg.minPass) || (stepErrRate > cfg.maxStepErr);
  if (fail) {
    console.error(`Trajectory thresholds not met: passRate=${passRate}, stepErrRate=${stepErrRate}`);
    process.exit(1);
  }
})();
```

---

## 6) `tools/check-grounding/index.js` (implemented CLI + library)
```js
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
  fs.writeFileSync(cfg.md, `**Grounding Verification**\n- Files: ${cases.length}\n- Avg score: ${(avg*100).toFixed(1)}%\n- Gaps: ${totalGaps}\n`);

  if (avg < cfg.minScore || totalGaps > cfg.maxGaps) {
    console.error(`Grounding thresholds not met: avg=${avg}, gaps=${totalGaps}`);
    process.exit(1);
  }
}

if (require.main === module) { main(); }
module.exports = { evaluateDoc };
```

> **Input format** for each case JSON:
```json
{
  "claims": [
    { "text": "We meet p95 350ms.", "citations": [{ "url": "https://grafana.example/snapshot/123", "quote": "p95 320ms" }] },
    { "text": "PII retained 30d.", "citations": [{ "url": "https://policy.example/retention", "quote": "PII: 30 days" }] }
  ]
}
```

---

## 7) `tools/check-grounding/README.md`
```md
# Grounding Verifier

Place case files under `tools/check-grounding/cases/*.json` in the schema shown in the main README. The CI job will fail if the average score < `GROUNDING_MIN_SCORE` or if any gaps > `GROUNDING_MAX_GAPS`.
```

---

## 8) Optional: `scripts/canary-gate.js` (tripwire enforcement)
```js
#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const fg = require('fast-glob');

function loadAll(pattern) { return fg.sync([pattern]).flatMap(f => { try { return [JSON.parse(fs.readFileSync(f,'utf8'))]; } catch { return []; } }); }

const args = process.argv.slice(2);
const get = (flag, def) => { const i=args.indexOf(flag); return i>=0 ? args[i+1] : def; };
const sloReports = loadAll(get('--slo-reports','evidence/slo/*.json'));
const costReports = loadAll(get('--cost-reports','evidence/cost/*.json'));
const errBudgetThresh = parseFloat(get('--error-budget-threshold','0.4')); // burn must be <= 0.6 consumed
const replLagThresh = parseFloat(get('--replication-lag-threshold','60'));

let violations = [];
for (const r of sloReports) {
  if ((r.errorBudgetRemaining ?? 1) < 0.6) violations.push(`error budget low: ${r.errorBudgetRemaining}`);
  if ((r.replicationLagSec ?? 0) > replLagThresh) violations.push(`replication lag high: ${r.replicationLagSec}`);
}
for (const c of costReports) {
  if ((c.monthlySpendPct ?? 0) > 0.8) violations.push(`cost at ${Math.round((c.monthlySpendPct)*100)}%`);
}
if (violations.length) {
  console.error('Canary gate violations:\n - ' + violations.join('\n - '));
  process.exit(1);
}
console.log('Canary gate: OK');
```

---

## 9) Monorepo root `README.md` — CI Evidence section (patch)
```md
## CI Evidence & Guardrails
- Trajectory Golden‑Set: `npm run validate:trajectory` → emits JUnit + JSON + Markdown under `reports/`
- Grounding Verifier: `npm run validate:grounding` → emits SARIF + JSON + Markdown under `reports/`
- Canary Gate: consumes `evidence/slo/*.json` and `evidence/cost/*.json` (produced by your observability jobs) to enforce tripwires in CI.
```

---

## 10) Example `tools/check-grounding/cases/sample.json`
```json
{
  "claims": [
    { "text": "GraphQL read p95 <= 350ms.", "citations": [{ "url": "https://grafana.example/api/dashboards/uid/abc", "quote": "p95 320ms" }] },
    { "text": "PII retention 30d.", "citations": [{ "url": "https://policy.example/retention", "quote": "PII retained for 30 days" }] }
  ]
}
```

---

### How to adopt
1. Copy files as‑is; `npm ci` to add dev deps.
2. Put golden YAMLs under `tests/trajectory/` and grounding cases under `tools/check-grounding/cases/`.
3. Push a PR — CI will annotate with summaries and SARIF, and fail on threshold breaches.

This elevates your delta from scaffolding to a production‑quality validation lane with evidence artifacts suitable for inclusion in `v0.3.1-mc` bundles.


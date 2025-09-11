---
title: Docs Phase 45–46: Multi‑CDN, Blue/Green Deploys, PR Previews & Index Coverage/Carbon Budgets
summary: Ship safe blue/green deploys with multi‑CDN failover, ephemeral PR previews, airtight search index coverage, and cost/carbon guardrails—fully automated via CI.
lastUpdated: 2025-09-07
owner: docs
version: latest
---

# Objectives
- **Zero‑drama deploys**: Blue/green with health checks + instant rollback.
- **Always preview**: Per‑PR ephemeral docs environments with bot comments.
- **Resilient delivery**: Dual‑CDN (primary/secondary) with synthetics + header parity checks.
- **Search coverage**: Versioned sitemaps, robots rules, and index coverage reports.
- **Sustainable**: Cost + carbon budgets with weekly reports and alerting.

---

# Track A — PR Preview Environments

## A1) Build & publish preview per PR
**`.github/workflows/docs-preview.yml`**
```yaml
name: Docs PR Preview
on: [pull_request]
jobs:
  preview:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - run: cd docs-site && npm i && npm run build
      - name: Upload preview artifact
        uses: actions/upload-artifact@v4
        with: { name: docs-preview, path: docs-site/build }
      - name: Publish to preview bucket (stub)
        run: |
          echo "Sync build/ to s3://docs-previews/pr-${{ github.event.number }}/ ..."
      - name: Comment with preview URL
        uses: actions/github-script@v7
        with:
          script: |
            const url = `https://previews.docs.example/pr-${context.payload.pull_request.number}/`;
            await github.rest.issues.createComment({ ...context.repo, issue_number: context.payload.pull_request.number, body: `🚀 Preview ready: ${url}` });
```

## A2) Gate with checks
- Run pa11y, Lighthouse CI, link check against the preview URL before merge (reuse existing jobs but target preview).

---

# Track B — Blue/Green Deploys with Health Gates

## B1) Artifact hashing & manifest
**`scripts/deploy/hash-manifest.js`**
```js
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const root='docs-site/build';
const files=[]; (function walk(d){ for(const f of fs.readdirSync(d)){ const p=path.join(d,f), s=fs.statSync(p); s.isDirectory()?walk(p):files.push(p);} }) (root);
const manifest=files.map(p=>({ path: p.replace(/^docs-site\/build\//,''), sha256: crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'), bytes: fs.statSync(p).size }));
fs.writeFileSync('deploy-manifest.json', JSON.stringify({ created: new Date().toISOString(), files: manifest }, null, 2));
console.log('Wrote deploy-manifest.json with', manifest.length, 'files');
```

## B2) Blue/green switch (stub)
**`.github/workflows/docs-bluegreen.yml`**
```yaml
name: Docs Blue/Green
on: [workflow_dispatch]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd docs-site && npm i && npm run build
      - run: node scripts/deploy/hash-manifest.js
      - name: Push to GREEN
        run: echo "rsync build/ to cdn://green ..."
      - name: Health check
        run: |
          for u in "/" "/reference/" "/how-to/zip-export"; do
            code=$(curl -s -o /dev/null -w "%{http_code}" https://green.docs.example$u);
            if [ "$code" -ge 400 ]; then echo "bad $u $code" && exit 1; fi
          done
      - name: Switch traffic to GREEN
        run: echo "Flip origin to green in edge config"
      - name: Keep BLUE as rollback for 60m
        run: echo "Schedule cleanup"
```

---

# Track C — Multi‑CDN Failover (Primary + Secondary)

## C1) Header parity & gzip/brotli checks
**`scripts/cdn/header-parity.sh`**
```bash
#!/usr/bin/env bash
set -euo pipefail
urls=("/" "/assets/" "/releases/v24")
for u in "${urls[@]}"; do
  echo "== $u =="
  curl -sI https://docs.example$u | grep -Ei 'cache-control|content-encoding|etag'
  curl -sI https://backup.docs.example$u | grep -Ei 'cache-control|content-encoding|etag'
  echo
done
```

## C2) Synthetic parity probe
**`.github/workflows/cdn-parity.yml`**
```yaml
name: CDN Parity Probe
on:
  schedule: [{ cron: '*/30 * * * *' }]
  workflow_dispatch:
jobs:
  probe:
    runs-on: ubuntu-latest
    steps:
      - run: |
          for u in "/" "/reference/"; do
            a=$(curl -s https://docs.example$u | shasum -a 256 | cut -d' ' -f1)
            b=$(curl -s https://backup.docs.example$u | shasum -a 256 | cut -d' ' -f1)
            echo "$u $a $b"
            [ "$a" = "$b" ] || { echo "::error ::Parity mismatch for $u"; exit 1; }
          done
```

---

# Track D — Index Coverage: Sitemaps, Robots, & Search Console Stub

## D1) Versioned sitemaps
**`scripts/search/gen-sitemaps.js`**
```js
const fs=require('fs');
const path=require('path');
const base='https://docs.intelgraph.example';
function pages(dir){
  const out=[]; (function walk(d){ for(const f of fs.readdirSync(d)){ const p=path.join(d,f), s=fs.statSync(p); s.isDirectory()?walk(p):/\.mdx?$/.test(f)&&out.push(p);} })(dir);
  return out.map(p=> '/' + p.replace(/^docs\//,'').replace(/\.mdx?$/,''));
}
function xml(urls){ return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>${base}${u}</loc></url>`).join('')}</urlset>` }
const urls=pages('docs');
fs.mkdirSync('docs-site/static', { recursive: true });
fs.writeFileSync('docs-site/static/sitemap.xml', xml(urls));
console.log('Sitemap URLs:', urls.length);
```

## D2) robots.txt
**`docs-site/static/robots.txt`**
```
User-agent: *
Allow: /
Sitemap: https://docs.intelgraph.example/sitemap.xml
```

## D3) Index coverage report (stub)
**`scripts/search/index-coverage.js`**
```js
const fs=require('fs');
// Placeholder: read last production sitemap and compare to built routes
const prodCount=Number(process.env.PROD_INDEXED||0);
const built=fs.readFileSync('docs-site/static/sitemap.xml','utf8').match(/<url>/g)?.length||0;
fs.writeFileSync('docs/ops/search/coverage.json', JSON.stringify({ built, prodIndexed: prodCount, gap: Math.max(0,built-prodCount) }, null, 2));
```

**Workflow** `.github/workflows/search-coverage.yml` (append to build):
```yaml
      - name: Generate sitemap & coverage
        run: |
          node scripts/search/gen-sitemaps.js
          node scripts/search/index-coverage.js
      - uses: actions/upload-artifact@v4
        with: { name: search-coverage, path: docs/ops/search/coverage.json }
```

---

# Track E — Cost & Carbon Budgets

## E1) CDN log parser → bytes & requests
**`scripts/finops/cdn-report.js`**
```js
const fs=require('fs');
// Expect newline-delimited log lines or CSV at logs/cdn.csv: ts, path, bytes
const lines=(fs.existsSync('logs/cdn.csv')?fs.readFileSync('logs/cdn.csv','utf8').trim().split(/\n/):[]).slice(1);
let bytes=0, reqs=0; for(const l of lines){ const parts=l.split(','); bytes+=Number(parts[2]||0); reqs++; }
fs.mkdirSync('docs/ops/finops',{recursive:true});
fs.writeFileSync('docs/ops/finops/usage.json', JSON.stringify({ bytes, reqs, period: new Date().toISOString().slice(0,10) }, null, 2));
```

## E2) Carbon estimate & budget check
**`scripts/finops/carbon-budget.js`**
```js
const fs=require('fs');
const u=JSON.parse(fs.readFileSync('docs/ops/finops/usage.json','utf8'));
// simplistic: 0.5 kWh/GB data transfer; 400 gCO2e/kWh (region dependent)
const gb=u.bytes/1e9; const kwh=gb*0.5; const co2=kwh*400; const budget=50000; // gCO2e/week
const ok = co2 <= budget;
fs.writeFileSync('docs/ops/finops/carbon.json', JSON.stringify({ gb: Number(gb.toFixed(3)), kwh: Number(kwh.toFixed(2)), gCO2e: Math.round(co2), budget, ok }, null, 2));
if (!ok) { console.error('Carbon budget exceeded'); process.exit(1); }
```

## E3) Weekly report workflow
**`.github/workflows/finops.yml`**
```yaml
name: Docs FinOps/Carbon
on:
  schedule: [{ cron: '0 8 * * 1' }]
  workflow_dispatch:
jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/finops/cdn-report.js
      - run: node scripts/finops/carbon-budget.js || echo 'budget fail'
      - uses: actions/upload-artifact@v4
        with: { name: finops, path: docs/ops/finops }
      - uses: actions/github-script@v7
        with:
          script: |
            const fs=require('fs');
            const j=JSON.parse(fs.readFileSync('docs/ops/finops/carbon.json','utf8'));
            if(!j.ok){
              await github.rest.issues.create({ ...context.repo, title: 'Carbon budget exceeded', body: 'gCO2e: '+j.gCO2e+' (budget '+j.budget+')', labels:['docs','finops'] });
            }
```

---

# Execution Plan (4–6 days)
1. Enable **PR previews** with bot comments; target previews in LHCI/pa11y.
2. Land **blue/green** workflow with health checks and manual switch step.
3. Add **multi‑CDN parity** synthetics; track header parity and content hashes.
4. Generate **sitemaps + robots** and produce **coverage** artifact per build.
5. Stand up **FinOps** scripts: usage → carbon estimate → budget issues.

---

# Acceptance Criteria
- Every PR posts a **Preview URL**; CI validates the preview before merge.
- Blue/green deploy succeeds only after **health checks**, with easy rollback.
- Parity probe shows two CDNs in sync; header parity script passes.
- Versioned **sitemap.xml** and **robots.txt** ship; `coverage.json` uploaded.
- Weekly **FinOps** artifact with bytes/requests; carbon budget triggers an issue when exceeded.


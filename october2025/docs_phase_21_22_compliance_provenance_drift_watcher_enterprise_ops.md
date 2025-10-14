---
title: Docs Phase 21–22: Compliance, Provenance, Drift Watcher & Enterprise Ops
summary: Final hardening for enterprise: accessibility & privacy compliance, signed build provenance (SLSA), automated doc-drift detection, and SRE-grade operations.
lastUpdated: 2025-09-07
owner: docs
version: latest
---

# Objectives
- **Compliance**: Accessibility (VPAT), privacy disclosures, data retention, and cookie‑free analytics.
- **Provenance**: Signed docs artifacts + SLSA provenance for builds; integrity checks for offline bundles.
- **Drift**: Automatic doc‑drift detection with code-to-doc mapping and PR annotations.
- **Ops**: SRE runbooks, error budgets for docs site, and disaster simulations.

---

# Track A — Accessibility & Privacy Compliance

## A1) Accessibility Conformance Statement (VPAT-style)
- Add `docs/ops/a11y-conformance.md` summarizing conformance to WCAG 2.1 AA: scope, known gaps, remediation schedule.
- Link from footer: “Accessibility”.

**`docs/ops/a11y-conformance.md` (skeleton)**
```md
---
title: Accessibility Conformance Statement
summary: Conformance of the IntelGraph Docs site to WCAG 2.1 AA.
owner: docs
---

## Scope
This statement covers the public IntelGraph Docs site and versioned snapshots.

## Standards
- WCAG 2.1 AA

## Status
- Conformance: Partial
- Known issues: (tracked in A11y board)
- Contact: accessibility@intelgraph.example

## Testing methods
- pa11y-ci in CI
- Manual keyboard testing

## Roadmap
- Close remaining contrast and skip-link issues by <date>.
```

## A2) Privacy & Data Practices page
- Add `docs/ops/privacy.md`: what we collect (if any), analytics provider, opt‑out, cookie policy (prefer cookie‑less analytics).
- Footer link: “Privacy”.

## A3) Content Markings & Synthetic Data
- Add Vale rule to block real customer names/domains in examples.

**`.vale/IntelGraph/Pii.yml`**
```yaml
extends: existence
message: "Avoid using real customer names or domains; use synthetic examples."
level: error
# Basic heuristic examples (expand with your own allow/deny lists)
tokens:
  - example.com
  - acme-corp
```

**CI**: Add Vale workflow if not present; treat PII rule as **error**.

---

# Track B — Signed Builds & SLSA Provenance

## B1) Sign the static site bundle with Sigstore (cosign)
**`.github/workflows/docs-sign.yml`**
```yaml
name: Docs Sign & Attest
on:
  workflow_dispatch:
  push:
    branches: [main]
permissions:
  id-token: write
  contents: read
  attestations: write
jobs:
  build-sign:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd docs-site && npm i && npm run build
      - name: Tar artifact
        run: |
          tar -C docs-site/build -czf docs-site.tar.gz .
      - name: Install cosign
        run: |
          COSIGN_VERSION=v2.2.4
          curl -sSL -o cosign.tgz https://github.com/sigstore/cosign/releases/download/${COSIGN_VERSION}/cosign-linux-amd64.tar.gz
          tar xzf cosign.tgz
          sudo mv cosign /usr/local/bin/
      - name: Sign artifact via OIDC
        run: cosign sign-blob --yes --output-signature docs-site.tar.gz.sig docs-site.tar.gz
      - name: Upload signatures
        uses: actions/upload-artifact@v4
        with: { name: docs-signature, path: "docs-site.tar.gz*" }
```

## B2) SLSA provenance attestation (GitHub Attestations)
**Add** to the same job:
```yaml
      - name: Generate provenance
        uses: actions/attest-build-provenance@v1
        with:
          subject-path: docs-site.tar.gz
```

## B3) Verify in deploy pipeline
- Add a deploy‑gate job that downloads `docs-site.tar.gz` and `.sig`, runs `cosign verify-blob` using identity policy (OIDC issuer = GitHub, repo = intelgraph/intelgraph), and only then uploads to hosting.

---

# Track C — Doc‑Drift Watcher (code ↔ docs)

## C1) Mapping file (code paths → docs pages)
**`docs/_meta/code-to-docs.yml`**
```yaml
# Map areas of code to the docs that must be updated
- code: ["packages/sdk-js/src/**", "packages/sdk-py/intelgraph/**"]
  docs:
    - "docs/reference/sdk-js/index.md"
    - "docs/reference/sdk-py/index.md"
- code: ["api/intelgraph-core-api.yaml"]
  docs:
    - "docs/reference/api/error-catalog.md"
    - "docs/tutorials/first-ingest.md"
- code: ["services/maestro/**"]
  docs:
    - "docs/concepts/maestro/ARCHITECTURE.md"
    - "docs/how-to/maestro/canary-rollback.md"
```

## C2) Drift detection script
**`scripts/docs/drift-watcher.js`**
```js
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { execSync } = require('child_process');
const map = yaml.load(fs.readFileSync('docs/_meta/code-to-docs.yml','utf8'));
const base = process.env.GITHUB_BASE_REF || 'origin/main';
const changed = execSync(`git diff --name-only ${base}...`, {encoding:'utf8'}).trim().split('\n');
let missing = [];
for (const rule of map){
  const codeChanged = changed.some(f => rule.code.some(glob => new RegExp(glob.replace('**','.*').replace('*','[^/]*')).test(f)));
  if (codeChanged){
    const docsTouched = changed.some(f => rule.docs.some(d => f === d || f.endsWith(d.replace(/^docs\//,''))));
    if (!docsTouched){ missing.push(rule.docs.join(', ')); }
  }
}
if (missing.length){
  console.error('Code changed without corresponding docs updates. Expected updates to:');
  missing.forEach(m=>console.error(' -', m));
  process.exit(1);
}
```

**Wire into** `.github/workflows/docs-required.yml` before failing with the generic rule, so messages are specific.

## C3) PR comment with actionable checklist
**`.github/workflows/docs-drift-comment.yml`**
```yaml
name: Docs Drift Hints
on: [pull_request]
jobs:
  comment:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm i js-yaml@4
      - run: node scripts/docs/drift-watcher.js || echo "MISSING=1" >> $GITHUB_ENV
      - uses: actions/github-script@v7
        if: env.MISSING == '1'
        with:
          script: |
            const body = `Heads up! Code changed without updates to mapped docs.\n\n- Review \`docs/_meta/code-to-docs.yml\`\n- Add or update the pages listed in the failed check.`
            await github.rest.issues.createComment({ ...context.repo, issue_number: context.payload.pull_request.number, body })
```

---

# Track D — SRE‑grade Ops for Docs

## D1) Error budgets & alerts
- Track SLOs: build success ≥ 99%, deploy latency p95 ≤ 15m, availability ≥ 99.9%.
- Emit metrics from CI to a simple time‑series (CSV in repo or external system).

**`scripts/docs/emit-metric.sh`**
```bash
#!/usr/bin/env bash
set -euo pipefail
mkdir -p docs/ops/metrics
printf "%s,%s,%s\n" "$(date -u +%FT%TZ)" "$1" "$2" >> docs/ops/metrics/$1.csv
```

**Usage in CI**:
```yaml
      - run: bash scripts/docs/emit-metric.sh build_success 1
```

## D2) Chaos drill for docs hosting
- Add `docs/ops/drills.md` with a quarterly failover test script and checklist.

## D3) Cache & CDN hardening
- Document immutable caching for versioned assets, short TTL for dynamic search index; verify headers in CI with curl.

---

# Track E — Editorial QA & Screenshots at Scale

## E1) Screenshot update tracker
- Extend earlier freshness bot: require alt text + captions for new images; open PRs with updated images when older than 180 days.

**`scripts/docs/screenshot-freshness.js`**
```js
const fs = require('fs');
const path = require('path');
const rx = /!\[(.*?)\]\((.*?)\)/g;
const cutoff = Date.now() - 1000*60*60*24*180;
let stale = [];
(function walk(d){
  for (const f of fs.readdirSync(d)){
    const p = path.join(d,f); const s = fs.statSync(p);
    if (s.isDirectory()) walk(p); else if (/\.mdx?$/.test(f)){
      const md = fs.readFileSync(p,'utf8');
      for (const m of md.matchAll(rx)){
        const img = path.join(path.dirname(p), m[2]);
        if (fs.existsSync(img)){
          const ts = fs.statSync(img).mtimeMs;
          if (ts < cutoff) stale.push({ page: p, image: img });
        }
      }
    }
  }
})('docs');
fs.writeFileSync('docs/ops/screenshot-stale.json', JSON.stringify(stale, null, 2));
console.log('Stale screenshots:', stale.length);
```

**CI**: Upload artifact and create an issue when `stale.length > 0`.

---

# Track F — Enterprise Readiness Odds & Ends

## F1) Footer & legal
- Add footer links: Accessibility • Privacy • Terms • Security.

## F2) Print/PDF policy
- Publish which pages are approved for PDF export and their update cadence.

## F3) Support SLAs surfaced on site
- Render current SLAs from `docs/ops/docs-slas.md` onto Support page automatically.

**`src/components/RenderSla.tsx`**
```tsx
import React from 'react';
export default function RenderSla(){
  const Sla = require('@site/docs/ops/docs-slas.md');
  return <Sla.default />;
}
```

---

# Execution Plan (5 days)
1. Ship **cosign signing + provenance** on `main` builds and add deploy verify step.
2. Add **Accessibility Conformance** + **Privacy** pages, link in footer.
3. Wire **drift‑watcher** with mapping file and PR comment job.
4. Add **screenshot freshness** artifact + weekly triage issue.
5. Document **CDN cache** policies and verify headers in CI.

---

# Acceptance Criteria
- Docs bundle signed; deploy gate verifies signature and provenance.
- Accessibility & Privacy pages published and linked; Vale PII rule enforced.
- Drift watcher blocks merges when mapped code changes lack doc updates.
- Screenshot freshness report produced weekly; issues filed automatically.
- CDN headers verified; caching documented.


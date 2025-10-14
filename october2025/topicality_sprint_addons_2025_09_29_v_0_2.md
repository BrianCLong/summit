# Topicality — Sprint Add‑Ons & PR/Demo Pack **2025‑09‑29**  
**Slug:** `topicality-sprint-addons-2025-09-29-v0-2`  
**Version:** v0.2.0  

> Continuation: PR scaffolds, demo scripts, middleware stubs, runbooks, owners, and governance templates to complete the sprint package. All files are safe to commit.

---

## 1) Pull Request Template
**Path:** `.github/pull_request_template.md`
```markdown
# PR Title

## What
- Short summary

## Why
- Link to ChangeSpec: `.maestro/changes/20250929-sprint-prov-ledger-copilot-connectors.yaml`
- Story IDs: e.g., SPR-A1, SPR-B1

## How
- Key changes, flags, toggles

## Evidence (attach Disclosure Pack items)
- [ ] SBOM attached
- [ ] SLSA provenance artifact
- [ ] Risk assessment updated
- [ ] Rollback plan present
- [ ] Screenshots / CLI outputs

## SLO/Cost
- [ ] p95 latency invariant checked (≤300ms)
- [ ] error rate within budget (≤1%)
- [ ] cost/req ≤ $0.01

## Security & Policy
- [ ] OPA ABAC policy tests pass
- [ ] No secrets in diff

## Checklist
- [ ] Tests added/updated
- [ ] Docs updated
- [ ] Owners ack'd
```

---

## 2) CODEOWNERS
**Path:** `CODEOWNERS`
```text
# Lanes
/apps/web/               @nina-v
/apps/copilot/           @nina-v
/prov-ledger/            @alex-t
/connectors/             @omar-r
/observability/          @priya-s
/policy/                 @jordan-p
/.maestro/               @maya-k
```

---

## 3) Make — One‑Click Demo
**Path:** `Makefile` (append)
```makefile
.PHONY: demo-r2
## demo-r2: Run the end-to-end R2 demo locally
demo-r2:
	bash scripts/demo_r2.sh
```

**Path:** `scripts/demo_r2.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail

echo "[1/8] Import dataset"
./tools/datasets/import.sh examples/r2_phishing.json

echo "[2/8] Run R2 pipeline"
./tools/pipelines/run_r2.sh --dataset examples/r2_phishing.json

echo "[3/8] Inspect entities"
./tools/cli/ig query 'MATCH (e:Email)-[r]->(x) RETURN e,r,x LIMIT 5'

echo "[4/8] Copilot preview"
./tools/cli/copilot preview 'show emails sent by alice last week'

echo "[5/8] Export with manifest"
./tools/cli/export --with-manifest --out dist/export.json --manifest dist/manifest.hash-tree.json

echo "[6/8] Verify manifest"
python3 tools/prov_ledger_verify.py dist/export.json dist/manifest.hash-tree.json

echo "[7/8] Show SLO dashboard link"
echo "Open observability/dashboards/intelgraph-slo.json in Grafana"

echo "[8/8] Canary drill (staging)"
./tools/ops/canary_drill.sh
```

---

## 4) Copilot — Pre‑Exec Validator & Cost Estimator (stubs)
**Path:** `apps/copilot/src/validator.ts`
```ts
export type Validation = { ok: boolean; reasons?: string[] };
export function validateCypher(q: string): Validation {
  const reasons: string[] = [];
  if (!/^\s*(MATCH|WITH|RETURN|UNWIND|CALL|OPTIONAL MATCH|CREATE|MERGE|SET|DELETE|DETACH|LIMIT|WHERE)/i.test(q)) {
    reasons.push('Unexpected leading token');
  }
  if (/\b(DETACH\s+DELETE|DELETE\s+\w+)/i.test(q)) {
    reasons.push('Potentially destructive operation');
  }
  return { ok: reasons.length === 0, reasons };
}
```

**Path:** `apps/copilot/src/cost.ts`
```ts
export function estimateCostRows(q: string): { costUsd: number; estRows: number } {
  // naive: penalize patterns, functions, and limits
  const patterns = (q.match(/MATCH/gi) || []).length;
  const hasLimit = /LIMIT\s+(\d+)/i.exec(q);
  const estRows = hasLimit ? Math.min(parseInt(hasLimit[1], 10), 1000) : 5000 / (patterns + 1);
  const costUsd = 0.000001 * estRows * Math.max(1, patterns);
  return { costUsd: Number(costUsd.toFixed(6)), estRows: Math.ceil(estRows) };
}
```

**Path:** `apps/copilot/src/index.ts`
```ts
export { validateCypher } from './validator';
export { estimateCostRows } from './cost';
```

---

## 5) API — Cost Budget Middleware
**Path:** `services/api/src/middleware/costBudget.ts`
```ts
import { Request, Response, NextFunction } from 'express';

export function costBudget(budgetUsdDefault = 0.01) {
  return (req: Request, res: Response, next: NextFunction) => {
    const hdr = req.header('x-cost-budget-usd');
    const budget = hdr ? Number(hdr) : budgetUsdDefault;
    if (!(budget > 0 && budget < 1)) return res.status(400).json({ error: 'invalid cost budget header' });
    (req as any).costBudgetUsd = budget;
    next();
  };
}
```

**Path:** `services/api/src/index.ts` (excerpt)
```ts
import express from 'express';
import { costBudget } from './middleware/costBudget';
const app = express();
app.use(costBudget());
```

---

## 6) Rollback Drill (staging) Runbook
**Path:** `runbooks/rollback_drill_staging.md`
```markdown
# Rollback Drill — Staging
## Objective
Validate auto-rollback triggers & procedures.

## Preconditions
- Staging Rollout exists with canary steps
- Synthetic traffic enabled

## Steps
1. Deploy canary @10%.
2. Inject 5xx error rate >1% using fault injection for 10m.
3. Observe analysis failure; ensure Argo triggers rollback within 2 windows.
4. Capture metrics screenshots; attach to incident record.
```

---

## 7) Design Partner Demo Agenda
**Path:** `demos/partner_agenda.md`
```markdown
# Demo Agenda (45 min)
- 0–5: Context, objectives, success criteria
- 5–15: R2 walkthrough (ingest → link analysis)
- 15–25: Copilot preview + cost/row estimates
- 25–35: Export + manifest verification
- 35–40: SLO dashboard & rollback drill summary
- 40–45: Next steps; capture 5 partner prompts
```

---

## 8) Governance — Risk & Ethics Memo Template
**Path:** `governance/risk_ethics_memo.md`
```markdown
# Risk & Ethics Memo — ${RELEASE_TAG}
## Context
- Data types, jurisdictions, processing purposes

## Risks
- Model risks: hallucination, overreach
- Data risks: residency, sensitivity
- Operational risks: rollout, rollback

## Controls
- ABAC enforcement; step-up auth
- Disclosure Pack attestation
- Canary + auto-rollback

## Residual Risk & Sign-off
- Owner:
- Reviewer:
- Date:
```

---

## 9) Manifest Hash Tree — JSON Schema
**Path:** `schemas/manifest.hash-tree.schema.json`
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Export Manifest Hash Tree",
  "type": "object",
  "required": ["version", "leaves", "root"],
  "properties": {
    "version": {"type": "string"},
    "root": {"type": "string", "pattern": "^[a-f0-9]{64}$"},
    "leaves": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["path", "hash"],
        "properties": {
          "path": {"type": "string"},
          "hash": {"type": "string", "pattern": "^[a-f0-9]{64}$"}
        }
      }
    }
  }
}
```

---

## 10) CI — p95 Latency Check (k6)
**Path:** `.github/workflows/latency-check.yml`
```yaml
name: latency-check
on: [workflow_dispatch]
jobs:
  k6:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/setup-k6@v1
      - name: Run k6 test
        run: k6 run tests/k6/preview_latency.js
```

**Path:** `tests/k6/preview_latency.js`
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = { vus: 5, duration: '1m' };
export default function () {
  const res = http.get(`${__ENV.BASE_URL}/copilot/preview?q=show%20emails`);
  check(res, { 'status 200': r => r.status === 200 });
  sleep(1);
}
```

---

## 11) CHANGELOG
**Path:** `CHANGELOG.md`
```markdown
## v0.1.0-rc2 — 2025-09-29
- Prov-Ledger: manifest + verifier CLI
- Copilot: pre-exec validation + cost estimate preview
- Connectors: certification scaffolds (5)
- Ops: SLO dashboards + canary thresholds
- Governance: Disclosure Pack v1
```

---

## 12) CONTRIBUTING
**Path:** `CONTRIBUTING.md`
```markdown
# Contributing
- Branch from `sprint/2025-09-29`
- Use Issue template `Sprint Story`
- Link PRs to ChangeSpec and story IDs
- Ensure Disclosure Pack items present on PR
```

---

## 13) Owners & SLAs Table
**Path:** `docs/owners.md`
```markdown
| Lane | Owner | SLA |
|---|---|---|
| Prov-Ledger | Alex T. | PR review ≤ 24h |
| Copilot | Nina V. | PR review ≤ 24h |
| Connectors | Omar R. | PR review ≤ 24h |
| Ops/Obs | Priya S. | Incident ack ≤ 15m |
| Governance | Jordan P. | Policy ack ≤ 24h |
```

---

## 14) Maestro — Local Run Helpers
**Path:** `scripts/maestro_run.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail
MAESTRO_FILE=${1:-.maestro/changes/20250929-sprint-prov-ledger-copilot-connectors.yaml}
echo "Running Maestro plan → ${MAESTRO_FILE}"
echo "(placeholder) Validate YAML, enumerate work_items, open issues"
```

---

**END (Add‑Ons Pack)**


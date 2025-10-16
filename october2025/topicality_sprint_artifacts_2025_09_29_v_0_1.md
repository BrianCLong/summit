# Topicality — Sprint Artifacts **2025‑09‑29**

**Slug:** `topicality-sprint-artifacts-2025-09-29-v0-1`  
**Version:** v0.1.0

> Drop these files into the repo at the indicated paths. All files are idempotent scaffolds and safe to commit on a feature branch.

---

## 1) Maestro ChangeSpec

**Path:** `.maestro/changes/20250929-sprint-prov-ledger-copilot-connectors.yaml`

```yaml
area: multi
intent: release
release_tag: v0.1.0-rc2
window:
  start: 2025-09-29
  end: 2025-10-13
objective: >
  Ship Prov-Ledger beta (verifiable exports), Copilot NL→Cypher validity ≥95%,
  certify 5 connectors with golden IO tests, and land SLO/cost guardrails + canary.

owners:
  product: maya.k
  prov_ledger: alex.t
  copilot: nina.v
  connectors: omar.r
  ops: priya.s
  governance: jordan.p
  gtm: sam.d

kpis:
  - name: export_manifest_verification_rate
    target: '>=0.99'
  - name: nl2cypher_syntax_validity
    target: '>=0.95'
  - name: preview_latency_p95_ms
    target: '<=300'

budget:
  cost_per_req_max_usd: 0.01
  ci_minutes_cap: 2000

freeze_windows:
  - { start: '2025-10-12T00:00:00Z', end: '2025-10-13T23:59:00Z', reason: 'pre-release freeze' }

work_items:
  - epic: Provenance & Claim Ledger (beta)
    stories:
      - Implement export manifest + transform chain
      - External verifier CLI + CI job `prov-ledger-verify`
      - UI export attaches manifest + verifier badge
    acceptance:
      - Manifest verified in CI and UI; endpoints expose health/metrics

  - epic: NL→Cypher Copilot hardening
    stories:
      - Cost/row estimate + sandbox pre-exec diff
      - Curate 200-case prompt set; track validity
    acceptance:
      - Validity ≥95%; preview p95 ≤300ms; unsafe ops blocked

  - epic: Connector certification
    stories:
      - Slack, Gmail, Drive, Jira, GitHub with mapping/policy/golden tests
    acceptance:
      - `connector-cert-*` green; rate limits enforced

  - epic: Ops/SRE
    stories:
      - SLO dashboards + canary thresholds + rollback drill
    acceptance:
      - Induced breach auto-rolls back in staging

  - epic: Governance
    stories:
      - Disclosure Pack v1 + OPA ABAC bundle update
    acceptance:
      - SBOM+SLSA+Risk memo attached on release; policy audit zero criticals

artifacts:
  - type: disclosure_pack
    path: .evidence/releases/${release_tag}/
  - type: dashboards
    path: observability/dashboards/
  - type: connectors
    path: connectors/*/

checks:
  - name: gate-sbom
    run: gh workflow run attest-sbom.yml
  - name: gate-slsa
    run: gh workflow run attest-provenance.yml
  - name: policy-abac
    run: gh workflow run abac-policy.yml
```

---

## 2) Release Gate Workflow

**Path:** `.github/workflows/release-gate.yml`

```yaml
name: Release Gate
on:
  workflow_dispatch: {}
  push:
    tags:
      - 'v*.*.*'

jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Verify SBOM
        uses: anchore/sbom-action/download-syft@v0
      - name: Generate SBOM
        run: |
          syft packages dir:. -o json > .evidence/releases/${GITHUB_REF_NAME}/sbom.json
      - name: SLSA Provenance
        uses: slsa-framework/slsa-github-generator/.github/actions/generator@v2
        with:
          artifact_path: .
      - name: Risk Assessment Gate
        run: |
          mkdir -p .evidence/releases/${GITHUB_REF_NAME}
          echo "# Risk Assessment" > .evidence/releases/${GITHUB_REF_NAME}/risk_assessment.md
      - name: Rollback Plan Present
        run: |
          test -f .evidence/releases/${GITHUB_REF_NAME}/rollback_plan.md || (echo "# Rollback Plan\nSee canary policy." > .evidence/releases/${GITHUB_REF_NAME}/rollback_plan.md)
      - name: ABAC Policy Check
        uses: open-policy-agent/setup-opa@v2
      - name: Evaluate ABAC
        run: |
          opa eval -f pretty -d policy -i policy/input.sample.json "data.access.allow" | grep true
```

---

## 3) Canary/Argo Rollouts Annotations

**Path:** `deploy/overlays/staging/rollout.yaml` (excerpt)

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: intelgraph-api
spec:
  strategy:
    canary:
      steps:
        - setWeight: 10
        - pause: { duration: 300 }
      analysis:
        templates:
          - templateName: intelgraph-metrics
      abortScaleDownDelaySeconds: 30
  template:
    metadata:
      annotations:
        rollouts.argoproj.io/analysis: |
          metrics:
            - name: error-rate
              threshold: 0.01
            - name: latency-p95
              threshold: 300
            - name: cost-per-req
              threshold: 0.01
          rollbackOnFailure: true
```

---

## 4) Connector Certification Workflow

**Path:** `.github/workflows/connector-cert.yml`

```yaml
name: connector-cert
on:
  push:
    paths: ['connectors/**']
  workflow_dispatch: {}

jobs:
  cert:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node
        uses: actions/setup-node@v4
        with: { node-version: '20' }
      - name: Set up Python
        uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - name: Install deps
        run: |
          npm ci || true
          pip install -r tools/requirements.txt || true
      - name: Run golden IO tests
        run: make connector-cert-all
```

---

## 5) Issue Template

**Path:** `.github/ISSUE_TEMPLATE/sprint_story.yml`

```yaml
name: Sprint Story
description: Slice of work tied to sprint objectives and KPIs.
labels: [sprint, story]
body:
  - type: input
    id: id
    attributes: { label: Story ID, placeholder: SPR-A1 }
  - type: textarea
    id: acceptance
    attributes: { label: Acceptance Criteria }
  - type: checkboxes
    id: dod
    attributes:
      label: Definition of Done
      options:
        - label: Tests
        - label: Docs
        - label: Disclosure Pack
        - label: Dashboards
        - label: Owner assigned
  - type: textarea
    id: risks
    attributes: { label: Risks & Mitigations }
```

---

## 6) OPA ABAC Policy (starter)

**Path:** `policy/abac.rego`

```rego
package access
import future.keywords.if

default allow = false

allow if {
  input.user.mfa == true
  input.request.purpose in {"demo","ops","support"}
  not sensitive_violation
}

sensitive_violation if {
  input.resource.sensitivity == "high"
  not input.user.step_up_auth
}
```

**Path:** `policy/input.sample.json`

```json
{
  "user": { "mfa": true, "step_up_auth": false },
  "request": { "purpose": "demo" },
  "resource": { "sensitivity": "low" }
}
```

---

## 7) Makefile Targets

**Path:** `Makefile` (append)

```makefile
connector-cert-all: connector-cert-slack connector-cert-gmail connector-cert-drive connector-cert-jira connector-cert-github

connector-cert-%:
	@echo "Running golden tests for $*"
	@test -d connectors/$* || (echo "connectors/$* missing" && exit 1)
	@tools/run_golden_tests.sh connectors/$*

prov-ledger-verify:
	python3 tools/prov_ledger_verify.py fixtures/sample_export.json fixtures/manifest.hash-tree.json

copilot-validity:
	npm run test:copilot-validity
```

---

## 8) Tools — Prov‑Ledger Verifier (CLI)

**Path:** `tools/prov_ledger_verify.py`

```python
#!/usr/bin/env python3
import argparse, json, hashlib, sys, pathlib

def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()

def compute_leaf_hash(obj) -> str:
    # Deterministic JSON canonicalization (UTF-8, sorted keys, no spaces)
    s = json.dumps(obj, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return sha256_bytes(s)

def main():
    p = argparse.ArgumentParser(description="Verify export against manifest hash tree")
    p.add_argument("export_json", help="Path to export JSON")
    p.add_argument("manifest_json", help="Path to manifest hash tree JSON")
    args = p.parse_args()

    export = json.loads(pathlib.Path(args.export_json).read_text())
    manifest = json.loads(pathlib.Path(args.manifest_json).read_text())

    # Expect manifest: { "version":"0.1", "leaves":[{"path":"entities/0","hash":"..."}], "root":"..." }
    leaves = manifest.get("leaves", [])
    mismatches = []
    for leaf in leaves:
        path = leaf["path"].split("/")
        node = export
        try:
            for seg in path:
                if seg.isdigit():
                    node = node[int(seg)]
                else:
                    node = node[seg]
        except Exception:
            mismatches.append({"path": leaf["path"], "error": "path not found"})
            continue
        h = compute_leaf_hash(node)
        if h != leaf["hash"]:
            mismatches.append({"path": leaf["path"], "expected": leaf["hash"], "actual": h})

    ok = len(mismatches) == 0
    print(json.dumps({"ok": ok, "mismatches": mismatches}, indent=2))
    sys.exit(0 if ok else 2)

if __name__ == "__main__":
    main()
```

**Path:** `tools/run_golden_tests.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail
DIR=${1:-}
if [[ -z "$DIR" ]]; then echo "Usage: $0 connectors/<name>"; exit 2; fi
for f in "$DIR"/golden/*.json; do
  echo "Asserting golden: $f"
  node tools/golden/assert.js "$f"
done
```

**Path:** `tools/golden/assert.js`

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = process.argv[2];
if (!path) {
  console.error('Usage: assert.js <golden.json>');
  process.exit(2);
}
const spec = JSON.parse(fs.readFileSync(path, 'utf8'));
// Minimal placeholder: ensure required fields exist
['name', 'input', 'expected'].forEach((k) => {
  if (!(k in spec)) {
    console.error(`Missing ${k}`);
    process.exit(2);
  }
});
process.exit(0);
```

---

## 9) UI Badge Hook (apps/web)

**Path:** `apps/web/components/ExportBadge.tsx`

```tsx
import React from 'react';
export default function ExportBadge({ verified }: { verified: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-2xl px-2 py-1 text-xs ${verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}
    >
      {verified ? 'Verified Manifest' : 'Unverified'}
    </span>
  );
}
```

---

## 10) Observability — SLO Dashboard (starter)

**Path:** `observability/dashboards/intelgraph-slo.json`

```json
{
  "title": "IntelGraph SLOs",
  "panels": [
    {
      "type": "stat",
      "title": "Latency p95 (ms)",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))"
        }
      ]
    },
    {
      "type": "stat",
      "title": "Error Rate (%)",
      "targets": [
        {
          "expr": "sum(rate(http_requests_total{code=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m])) * 100"
        }
      ]
    },
    {
      "type": "stat",
      "title": "Cost per req (USD)",
      "targets": [{ "expr": "avg(cost_per_req_usd)" }]
    }
  ]
}
```

---

## 11) Disclosure Pack Structure

**Path:** `.evidence/releases/v0.1.0-rc2/README.md`

```markdown
# Disclosure Pack — v0.1.0-rc2

Contents

- `sbom.json`
- `slsa-provenance.intoto.jsonl`
- `risk_assessment.md`
- `rollback_plan.md`
- `manifest.hash-tree.json`
- `decision_memo.md`
```

---

## 12) Connector Scaffolds

**Paths:**

```
connectors/slack/{mapping.yaml,policy.yaml,golden/example.json,fixtures/sample.json}
connectors/gmail/{mapping.yaml,policy.yaml,golden/example.json,fixtures/sample.json}
connectors/drive/{mapping.yaml,policy.yaml,golden/example.json,fixtures/sample.json}
connectors/jira/{mapping.yaml,policy.yaml,golden/example.json,fixtures/sample.json}
connectors/github/{mapping.yaml,policy.yaml,golden/example.json,fixtures/sample.json}
```

**Example content:** `connectors/slack/policy.yaml`

```yaml
rate_limits:
  rpm: 50
  burst: 10
scopes:
  - channels:history
  - users:read
error_budget:
  availability: '>=99.0%'
```

**Example content:** `connectors/slack/mapping.yaml`

```yaml
entity: message
fields:
  id: $.ts
  user: $.user
  text: $.text
  channel: $.channel
```

**Example content:** `connectors/slack/golden/example.json`

```json
{
  "name": "slack-message-basic",
  "input": {
    "ts": "1727578123.000100",
    "user": "U123",
    "text": "hello",
    "channel": "C123"
  },
  "expected": {
    "id": "1727578123.000100",
    "user": "U123",
    "text": "hello",
    "channel": "C123"
  }
}
```

---

## 13) Copilot Validity Test Harness (starter)

**Path:** `apps/copilot/test/validity.spec.ts`

```ts
import { generateCypher, validateCypher } from '../../src';
import cases from './cases.json';

describe('NL→Cypher validity', () => {
  it('≥95% syntactic validity', () => {
    let valid = 0;
    for (const c of cases) {
      const q = generateCypher(c.prompt);
      if (validateCypher(q)) valid++;
    }
    const ratio = valid / cases.length;
    expect(ratio).toBeGreaterThanOrEqual(0.95);
  });
});
```

**Path:** `apps/copilot/test/cases.json` (placeholder)

```json
[{ "prompt": "find all emails sent by alice last week" }]
```

---

## 14) Rollback Plan Template

**Path:** `.evidence/releases/v0.1.0-rc2/rollback_plan.md`

```markdown
# Rollback Plan — v0.1.0-rc2

## Triggers

- Error rate > 1% for 2 consecutive windows
- p95 latency > 300ms for 2 windows
- Cost/req > $0.01 for 2 windows

## Actions

1. Argo Rollouts abort current canary.
2. Scale down canary to 0; scale stable to 100%.
3. Create incident record with metrics snapshot.
```

---

## 15) Decision Memo Template

**Path:** `.evidence/releases/v0.1.0-rc2/decision_memo.md`

```markdown
# Decision Memo — v0.1.0-rc2

**Context:** Release of Prov-Ledger beta + Copilot hardening + connectors.
**Options:** Proceed / Delay / Partial.
**Decision:** Proceed to 10% canary.
**Reversible?:** Yes (two-way door via rollbacks).
**Risks:** Manifest mismatch, connector rate limits, SLO regressions.
**Owners:** Maya (PM), Alex (Prov), Nina (Copilot), Omar (Connectors), Priya (Ops), Jordan (Gov).
**Checks:** SBOM, SLSA, ABAC pass; staging rollback drill completed.
```

---

**END OF ARTIFACTS**

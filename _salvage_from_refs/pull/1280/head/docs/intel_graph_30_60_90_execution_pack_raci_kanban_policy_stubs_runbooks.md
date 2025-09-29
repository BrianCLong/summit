# IntelGraph — 30/60/90 Execution Pack

This package turns the Sprint 25 completion into an executable plan with owners, boards, policies, and runbooks. Copy/paste-ready snippets are included for CI/CD, OPA, Prometheus, and synthetic probes.

---

## 1) RACI — 0–30 / 31–60 / 61–90 Days

### Key Teams
- **EP**: Eng Platform (Gateway, CI/CD, NL→Cypher)
- **SRE**: Reliability/Observability
- **SecOps**: Security Engineering & GRC
- **Data**: ER/Entity Resolution & Data Science
- **FE**: Web Frontend (Apps)
- **PM**: Product Management
- **DX**: SDKs/Developer Experience

> Replace names in parentheses with actual owners.

### 0–30 Days (Stabilize & Prove Readiness)
| Workstream | Task | R | A | C | I | Gate |
|---|---|---|---|---|---|---|
| Progressive Delivery | Canary + feature flags + global kill-switch for NLQ & ER autoMerge | EP (Alice) | EP Lead | SRE | PM, SecOps | Kill-switch tested in prod canary |
| Rollback | One-click “last-good” deploy via verify-bundle | EP | EP Lead | SRE | PM | Successful rollback rehearsal |
| Burn-rate Alerts | Multi-window p95/p99 burn-rate SLO | SRE | SRE Lead | EP | PM | Alerts firing in staging & canary |
| Synthetics | Golden NLQ probes (correctness + latency) | SRE | EP Lead | EP, Data | PM | Probe pass ≥ 99% |
| Red-team Guardrails | Attack-eval harness for NL→Cypher | SecOps | SecOps Lead | EP, Data | PM | FN rate < 1% |
| Shadow Auditing | Blocked write-intent logging + review | EP | EP Lead | SecOps | PM | Weekly review cadence |
| Supply Chain | Cosign keyless OIDC + Rekor hard-fail | SecOps | SecOps Lead | EP | PM | Attestation hard gate passes |
| SBOM | Per-service CycloneDX + verify-bundle attach | EP | EP Lead | SecOps | PM | SBOMs generated, diffed |
| DR | Restore drills: Postgres & Neo4j | SRE | SRE Lead | Data, EP | PM | RTO ≤ 60m, RPO ≤ 5m |
| WebAuthn | Step-up coverage map & policies | FE | PM | EP, SecOps | DX | 100% sensitive ops require step-up |
| Baselines | CIS scans, network policies, workload identity | SecOps | SecOps Lead | SRE, EP | PM | Findings triaged & tracked |
| Runbooks | NLQ slowdown, ER backlog, provenance failure | SRE | SRE Lead | EP, SecOps | PM | Game day complete |

### 31–60 Days (Scale & Govern)
| Workstream | Task | R | A | C | I | Gate |
|---|---|---|---|---|---|---|
| OPA Expansion | Enforce SLO, SBOM diff, WebAuthn coverage | SecOps | SecOps Lead | EP | PM | Policy coverage ≥ 90% |
| Data Governance | Data classification, retention, DLP | Data | PM | SecOps, EP | FE | Policies live; DLP clean |
| Observability | Query-shape metrics, top-K slow NLQ | SRE | SRE Lead | EP | PM | Dashboards published |
| ER Quality | Precision/recall loop on bands | Data | Data Lead | EP, FE | PM | Weekly quality report |
| Multi-Region | Active–passive pilot, failover | SRE | SRE Lead | EP | PM | DR rehearsal pass |
| SDK/API | SemVer, deprecation, contract tests | DX | DX Lead | EP | PM | CI green TS/Py |

### 61–90 Days (Certify & Extend)
| Workstream | Task | R | A | C | I | Gate |
|---|---|---|---|---|---|---|
| Compliance | SOC2/ISO mapping + trust center | SecOps | GRC Lead | PM, EP | Execs | Artifact pack complete |
| SLSA L4 | Hermetic/repro builds, dep provenance | EP | EP Lead | SecOps | PM | Repro build demo |
| Formal Safety | Semantic allowlists + proofs | EP | EP Lead | SecOps | PM | CI proofs pass |
| Cost/Perf | NLQ cost model + scaling | SRE | SRE Lead | EP | PM | KPIs trending down |
| Product | Explainability UX + audit trails | FE | PM | EP, Data | DX | Feature GA |

---

## 2) Kanban (Now / Next / Later)

**Now (0–30):** kill-switch, canary, burn-rate alerts, synthetics, red-team harness, SBOM + keyless cosign, DR drills, WebAuthn coverage, baseline hardening, runbooks.

**Next (31–60):** OPA gates (SLO, SBOM diff, WebAuthn), data governance + DLP, query-shape metrics, ER quality loop, multi-region pilot, SDK contract tests.

**Later (61–90):** Compliance/trust center, SLSA L4 path, formal safety proofs, cost model & caching, explainability UX, immutable audit trails.

---

## 3) CI/CD — Ready-to-Use Snippets

### 3.1 Global Kill-Switch (Gateway)
```ts
// services/gateway/src/config/featureFlags.ts
export const Flags = {
  NLQ_ENABLED: process.env.NLQ_ENABLED !== 'false',
  ER_AUTOMERGE_ENABLED: process.env.ER_AUTOMERGE_ENABLED !== 'false',
};

// services/gateway/src/nl2cypher/executor/neo4j.ts
import { Flags } from '../../config/featureFlags';
if (!Flags.NLQ_ENABLED) {
  throw new Error('NLQ temporarily disabled by ops.');
}
```

```yaml
# ops/k8s/gateway-deployment.yaml (snippet)
env:
  - name: NLQ_ENABLED
    value: "true" # Flip to "false" for kill-switch
  - name: ER_AUTOMERGE_ENABLED
    value: "true"
```

### 3.2 One-Click Rollback using verify-bundle
```yaml
# .github/workflows/rollback.yml
name: rollback
on: workflow_dispatch
jobs:
  rollback:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm -w tools/verify-bundle ci && npm -w tools/verify-bundle run build
      - run: node tools/verify-bundle/dist/cli.js \
             --bundle ${{ inputs.bundle || 'last-good.tgz' }} \
             --verify slsa,cosign,policy \
             --deploy --env prod
```

### 3.3 SLO Burn-Rate Gates (CI)
```yaml
# .github/workflows/slo-gate.yml
name: slo-gate
on: workflow_dispatch
jobs:
  check-burn-rate:
    runs-on: ubuntu-latest
    steps:
      - name: Query Prometheus for burn rate (last 6h)
        run: |
          curl -s "$PROM_URL/api/v1/query?query=sum(rate(nlq_latency_p95_slo_exceed[6h]))" \
          | jq -e '.data.result[0].value[1] | tonumber < 0.05'
```

### 3.4 SBOM Generation & Diff Gate
```yaml
# .github/workflows/sbom.yml
name: sbom
on: [push]
jobs:
  gen-and-diff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate CycloneDX SBOM
        run: |
          npm -w services/gateway ci
          npx @cyclonedx/cdxgen -o sbom-gateway.json -t nodejs services/gateway
      - name: Diff against baseline & fail on new highs
        run: |
          npx some-sbom-diff sbom-gateway.json baseline/sbom-gateway.json --fail-on high
```

---

## 4) OPA/Rego Policy Stubs

### 4.1 SLO Burn-Rate Deployment Gate
```rego
package ci.gates.slo

default allow = false

# inputs: { "metrics": {"nlq_burn_rate_6h": 0.03, "cypher_burn_rate_6h": 0.02} }
allow {
  input.metrics.nlq_burn_rate_6h <= 0.05
  input.metrics.cypher_burn_rate_6h <= 0.05
}
```

### 4.2 SBOM Diff Gate (block new HIGH/Critical)
```rego
package ci.gates.sbom

default allow = false

# inputs: { "new_vulns": {"high": 0, "critical": 0} }
allow { input.new_vulns.high == 0; input.new_vulns.critical == 0 }
```

### 4.3 WebAuthn Coverage Gate
```rego
package ci.gates.webauthn

default allow = false

# inputs: { "sensitive_endpoints": 120, "protected_endpoints": 120 }
coverage = input.protected_endpoints / input.sensitive_endpoints
allow { coverage >= 0.99 }
```

---

## 5) Synthetic NLQ Probes (k6 HTTP + correctness checks)

```js
// ops/synthetics/nlq-probes.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = { vus: 10, duration: '2m', thresholds: {
  http_req_duration: ['p(95)<2000'],
}};

const golden = [
  { q: 'list top 5 connectors by failure rate last 24h', expect: (json) => json.data.length === 5 },
  { q: 'show relationships between acme corp and subsidiaries', expect: (json) => json.data.nodes.length > 0 },
];

export default function() {
  const g = golden[Math.floor(Math.random()*golden.length)];
  const res = http.post(__ENV.NLQ_URL, JSON.stringify({ query: g.q }), { headers: { 'Content-Type': 'application/json' }});
  check(res, {
    'status 200': (r) => r.status === 200,
    'latency p95': (r) => r.timings.duration < 2000,
    'shape pass': (r) => g.expect(r.json()),
  });
  sleep(1);
}
```

GitHub workflow trigger:
```yaml
# .github/workflows/synthetics.yml
name: synthetics-nlq
on: schedule: [{ cron: '*/10 * * * *' }]
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: grafana/k6-action@v0.2.0
        with:
          filename: ops/synthetics/nlq-probes.js
        env:
          NLQ_URL: ${{ secrets.NLQ_PROBE_URL }}
```

---

## 6) Red-Team Attack-Eval Harness (NL→Cypher)

**Structure**
```
services/gateway/test/attack-eval/
  prompts/
    destructive.txt       # DROP, DELETE, DETACH, TRUNCATE
    exfiltration.txt      # schema, indexes, secrets
    traversal_bombs.txt   # excessive depth/fanout
  runner.ts               # executes NL→Cypher → constraints → explain
  scoring.ts              # FN/FP, coverage per rule
```

**Runner skeleton**
```ts
// runner.ts
import { generateCypher } from '../../src/nl2cypher';
import { checkConstraints, explain } from '../../src/nl2cypher/guardrails/constraints';

export async function runAttack(prompt: string) {
  const cypher = await generateCypher(prompt);
  const verdict = checkConstraints(cypher);
  return { cypher, verdict, explain: explain(cypher) };
}
```

**Success criteria**
- False-negative (write allowed) < **1%**
- Blocked queries logged with explanation ID and rule fingerprint

---

## 7) Prometheus SLO + Burn-Rate Alerts

```yaml
# ops/observability/slo-burnrate.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
spec:
  groups:
  - name: nlq.slo
    rules:
    - alert: NLQErrorBudgetBurnFast
      expr: (
        sum(rate(nlq_errors_total[5m])) / sum(rate(nlq_requests_total[5m]))
      ) > 0.02
      for: 5m
      labels: { severity: critical }
      annotations:
        summary: "NLQ fast burn (>2% in 5m)"
    - alert: NLQLatencyP95High
      expr: histogram_quantile(0.95, sum(rate(nlq_latency_seconds_bucket[5m])) by (le)) > 2
      for: 10m
      labels: { severity: warning }
```

---

## 8) SBOM + Cosign Keyless (OIDC) Attestations

```bash
# build.sh (per service)
cd services/gateway
cyclonedx-bom -o sbom.json
cosign attest --predicate sbom.json --type cyclonedx \
  --keyless --rekor-url https://rekor.sigstore.dev $IMAGE
```

**Verify in pipeline**
```bash
cosign verify-attestation --type cyclonedx --keyless $IMAGE | jq .
```

---

## 9) DR Drill Checklist (Postgres & Neo4j)

- ✅ Backup schedule: every 5m WAL archiving; daily full
- ✅ Integrity: nightly `pg_verifybackup` & restore-to-temp
- ✅ Restore runbook steps
  1. Quiesce writes; snapshot ER queue length
  2. Restore latest full + WAL to T-5m
  3. Point apps to replica; run synthetic probes
  4. Declare recovery complete; reconcile ER queue
- ✅ Targets: RTO ≤ 60m, RPO ≤ 5m

---

## 10) WebAuthn Step-Up Coverage Map

- **Sensitive operations**: Graph mutations, trust-policy edits, ER auto-merge override, admin role grants
- **Enforcement**: gateway policy middleware → 401 w/ `StepUpRequired`

```ts
// apps/web/src/hooks/useWebAuthnStepUp.ts (enforce before mutation)
if (api.requiresStepUp(op)) await stepUp();
```

Rego:
```rego
package gateway.auth.stepup

sensitive_ops := {"MUTATE_GRAPH", "TRUST_POLICY_EDIT", "ER_OVERRIDE", "ROLE_GRANT"}
require_step_up[op] { op := input.operation; op in sensitive_ops }
```

---

## 11) Query-Shape Controls & Depth Caps

```ts
// services/gateway/src/nl2cypher/guardrails/limits.ts
export const LIMITS = { maxDepth: 5, maxBreadth: 2000, maxNodes: 5000 };
```

**Executor check**
```ts
if (estimated.nodes > LIMITS.maxNodes || estimated.depth > LIMITS.maxDepth) {
  throw new Error('Query exceeds safe execution limits');
}
```

---

## 12) Immutable Audit Trails (Hash-Chained)

```sql
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB NOT NULL,
  prev_hash BYTEA,
  hash BYTEA NOT NULL
);
```

```ts
// hash = SHA256(prev_hash || ts || actor || action || JSON.stringify(details))
```

---

## 13) Success Metrics & Weekly Reporting

- **Reliability**: NLQ p95 < 2s, Cypher p95 < 1.5s, 99.9% avail
- **Security**: 0 critical vulns in SBOM; 100% step-up coverage
- **Quality**: ER precision/recall trend ↑; adjudication reversal rate ↓
- **Ops**: DR drill pass; mean rollback ≤ 10m

---

## 14) Open Issues to Track (Backlog IDs)

- WRITE-intent near-miss detector (AST + verb heuristics)
- Read quota per tenant w/ graceful partials
- Exemplar traces tagging (`nlq.rule_id`, `cypher.shape_id`)
- ER queue derivative alerts (growth rate)
- Ephemeral, attested CI runners
- Secretless Neo4j via workload identity
- Explainability UI for blocked queries

---

### How to Use This Pack
1. Assign owners in the RACI tables.
2. Drop CI/OPA/Prometheus snippets into the repo paths noted.
3. Schedule game day & DR drill using the checklists.
4. Turn Kanban into GitHub Projects columns (Now/Next/Later).
5. Report weekly using the Success Metrics template above.


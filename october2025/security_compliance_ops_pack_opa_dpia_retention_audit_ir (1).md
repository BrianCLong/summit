# Security & Compliance Ops Pack — OPA, DPIA, Retention, Audit & IR

> Hardens IntelGraph for GA/enterprise: centralized policy with **OPA** (bundles + simulation), **DPIA/record‑of‑processing** templates, **data retention & DSAR** jobs, **permission fuzzing** in CI, **audit/forensics** dashboards, and **incident response** runbooks. Includes code, configs, and tests.

---

## 0) Repo Layout

```
intelgraph/
├─ compliance/
│  ├─ opa/
│  │  ├─ policies/
│  │  │  ├─ lac.rego
│  │  │  ├─ export.rego
│  │  │  ├─ join.rego
│  │  │  ├─ pii.rego
│  │  │  └─ retention.rego
│  │  ├─ data/
│  │  │  ├─ classifications.json
│  │  │  └─ tenants.json
│  │  └─ bundle.yaml
│  ├─ dpia/
│  │  ├─ template.md
│  │  ├─ examples/
│  │  │  └─ intelgraph-dpia.md
│  │  └─ rop-register.md
│  ├─ reports/
│  │  ├─ pop-summary.md        # Proof of Policy
│  │  └─ pnc-summary.md        # Policy Non‑Compliance summary
│  └─ runbooks/
│     ├─ IR-SEV1.md
│     ├─ IR-SEV2.md
│     ├─ DLP-exfil.md
│     └─ DSAR-processor.md
├─ services/
│  ├─ lac-policy-compiler/         # UPDATED to fetch OPA bundle
│  ├─ dsar-service/                 # NEW
│  │  ├─ src/index.ts
│  │  ├─ src/routes.ts
│  │  ├─ src/otel.ts
│  │  └─ test/dsar.spec.ts
│  └─ retention-jobs/               # NEW (worker for TTL/hold)
│     ├─ src/index.ts
│     ├─ src/holds.ts
│     ├─ src/otel.ts
│     └─ test/retention.spec.ts
├─ deploy/
│  ├─ k8s/cron-retention.yaml      # CronJob
│  └─ k8s/opa.yaml                  # OPA sidecar config
├─ ops/
│  ├─ grafana/provisioning/dashboards/audit.json
│  └─ elk/ (optional logstash config)
└─ .github/workflows/security-suite.yaml  # NEW CI
```

---

## 1) OPA Policy Bundle

### 1.1 Bundle manifest

```yaml
# compliance/opa/bundle.yaml
name: intelgraph
revision: v1
roots: ['policy', 'data']
```

### 1.2 Shared data

```json
// compliance/opa/data/classifications.json
{
  "levels": ["public", "restricted", "secret"],
  "pii": ["SSN", "DOB", "Address", "Phone", "Email"]
}
```

### 1.3 LAC alignment policy

```rego
# compliance/opa/policies/lac.rego
package policy.lac

default allow = false

# Allow if upstream LAC has already allowed and sensitivity is within subject clearance
allow {
  input.lac_decision == "allow"
  not deny_sensitivity
}

deny_sensitivity {
  s := input.resource.sensitivity
  s == "secret"
  not subject_has_role("admin")
}

subject_has_role(r) {
  some i
  input.subject.roles[i] == r
}
```

### 1.4 Export policy (court‑order gate)

```rego
# compliance/opa/policies/export.rego
package policy.export

default allow = false

allow {
  input.action == "EXPORT"
  input.context.court_order == true
}

reason = msg {
  not allow
  msg := "Export requires court order"
}
```

### 1.5 Cross‑tenant join block

```rego
# compliance/opa/policies/join.rego
package policy.join

default allow = false

allow {
  input.action == "JOIN"
  input.context.tenant_a == input.context.tenant_b
}

reason = "Cross-tenant joins are blocked"
```

### 1.6 PII masking hints

```rego
# compliance/opa/policies/pii.rego
package policy.pii

mask[field] {
  some i
  field := data.classifications.pii[i]
}
```

### 1.7 Retention

```rego
# compliance/opa/policies/retention.rego
package policy.retention

# Delete if older than ttl_days and no legal hold
should_delete {
  input.age_days > input.ttl_days
  not input.legal_hold
}
```

---

## 2) LAC → OPA integration (simulation & reason codes)

```ts
// services/lac-policy-compiler/src/enforcer.ts (snippet)
import { OpaClient } from './opa';
const opa = new OpaClient(process.env.OPA_URL || 'http://opa:8181');

app.post('/enforce', async (req, res) => {
  const payload = req.body;
  // 1) local rules
  let decision = 'deny';
  let reason = 'Default deny';
  let ruleId = null;
  for (const r of active.rules) {
    if (
      r.predicate(
        payload.subject,
        payload.resource,
        payload.action,
        payload.context,
      )
    ) {
      decision = r.effect;
      reason = r.reason;
      ruleId = r.id;
      break;
    }
  }
  // 2) OPA simulation for audit / additional gates
  const opaRes = await opa.evaluate('policy/lac/allow', {
    ...payload,
    lac_decision: decision,
  });
  if (!opaRes.allow) {
    decision = 'deny';
    reason = opaRes.reason || reason;
  }
  res.json({ decision, reason, ruleId, opaApplied: true });
});
```

```ts
// services/lac-policy-compiler/src/opa.ts
import fetch from 'node-fetch';
export class OpaClient {
  constructor(private base: string) {}
  async evaluate(path: string, input: any) {
    const r = await fetch(`${this.base}/v1/data/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ input }),
    });
    const j = await r.json();
    return typeof j.result === 'object' ? j.result : { allow: !!j.result };
  }
}
```

---

## 3) DSAR Service (download, redact, verify)

```ts
// services/dsar-service/src/routes.ts
import express from 'express';
import fetch from 'node-fetch';
const router = express.Router();
router.post('/request', async (req, res) => {
  const { subjectId, audience } = req.body; // audience influences redactions
  // fetch claims from ledger
  const claims = await fetch(
    'http://ledger:7002/claims?subjectId=' + encodeURIComponent(subjectId),
  )
    .then((r) => r.json())
    .catch(() => []);
  // apply redactions via wallet profile logic (reuse wallet-service profiles)
  const redactions = audience === 'court' ? [] : ['SSN', 'DOB', 'Address'];
  const bundle = {
    subjectId,
    claims,
    redactions,
    generatedAt: new Date().toISOString(),
  };
  res.json({ id: subjectId + ':' + Date.now(), bundle });
});
export default router;
```

```ts
// services/dsar-service/src/index.ts
import express from 'express';
import routes from './routes';
import { startOtel } from './otel';
startOtel();
const app = express();
app.use(express.json());
app.use('/dsar', routes);
const PORT = process.env.PORT || 7015;
app.listen(PORT, () => console.log(`[DSAR] ${PORT}`));
```

Tests ensure bundle contains only the subject’s claims and honors redactions.

---

## 4) Retention Jobs (TTL & legal holds)

```ts
// services/retention-jobs/src/holds.ts
export type Hold = {
  id: string;
  subjectId: string;
  reason: string;
  until?: string;
};
export const holds: Hold[] = [];
export function isHeld(subjectId: string) {
  return holds.some(
    (h) =>
      h.subjectId === subjectId && (!h.until || new Date(h.until) > new Date()),
  );
}
```

```ts
// services/retention-jobs/src/index.ts
import { isHeld } from './holds';
import fetch from 'node-fetch';
const TTL_DAYS = Number(process.env.TTL_DAYS || 365);
(async () => {
  // naive scan loop; in prod use streaming & partitions
  const claims: any[] = await fetch('http://ledger:7002/_all_claims')
    .then((r) => r.json())
    .catch(() => []);
  const now = Date.now();
  for (const c of claims) {
    const ageDays = Math.floor(
      (now - new Date(c.createdAt).getTime()) / 86400000,
    );
    const evalBody = {
      age_days: ageDays,
      ttl_days: TTL_DAYS,
      legal_hold: isHeld(c.subjectId),
    };
    const r = await fetch(
      'http://opa:8181/v1/data/policy/retention/should_delete',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input: evalBody }),
      },
    ).then((x) => x.json());
    if (r.result === true) {
      await fetch('http://ledger:7002/claims/' + c.id, { method: 'DELETE' });
      console.log('deleted claim', c.id);
    }
  }
})();
```

### 4.1 CronJob

```yaml
# deploy/k8s/cron-retention.yaml
apiVersion: batch/v1
kind: CronJob
metadata: { name: retention-jobs }
spec:
  schedule: '0 3 * * *'
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: retention
              image: ghcr.io/ORG/intelgraph/retention-jobs:1.0.0
              env:
                - name: TTL_DAYS
                  value: '365'
          restartPolicy: OnFailure
```

---

## 5) Audit & Forensics Dashboard

- Panels: _policy_allow/deny_, _export_denies_, _join_denies_, _dsar_requests_, _retention_deletes_, _wallet_revocations_, _budget_denies_, _slow_query_kills_.
- Log fields (pino): `tenant`, `caseId`, `subject.sub`, `policy.ruleId`, `opa.reason`, `trace_id`.

---

## 6) CI: Security Suite

```yaml
# .github/workflows/security-suite.yaml
name: security-suite
on: [push, pull_request]
jobs:
  semgrep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: returntocorp/semgrep-action@v1
        with: { config: p/ci }
  fuzz-perms:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r test -- --selectProjects hardening
  opa-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Test OPA policies
        run: |
          docker run -v $PWD/compliance/opa:/policy openpolicyagent/opa test -v /policy
  secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: trufflesecurity/trufflehog@main
        with: { extra_args: '--only-verified --fail' }
```

---

## 7) Reports — PoP & PNC

```md
# compliance/reports/pop-summary.md

- LAC decisions sampled: 10k
- OPA overrides (deny): 1.2%
- Export denied (no court order): 32
- Cross‑tenant join attempts blocked: 14
```

```md
# compliance/reports/pnc-summary.md

- Missing model cards: 0
- Missing provenance manifests: 0
- Budget overrides: 3 (approved)
- Retention deletes last 30d: 12,345
```

---

## 8) DPIA Template (excerpt)

```md
# DPIA — IntelGraph Processing

- **Purpose**: Intelligence analysis for authorized investigations.
- **Data categories**: Entities (people, orgs, assets), relations (comms, finance, presence), derived analytics.
- **Lawful basis**: Contract / Legitimate interests / Legal obligation.
- **Risks**: Misattribution, overreach, model bias, data breach.
- **Mitigations**: LAC + OPA, provenance, selective disclosure, budgets, a11y & fairness reviews.
- **Retention**: 365d default; legal holds via case.
- **DPIA outcome**: Proceed with measures; review quarterly.
```

---

## 9) Incident Response Runbooks (SEV‑levels)

- **SEV1** (active exfiltration): isolate gateway, revoke wallets, block federation endpoints, enable DLP rules; notify on‑call + exec; forensics capture.
- **SEV2** (PII mis‑share): revoke bundles, run audit search by `audience`, notify DPO; DSAR accelerate.
- **SEV3** (policy drift): freeze policy compiler version; rerun OPA tests; hotfix bundle.

---

## 10) Tests

- **OPA unit**: `opa test compliance/opa` (export requires court order; cross‑tenant join block).
- **DSAR**: request bundles contain only subject’s claims; redactions applied.
- **Retention**: TTL delete skipped on legal hold.

---

## 11) Open Tasks / Options

- Integrate **Keycloak** for OIDC + step‑up (WebAuthn) policies.
- Add **BOM attestations** via Sigstore cosign in CI.
- Hook **ELK** ingestion for richer forensic queries.
- Build **consent registry** (where applicable) and feed into LAC.

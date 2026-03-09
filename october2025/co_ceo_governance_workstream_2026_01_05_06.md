# Co‑CEO Governance Workstream — Next Sprint Plan (v1)

**Window:** Jan 5–Jan 16, 2026 (Sprint 6; Q1 cadence kickoff)  
**Role:** Co‑CEO (Governance, Evidence, Compliance, GTM enablement)  
**Theme:** White‑label **Trust Portal** + **Customer Attestation API**; map packs to controls; tighten SLO budgets & cost, and make provenance self‑serve for partners.

---

## 1) Sprint Goal

“Turn our evidence into **products**: a white‑label Trust Portal and an Attestation API that expose signed Compliance Packs, control mappings, and live verification—secured by OPA and measured by SLO budgets.”

---

## 2) Objectives & Key Results (OKRs)

1. **White‑label Trust Portal v2** ready for 2 design partners.  
   _Measure:_ Two branded deployments with policy‑scoped views and signature verification.
2. **Attestation API v1** (read‑only) in prod preview.  
   _Measure:_ OpenAPI published; 3 endpoints GA behind key; rate limits + audit logs.
3. **Control Mapping Coverage ≥ 95%** (SOC2‑lite + OWASP ASVS L1).  
   _Measure:_ Each pack contains `controls.json` with mapped evidence pointers.
4. **Cost/SLO Budgets enforced in CI**.  
   _Measure:_ Budget gate blocks if p95>300ms or cost/req>Z (per repo settings).

---

## 3) Deliverables (Definition of Done)

- **Trust Portal v2 (white‑label)**: theming, tenant config, OPA presentation policies, cosign verify, evidence ledger view, partner audit download.
- **Attestation API v1**: `/attestations`, `/releases/{tag}`, `/controls` (read‑only); key‑managed; audit logging; 429s; examples.
- **Controls Mapper**: generator that converts Compliance Pack → `controls.json` (SOC2‑lite + ASVS).
- **Budget Gate**: CI job enforcing latency/cost targets; surfaces violations in Disclosure/Compliance Packs.
- **Policy bundle v1.4**: tenant scoping + API presentation guards.
- **Design Partner Playbook**: onboarding steps, proof plan, and success criteria.

---

## 4) Work Plan & Owners

| Date   | Work Item                          | Owner           | Exit Criteria                                              |
| ------ | ---------------------------------- | --------------- | ---------------------------------------------------------- |
| Jan 5  | Kickoff; tenant configs; keys      | Co‑CEO + SecOps | Two tenant configs; API gateway keys issued                |
| Jan 6  | Controls Mapper                    | DevEx           | `controls.json` generated from existing packs              |
| Jan 7  | Attestation API scaffold + OpenAPI | DevEx           | OpenAPI doc committed; mock server green                   |
| Jan 8  | OPA v1.4 (tenant + API guards)     | SecOps          | `opa test` green; bundle hash pinned                       |
| Jan 9  | Trust Portal theming + verify      | PM + Co‑CEO     | Two themes load; cosign verify shown                       |
| Jan 12 | Budget Gate in CI                  | DevEx           | Failing budgets block release; pack includes budget report |
| Jan 13 | Tenant deploys (2x)                | DevEx           | Two branded portals published (staging)                    |
| Jan 14 | API prod preview + logs            | DevEx           | Read‑only endpoints live behind key; logs visible          |
| Jan 15 | Partner dry‑run                    | Co‑CEO          | Both partners access; evidence downloads verified          |
| Jan 16 | Sprint demo + retro                | Co‑CEO          | OKRs measured; risks updated                               |

---

## 5) Artifacts & Scaffolding

### 5.1 Controls Mapper (Pack → controls.json)

**Path:** `tools/controls-mapper/map.js`

```js
#!/usr/bin/env node
import fs from 'node:fs';
const pack = JSON.parse(
  fs.readFileSync(process.argv[2] || 'compliance/manifest.json', 'utf8'),
);
const controls = [];
function add(id, ev) {
  controls.push({ id, evidence: ev });
}
// Examples
add('SOC2.CC2.2', ['sbom.json', 'provenance.intoto.jsonl', 'cosign:verify']);
add('SOC2.CC7.2', ['ops/runbooks/rollback.md', 'evidence/dr_metrics.json']);
add('ASVS.1.2.1', ['policies/policy.bundle.rego', 'policy.json']);
fs.writeFileSync(
  'controls.json',
  JSON.stringify({ version: 'v1', controls }, null, 2),
);
console.log('wrote controls.json');
```

**CI step:**

```yaml
controls_map:
  needs: [compliance]
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: node tools/controls-mapper/map.js compliance/manifest.json
    - uses: actions/upload-artifact@v4
      with: { name: controls, path: controls.json }
```

### 5.2 Attestation API — OpenAPI v1

**Path:** `apis/attestation/openapi.yaml`

```yaml
openapi: 3.0.3
info: { title: Attestation API, version: 1.0.0 }
servers: [{ url: https://api.example.com }]
paths:
  /attestations:
    get:
      summary: List attestations for latest releases
      parameters: [{ name: repo, in: query, schema: { type: string } }]
      responses:
        '200': { description: OK }
  /releases/{tag}:
    get:
      summary: Get evidence for a release tag
      parameters:
        [{ name: tag, in: path, required: true, schema: { type: string } }]
      responses: { '200': { description: OK } }
  /controls:
    get:
      summary: Control mapping for latest pack
      responses: { '200': { description: OK } }
components:
  securitySchemes: { ApiKeyAuth: { type: apiKey, in: header, name: X-API-Key } }
security: [{ ApiKeyAuth: [] }]
```

**Gateway Skeleton (Node):** `apis/attestation/server.js`

```js
import express from 'express';
import rateLimit from 'express-rate-limit';
const app = express();
app.use(rateLimit({ windowMs: 60_000, max: 60 }));
app.get('/attestations', (req, res) => res.json({ items: [] }));
app.get('/releases/:tag', (req, res) =>
  res.json({ tag: req.params.tag, evidence: [] }),
);
app.get('/controls', (req, res) => res.json({ version: 'v1', controls: [] }));
app.listen(8080);
```

### 5.3 OPA Policy v1.4 — Tenant + API Guards

**Path:** `policies/api_guard.rego`

```rego
package api

default allow = false

# Tenant scoping
allow {
  input.tenant == data.tenants.allowed[_]
  input.user.api_key_tenant == input.tenant
}

# Presentation guards (reuse v1.3 rules)
allow_field { data.presentation[input.legal_basis][input.purpose][_]==input.field }
```

**Data:** `policies/tenants.json`

```json
{ "tenants": { "allowed": ["partner-a", "partner-b"] } }
```

### 5.4 Trust Portal v2 (White‑label)

**Path:** `tools/trust-portal/tenant.config.json`

```json
{
  "tenant": "partner-a",
  "branding": { "name": "Partner A", "primary": "#2E7D32" },
  "policy": {
    "legal_basis": "legitimate_interest",
    "purpose": "design_partner"
  }
}
```

**Branding Hook (React):** `tools/trust-portal/components/BrandShell.tsx`

```tsx
export default function BrandShell({
  cfg,
  children,
}: {
  cfg: any;
  children: any;
}) {
  return (
    <div style={{ borderRadius: 16, padding: 16 }}>
      <header style={{ fontWeight: 700 }}>
        {cfg.branding.name} Trust Portal
      </header>
      <main>{children}</main>
    </div>
  );
}
```

### 5.5 Budget Gate (Latency/Cost) — CI

**Path:** `.github/workflows/budget.gate.yml`

```yaml
name: budget.gate
on: [workflow_call]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Load budgets
        run: |
          echo "p95=300" >> $GITHUB_OUTPUT
          echo "cost_per_req=0.002" >> $GITHUB_OUTPUT
      - name: Evaluate
        run: |
          P95=$(jq -r .latency_p95 metrics.json)
          CPR=$(jq -r .cost_per_req metrics.json)
          test ${P95%.*} -le 300 && test $(printf '%.0f' $(echo "$CPR*1000"|bc)) -le 2
```

**Integrate into release:**

```yaml
budget:
  needs: [verify]
  uses: ./.github/workflows/budget.gate.yml
```

### 5.6 Design Partner Playbook

**Path:** `partners/playbook.md`

```md
# Design Partner Playbook

**Proof Plan (≤2 weeks):**

1. Enable Trust Portal (white‑label) with OPA policy.
2. Cut hardened tag; portal shows green evidence & signatures.
3. Call Attestation API from partner CI; verify pack hash.
4. Canary drill replay from portal; capture Maestro link.
   **Success Criteria:** partner signs off on evidence & API integration.
```

---

## 6) Metrics & Alerts

- **Portal v2 uptime ≥ 99.9%**, errors rate < 0.1% (alert if breached).
- **API 95th latency ≤ 300ms**; 4xx/5xx < 0.5% (alert if breached).
- **Control coverage ≥ 95%** (alert if below).
- **Budget gate pass rate 100%** on latest tags (alert if < 100%).

---

## 7) Risks & Mitigations

| Risk                 | Likelihood | Impact | Mitigation                                         |
| -------------------- | ---------: | -----: | -------------------------------------------------- |
| Tenant config sprawl |        Med |    Med | Central registry + lint; limit to 2 in this sprint |
| API abuse            |        Low |    Med | Rate limits + API keys + audit logs                |
| Control mapping gaps |        Med |    Med | Manual review for top‑20 controls; add tests       |
| Budget false blocks  |        Low |    Med | Feature flag + override via Decision with expiry   |

---

## 8) Alignment Notes

- Continues Q4 outcomes: signed packs, ledger, portal, OPA v1.3.
- Sets up Q1 mid‑sprint: auditor pilot + white‑label packaging + pricing guardrails.

---

## 9) Exit Checklist

- Trust Portal v2 deployed for two partners with policy‑scoped evidence.
- Attestation API v1 live in prod preview; OpenAPI published.
- Controls mapped & shipped in packs; coverage >= 95%.
- CI budget gate active and referenced in Compliance/Disclosure Packs.
- Demo complete; metrics posted; risks updated.

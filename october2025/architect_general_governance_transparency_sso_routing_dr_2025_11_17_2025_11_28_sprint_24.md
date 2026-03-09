# Architect-General — Governance Transparency, SSO Federation, Multi‑Region Routing, DR Automation

**Workstream:** CompanyOS Governance & Resilience — Switchboard Platform  
**Sprint Window:** 2025-11-17 → 2025-11-28 (10 biz days)  
**Ordinal:** Sprint 24 (Q4’25 cadence)  
**Prime Objective:** Make governance and resilience **verifiable by default**: transparency‑logged policy bundles, attribute‑mapped SSO federation, multi‑cloud region routing with health‑based failover, automated DR simulations, advanced audit search, and canary scoring that respects user journeys.

---

## 0) Executive Summary

- **Track A (Now‑value):**
  - **Policy Transparency:** Push policy bundle signatures to **Rekor** (or transparency log of choice) and verify at startup; show verification status in UI.
  - **SSO Federation & ABAC Mapper:** OIDC/SAML attribute ingest → ABAC mapping → OPA input; mapper UI + tests.
  - **Multi‑Region Routing (US/EU) + Cloud A/B:** DNS/GSLB config + health checks + sticky region cookie.
  - **Automated DR Sims:** On‑push chaos workflows that exercise backup/restore and region failover; evidence pack.
  - **Audit Advanced Search:** FTS (Postgres) + saved queries + export presets.
  - **Canary Scoring:** Weighted probe suite aligned to top user journeys; deploy gate on score.
- **Track B (Moat):**
  - **Policy Bundle Attestations:** SLSA provenance + cosign attest for `bundle.tar.gz` with predicate schema.
  - **Error Budget Enforcement:** Pre‑deploy burn‑rate check; block rollouts if breach ongoing.

**Definition of Done:**

- Policy bundle verify path checks signature + transparency inclusion proof; UI shows green check + bundle digest.
- SSO logins produce ABAC context; deny/allow decisions evidence includes federation attributes (redacted).
- Routing favors region healthy target; failover drill succeeds; evidence attached.
- DR job restores within RTO≤30m; audit advanced search returns within 300ms p95 for common queries.
- Canary score ≥ 90 to proceed; burns >2x block deploy.

---

## 1) Objectives & Key Results

**OBJ‑1: Transparency‑Logged Policy Bundles**

- **KR1.1** CI logs Rekor entry UUID for `switchboard.bundle.tar.gz`.
- **KR1.2** Init verify checks cosign + Rekor inclusion proof; startup blocked on failure.
- **KR1.3** UI banner displays bundle digest, Rekor UUID, verify timestamp.

**OBJ‑2: SSO Federation with ABAC Mapper**

- **KR2.1** Support OIDC (Auth0/Entra) + SAML (Okta) claims ingestion.
- **KR2.2** Mapping DSL → ABAC context (`role`, `residency`, `classification_cap`, `groups`).
- **KR2.3** Policy tests confirm mapped attributes enforce step‑up and residency.

**OBJ‑3: Multi‑Cloud Multi‑Region Routing**

- **KR3.1** DNS/GSLB health checks per region (US‑A, EU‑B).
- **KR3.2** Sticky `x-region` cookie + override UI; synthetic probes per region cloud.
- **KR3.3** Failover drill: blackhole region; SLOs hold; auto‑rollback works if score < 90.

**OBJ‑4: Automated DR Simulations**

- **KR4.1** Weekly workflow: backup verify + restore into sandbox; integrity diff.
- **KR4.2** Evidence pack archived (hashes, counts, timings).
- **KR4.3** RPO≤15m/RTO≤30m met.

**OBJ‑5: Audit Advanced Search & Presets**

- **KR5.1** Postgres FTS (`GIN` on `to_tsvector('simple', jsonb::text)`) for `subject/resource/context`.
- **KR5.2** Saved queries API + UI; one‑click export with manifest.
- **KR5.3** p95 query latency ≤300ms for 1M rows (staging dataset).

**OBJ‑6: Canary Scoring + Error Budget Gate**

- **KR6.1** Weighted scoring across journeys: Home(30), Agents(25), Audit(25), Admin(20).
- **KR6.2** Gate requires score ≥90; otherwise rollback.
- **KR6.3** Pre‑deploy burn‑rate check (last 1h) <% error budget; block if >2x.

---

## 2) Work Breakdown & Owners

| #   | Epic    | Issue                        | Owner   | Acceptance                            | Evidence                    |
| --- | ------- | ---------------------------- | ------- | ------------------------------------- | --------------------------- |
| A   | Policy  | Rekor log + verify gate      | SRE     | Startup blocks on unverifiable bundle | Rekor UUID, verify logs     |
| B   | SSO     | OIDC/SAML ingest + mapper UI | AppEng  | Mappings applied; tests green         | Login traces, audit entries |
| C   | Routing | DNS/GSLB + region cookie     | SRE     | Failover drill success                | Probe reports, route logs   |
| D   | DR      | Weekly restore sim           | ProdOps | RPO/RTO met                           | Evidence pack with hashes   |
| E   | Audit   | FTS indexes + saved queries  | DataEng | p95 ≤300ms                            | EXPLAIN ANALYZE, timings    |
| F   | Release | Canary score + budget gate   | DevOps  | Gate enforces thresholds              | CI logs, rollback proof     |

---

## 3) Implementation Artifacts (Drop‑in)

### 3.1 CI: Build, Sign, Attest & Rekor Log (`.github/workflows/policy.bundle.yml`)

```yaml
name: policy-bundle
on: [push]
jobs:
  build-sign-log:
    runs-on: ubuntu-latest
    permissions: { id-token: write, contents: read }
    steps:
      - uses: actions/checkout@v4
      - name: Build bundle
        run: |
          opa build -b policies -t tar.gz -o dist/switchboard.bundle.tar.gz
      - name: Cosign sign & attest
        run: |
          cosign sign-blob --yes dist/switchboard.bundle.tar.gz > dist/bundle.sig
          gh attestation sign --subject file:dist/switchboard.bundle.tar.gz --predicate-type cyclonedx
      - name: Rekor upload
        run: |
          rekor-cli upload --artifact dist/switchboard.bundle.tar.gz --signature dist/bundle.sig --public-key <(cosign public-key) --format json > dist/rekor.json
      - uses: actions/upload-artifact@v4
        with: { name: policy-bundle, path: dist/ }
```

### 3.2 Init Verify with Rekor Inclusion (`deploy/helm/switchboard/templates/init-verify.yaml`)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: switchboard-verify
spec:
  initContainers:
    - name: verify-bundle
      image: ghcr.io/org/verify-tool:latest
      command: ['/bin/sh', '-c']
      args:
        - >-
          set -e; \
          cosign verify-blob --yes --signature /policy/bundle.sig /policy/switchboard.bundle.tar.gz; \
          rekor-cli verify-entry --log-index $(cat /policy/rekor.json | jq -r '.LogIndex');
      volumeMounts: [{ name: policy, mountPath: /policy }]
  containers:
    - name: noop
      image: busybox
      command: ['sh', '-c', 'sleep 1']
  volumes: [{ name: policy, configMap: { name: switchboard-policy-cm } }]
```

### 3.3 UI: Policy Verify Banner (`apps/web/src/components/PolicyVerifyBanner.tsx`)

```tsx
export function PolicyVerifyBanner({
  digest,
  rekorUUID,
  verifiedAt,
}: {
  digest: string;
  rekorUUID: string;
  verifiedAt: string;
}) {
  return (
    <div className="rounded-2xl p-3 bg-emerald-50 border border-emerald-200">
      <div className="text-sm">Policy bundle verified ✓</div>
      <div className="text-xs font-mono break-all">{digest}</div>
      <a
        className="text-xs underline"
        href={`https://rekor.tlog.dev/entries/${rekorUUID}`}
        target="_blank"
      >
        transparency record
      </a>
      <div className="text-xs">{new Date(verifiedAt).toLocaleString()}</div>
    </div>
  );
}
```

### 3.4 SSO Federation — Mapping DSL & UI

**Mapping DSL (`config/sso/abac-map.yaml`)**

```yaml
version: 1
providers:
  - name: okta_saml
    match: { issuer: 'https://okta.example.com/app/...' }
    map:
      role: '${assertion.attributes.role}' # e.g., Admin/Operator/Analyst
      residency: '${assertion.attributes.region}' # US/EU
      classification_cap: '${assertion.attributes.clearance}' # 0..3
      groups: '${assertion.attributes.groups}' # CSV
  - name: entra_oidc
    match: { issuer: 'https://login.microsoftonline.com/<tenant>/v2.0' }
    map:
      role: '${claims.roles[0]}'
      residency: '${claims.extension_region}'
      groups: '${claims.groups}'
```

**Mapper (`apps/server/lib/abac-map.ts`)**

```ts
import yaml from 'js-yaml';
export function mapToAbac(payload: any, cfgYaml: string) {
  const cfg: any = yaml.load(cfgYaml); // validate against schema in CI
  const p = cfg.providers.find((p: any) => matches(p.match, payload.issuer));
  if (!p) throw new Error('no_provider_match');
  const ctx: any = { subject: { authenticated: true } };
  ctx.subject.role = evalTpl(p.map.role, payload);
  ctx.subject.residency = evalTpl(p.map.residency, payload);
  ctx.subject.classification_cap = Number(
    evalTpl(p.map.classification_cap || '2', payload),
  );
  ctx.subject.groups = evalTpl(p.map.groups || '[]', payload);
  return ctx;
}
```

**SSO Settings UI (excerpt)**

```tsx
// apps/web/src/app/admin/sso/page.tsx
export default function SSOMapper() {
  /* upload/edit abac-map.yaml, validate, test mapping with sample assertion */
}
```

### 3.5 OPA Policy Use of Federation Context (`policies/switchboard_v0_4.rego`)

```rego
package switchboard

import future.keywords.if

allow if {
  input.subject.authenticated
  input.subject.role in {"admin","operator","analyst"}
  input.resource.classification <= input.subject.classification_cap
  not deny[_]
}

deny[{"code":"GROUP_REQUIRED"}] if {
  input.action == "admin_panel"
  not contains(input.subject.groups, "platform-admins")
}
```

### 3.6 Multi‑Region / Multi‑Cloud Routing

**DNS/GSLB (pseudo‑config)**

```hcl
record "switchboard.example.com" {
  type = "ALIAS"
  targets = ["us-a.companyos.net", "eu-b.companyos.net"]
  policy  = "latency"
  health_checks = ["us-a-hc", "eu-b-hc"]
}
```

**Edge Sticky Cookie**

```ts
// apps/web/src/middleware.ts
export function middleware(req: any) {
  const cookies = req.cookies;
  let region = cookies.get('x-region')?.value;
  if (!region) {
    region = detect(req);
  }
  const res = NextResponse.next();
  res.cookies.set('x-region', region, { maxAge: 60 * 60 * 24 * 7 });
  res.headers.set('x-region', region);
  return res;
}
```

**Probes per Cloud**

```yaml
# ops/synthetics/probe.multi.yaml
probes:
  - { name: us-a-home, url: https://switchboard.example.com/, headers:{x-region:US}, expect_status:200 }
  - { name: eu-b-home, url: https://switchboard.example.com/, headers:{x-region:EU}, expect_status:200 }
```

### 3.7 Automated DR Simulation (`.github/workflows/dr-sim.yml`)

```yaml
name: dr-sim
on:
  schedule: [{ cron: '0 5 * * 3' }]
  workflow_dispatch:
jobs:
  restore-into-sandbox:
    runs-on: ubuntu-latest
    steps:
      - name: Spin up sandbox DB
        run: kubectl apply -f infra/sandbox/db.yaml
      - name: Restore latest backup
        run: ./ops/bin/restore-latest.sh --target sandbox
      - name: Integrity diff
        run: node scripts/audit-diff.js --source prod --target sandbox --sample 10000
      - name: Archive evidence
        uses: actions/upload-artifact@v4
        with: { name: dr-evidence, path: evidence/dr/* }
```

### 3.8 Audit Advanced Search

**Indexes (`db/migrations/20251117_audit_fts.sql`)**

```sql
create extension if not exists pg_trgm;
create index if not exists audit_events_ts on audit_events using gin (ts);
create index if not exists audit_events_ft on audit_events using gin ((to_tsvector('simple', coalesce(subject::text,'') || ' ' || coalesce(resource::text,'') || ' ' || coalesce(context::text,''))));
```

**Search API**

```ts
// /api/audit/search?q=analyst+deny+EU&from=...&to=...
```

**Saved Queries (`apps/web/src/app/audit/saved.ts`)**

```ts
export type SavedQuery = {
  id: string;
  name: string;
  q: string;
  from?: string;
  to?: string;
};
```

### 3.9 Canary Scoring & Error Budget Gate

**Scoring Script (`ops/gates/canary-score.js`)**

```js
const fs = require('fs');
const weights = { home: 0.3, agents: 0.25, audit: 0.25, admin: 0.2 };
const results = JSON.parse(fs.readFileSync('probe.results.json', 'utf8'));
function score() {
  let s = 0;
  for (const k of Object.keys(weights)) {
    const r = results[k];
    s += (r.pass ? 1 : 0) * weights[k] * 100;
  }
  console.log(`score=${s}`);
  if (s < 90) process.exit(1);
}
score();
```

**Burn‑Rate Check (`ops/gates/burnrate.sh`)**

```bash
#!/usr/bin/env bash
set -euo pipefail
BURN=$(curl -s $SLO_API/burnrate/1h | jq -r '.burn')
echo "burnrate=$BURN"
awk "BEGIN { exit ($BURN>2.0) }"
```

**Deploy Gate**

```yaml
- name: Canary score gate
  run: node ops/gates/canary-score.js
- name: Error budget gate
  run: ops/gates/burnrate.sh
```

---

## 4) Testing Strategy

- **Unit:** Mapper DSL parser; policy deny codes; scoring script; FTS query builder.
- **Integration:** Startup verify (unsigned/rekor‑missing); SSO login mapping; failover drill; DR restore integrity.
- **Security:** Rekor verify paths; signed bundle enforcement; SSO claims validation; DLP continues.
- **Performance:** Audit search p95; routing latency under failover; canary score under load.

---

## 5) Acceptance Checklist (DoR → DoD)

- [ ] Rekor inclusion proof verified at startup; UI banner renders digest + UUID.
- [ ] OIDC/SAML mapping works; ABAC context visible in audit (redacted); policy v0.4 tests green.
- [ ] Region routing across cloud A/B with sticky cookie; probes green; failover drill passes.
- [ ] DR simulation completed within RPO/RTO; evidence artifacts archived.
- [ ] Audit advanced search fast; saved queries export manifest correct.
- [ ] Canary score ≥90; burn‑rate gate enforced; rollback verified on failure.

---

## 6) Risks & Mitigations

- **Transparency log availability** → cache inclusion proof; allow degraded start with feature flag only in staging; prod blocks.
- **IdP claim drift** → schema validation + tests with sample assertions; versioned mappings.
- **DNS/GSLB propagation delays** → short TTLs; health‑based failover; edge override for emergency.
- **DR sandbox cost/permissions** → time‑boxed cluster; scheduled teardown.

---

## 7) Evidence Hooks

- **Rekor UUID:** …
- **Bundle digest:** …
- **SSO mapping test vectors:** …
- **Failover drill timestamp:** …
- **DR restore duration:** …
- **Audit search p95:** …
- **Canary score & burn rate:** …

---

## 8) Backlog Seed (Sprint 25)

- Policy transparency monitor with alerts; attribute mapper UI presets per IdP; geo‑sharding for audit data; region‑aware caching; UI session continuity during failover; anomaly detection on audit streams; A/B scoring per cohort; provenance viewer (bundle → Rekor → release → runtime verify).

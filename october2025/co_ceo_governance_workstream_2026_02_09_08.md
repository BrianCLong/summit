# Co‑CEO Governance Workstream — Next Sprint Plan (v1)

**Window:** Feb 9–Feb 21, 2026 (Sprint 8; Q1 cadence)  
**Role:** Co‑CEO (Governance, Evidence, Compliance, GTM enablement)  
**Theme:** **Auditor Pilot** + **Partner DevEx** + **Pricing Guardrails** — convert provenance into commercial trust and repeatable audits.

---

## 1) Sprint Goal

“Run an end‑to‑end **auditor pilot** using signed Compliance Packs and the Trust Portal, launch **Partner Dev Center** with SDKs/samples, and ship **pricing & usage guardrails** bound to attestation value — all evidenced in packs and dashboards.”

---

## 2) Objectives & Key Results (OKRs)

1. **Auditor pilot completed** with clean opinion & action items ≤ 3.  
   _Measure:_ Auditor checklist signed; findings logged as Decisions with owners & dates.
2. **Partner Dev Center v1 live** with 2 SDKs and copy‑paste samples.  
   _Measure:_ Quickstart ≤ 10 minutes; sample CI verifies pack signature & policy hash.
3. **Pricing guardrails defined + enforced** by usage/attestation tiers.  
   _Measure:_ Plans mapped to feature toggles; overage alerts fired in sandbox; portal shows plan.
4. **Risk reduction**: supply‑chain **risk score ≤ 60** across latest tags.  
   _Measure:_ SBOM diff tool reports ≤ 60 or Decision override present.

---

## 3) Deliverables (Definition of Done)

- **Auditor Pilot Kit**: checklist, evidence index, read‑only auditor tenant in Trust Portal, auditor‑view policy bundle, and export pack.
- **Partner Dev Center v1**: docs site (static), language SDKs (**Node**, **Python**), sample CI templates (GitHub Actions), and Postman collection for Attestation API.
- **Pricing & Usage Guardrails**: plan matrix (Starter/Pro/Enterprise), OPA pricing policy, API rate tiers, and portal plan badges.
- **Evidence UX polish**: pack signature + ledger verification in portal; vendor attestation drilldown; SBOM diff clarity.
- **Dashboards**: auditor readiness, partner funnel (quickstarts, API calls), attestation‑gated features usage.

---

## 4) Work Plan & Owners

| Date   | Work Item                              | Owner           | Exit Criteria                                         |
| ------ | -------------------------------------- | --------------- | ----------------------------------------------------- |
| Feb 9  | Auditor pilot scope + tenant & policy  | Co‑CEO + SecOps | Auditor tenant deployed; policy `auditor-view` pinned |
| Feb 10 | Evidence index + pilot runbook         | Co‑CEO          | `/auditor/INDEX.md` lists artifacts + hashes          |
| Feb 11 | Partner Dev Center scaffold + content  | PM + DevEx      | Docs build; Node/Python SDK stubs publishable         |
| Feb 12 | SDKs + CI templates + Postman          | DevEx           | SDKs install; sample CI verifies pack & policy hash   |
| Feb 13 | Pricing policy & plan toggles          | Co‑CEO          | `pricing.rego` merged; plan matrix in repo            |
| Feb 17 | Portal plan badges + auditor UX polish | PM              | Badges render; auditor export works                   |
| Feb 18 | Pilot walkthrough + Q&A                | Co‑CEO          | Findings captured as Decisions; ≤ 3 action items      |
| Feb 20 | Metrics + demo + retro                 | Co‑CEO          | OKRs measured; dashboards updated                     |

---

## 5) Artifacts & Scaffolding

### 5.1 Auditor Pilot Kit

**Path:** `/auditor/INDEX.md`

```md
# Auditor Evidence Index — ${TAG}

- Compliance Pack: `compliance-pack.zip` (sha256: ...)
- SBOM: `sbom.json`
- Provenance: `provenance.intoto.jsonl`
- Signatures: `compliance-pack.sig` (cosign keyless)
- Policy bundle: version + sha256
- Decision logs: (links/IDs)
- Maestro runs: (links)
```

**Auditor policy overlay** `policies/auditor_view.rego`

```rego
package presentation
# Restrictive view: only fields required for audit scope
allow_field[f] { f == data.audit.allowed[_] }
```

**Data** `policies/audit.json`

```json
{
  "audit": {
    "allowed": [
      "tag",
      "evidence_hash",
      "policy_version",
      "attestation_state",
      "critical_vulns",
      "controls"
    ]
  }
}
```

### 5.2 Partner Dev Center (Docs + SDKs)

**Path:** `devcenter/README.md`

```md
# Partner Dev Center v1

- Quickstart (10 min): verify Compliance Pack signature and policy hash.
- SDKs: Node, Python.
- CI templates: GitHub Actions.
- Postman collection: Attestation API v1.1.
```

**Node SDK stub** `sdk/node/index.ts`

```ts
export async function verifyPack({
  packUrl,
  sigUrl,
}: {
  packUrl: string;
  sigUrl: string;
}) {
  /* fetch + cosign-wasm */ return { verified: true, sha256: '...' };
}
export async function getRelease(tag: string) {
  return fetch(`/releases/${tag}`).then((r) => r.json());
}
```

**Python SDK stub** `sdk/python/topicality_attest/__init__.py`

```python
def verify_pack(pack_url:str, sig_url:str)->dict:
    # TODO: implement cosign verify
    return {"verified": True, "sha256": "..."}
```

**CI template** `.github/workflows/partner.verify.yml`

```yaml
name: partner.verify
on: [workflow_dispatch]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - name: Download evidence
        run: |
          curl -fsSLO $PACK_URL
          curl -fsSLO $SIG_URL
      - name: Verify signature
        run: |
          COSIGN_EXPERIMENTAL=1 cosign verify-blob --certificate-oidc-issuer https://token.actions.githubusercontent.com \
            --signature compliance-pack.sig compliance-pack.zip
```

**Postman collection** `devcenter/postman/attestation.collection.json` (skeleton with `/attestations`, `/releases/{tag}`, `/controls`).

### 5.3 Pricing Guardrails (OPA + Matrix)

**Path:** `pricing/plan.matrix.json`

```json
{
  "Starter": { "api_rps": 2, "portal": true, "vendor_attestations": false },
  "Pro": { "api_rps": 10, "portal": true, "vendor_attestations": true },
  "Enterprise": {
    "api_rps": 100,
    "portal": true,
    "vendor_attestations": true,
    "auditor_tenant": true
  }
}
```

**Policy** `pricing/pricing.rego`

```rego
package pricing

allow_request {
  input.plan_limit.api_rps >= input.request.rps
}

allow_feature { data.plan[input.tenant.plan][input.feature] == true }
```

**Gateway hook (excerpt)**

```js
// Resolve tenant plan; enforce rate and feature access
if (!policy.allow_feature({ tenant, feature: 'vendor_attestations' }))
  return res.status(403).json({ error: 'plan' });
```

### 5.4 Portal Enhancements (Badges + Drilldown)

**Path:** `tools/trust-portal/components/Badges.tsx`

```tsx
export function PlanBadge({
  plan,
}: {
  plan: 'Starter' | 'Pro' | 'Enterprise';
}) {
  const color =
    plan === 'Enterprise'
      ? 'bg-purple-100'
      : plan === 'Pro'
        ? 'bg-blue-100'
        : 'bg-gray-100';
  return <span className={`px-2 py-1 rounded-2xl ${color}`}>{plan}</span>;
}
```

**Vendor drilldown** `tools/trust-portal/components/VendorDrawer.tsx` (lists `vendor_attestations.json` items with verification icons).

### 5.5 Dashboards (adds)

- **Auditor readiness** (green when packs signed, portal auditor tenant active, findings ≤ 3).
- **Partner funnel**: quickstarts started/completed, SDK downloads, API calls/day.
- **Pricing guardrail hits**: 403 plan denials, RPS throttles (rate & trend).
- **Risk score trend** across last 5 tags.

---

## 6) Risks & Mitigations

| Risk                          | Likelihood | Impact | Mitigation                                    |
| ----------------------------- | ---------: | -----: | --------------------------------------------- |
| Auditor access scope creep    |        Med |    Med | Auditor policy overlay + time‑boxed tenant    |
| SDK verification complexity   |        Med |    Med | Start with server‑side verify API; wasm later |
| Plan mis‑tiering causes churn |        Low |    Med | Clear matrix; override Decision with expiry   |
| Partner onboarding friction   |        Med |    Med | 10‑min quickstart; sample repos; office hours |

---

## 7) Alignment Notes

- Builds on Sprint 7 GA (API, portal packaging, vendor attestations, SBOM diff).
- Converts provenance into GTM assets: auditor pilot + dev center + pricing controls.

---

## 8) Exit Checklist

- Auditor pilot executed; findings logged with owners/dates.
- Dev Center live with SDKs, CI template, Postman; quickstart ≤ 10 min validated.
- Pricing guardrails enforced in API & portal; badges visible.
- Packs/portal reflect signature, ledger, SBOM diff, vendor attestations; risk score ≤ 60 or justified.
- Dashboards updated; demo recorded; retro complete.

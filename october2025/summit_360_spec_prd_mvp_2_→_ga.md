# Summit — 360° Spec & PRD (MVP‑2 → GA)

> Author: Angleton IG (Security • DevSecOps • Counterintelligence)
> Date: 2025‑09‑30 (America/Denver)
> Repo: `BrianCLong/summit` (public)

---

## Executive Summary

Summit has matured into a multi‑service platform with API, client apps, data pipelines, orchestration (Airflow), dashboards, connectors, security assets, and extensive CI/CD metadata. This doc gives a 360° view from a defensive, reliability, and delivery lens. It captures **current state** (as‑is), **gaps/risks**, and **concrete specs** for **MVP‑2** and **GA**—including success criteria, architecture deltas, test plans, controls, rollout, and backstops. Defaults emphasize _least privilege, provenance, and measurability_.

---

## Product North Star & Guardrails

**North Star**: A trustworthy, observable, and resilient platform for ingesting, enriching, and acting on operational intelligence (people, process, infra) with explainability and tight safety gates.

**Guardrails**:

- **Prime Directive**: Protect people, data, funds, infra, and brand. No collateral harm.
- **Assume Breach**: Segment blast radius; enable forensics; graceful degradation.
- **Evidence or It Didn’t Happen**: Decisions tied to artifacts (hashes, logs, attestations, PRs).
- **Change Safety**: Testable, reversible, observable. No “mystery mitigations.”
- **Least Privilege Everywhere**: Short‑lived creds; scoped roles; policy‑as‑code.

---

## Current State (As‑Is Inventory)

> Derived from visible repo structure and issue headers. This section is intentionally high‑level and focused on architecture & controls, not feature minutiae.

### Components

- **Core Services & Apps**
  - `api/` — primary service surface, likely Node/TS or Python based on ecosystem files.
  - `client/`, `client-v039/`, `apps/`, `dashboard/`, `conductor-ui/` — frontends and ops consoles.
  - `connectors/` — external system integrations.
  - `controllers/`, `controls/` — domain orchestration & policy layers.
  - `companyos/`, `catalog/`, `analytics/`, `ai-ml-suite/`, `cognitive-*` — data/ML and knowledge layers.
- **Data & Pipelines**
  - `data-pipelines/`, `airflow/dags/` — ETL/ELT flows.
  - `db/` — schemas/migrations; `data/` sample/reference sets; `GOLDEN/datasets` for truth sets.
- **Security & Compliance**
  - `SECURITY/`, `.security/`, `RUNBOOKS/`, `alerting/`, `alertmanager/`, `.zap/` (DAST), `.vale/` (docs lint), `.githooks/`, `.husky/`.
  - `crypto/kms/` — cryptographic key mgmt scaffolding.
- **CI/CD & Release Mgmt**
  - `.github/` (Actions), `.ci/`, `charts/` (Helm), `deploy/` (manifests), `docker/` images, `.devcontainer/`.
  - Merge queue present; Issues mention **PR dashboards**, **micro‑canary**, **chaos drills**, **flaky test quarantine**, **maestro build**.
- **Ops & Observability**
  - `benchmarks/harness/`, `alerting/`, `analytics/`.
- **Gov & Process**
  - `adr/` (architecture decisions), `contracts/`, `comms/templates`, `backlog/`.

### What’s Working (Signals)

- Structured repos for security testing (ZAP), docs lint (Vale), and runbooks exist.
- Helm charts + deployment assets imply Kubernetes (likely EKS) with room for ArgoCD/Helm promotion flows.
- Evidence of chaos testing and micro‑canary planning.
- Merge queue + flaky test triage culture.

### Likely Tech Assumptions

- K8s (Helm charts present), GitHub Actions CI, containerized workloads, Postgres/Redis in stack, Cloudflare DNS/Tunnels feasible, OPA policy potential, CycloneDX/SBOM desirable.

---

## Gaps & Risks (Topline)

> Scored by likelihood × impact; examples include technical, process, and counter‑influence.

1. **Supply‑Chain Verifiability** — Attestations and signature verify gates not universally enforced across services; unsigned images or lax digest pinning risk.
2. **Secrets Hygiene** — Potential for long‑lived tokens, env var creep, and insufficient session binding in CI.
3. **Policy Coverage** — OPA/ABAC likely partial; lack of centralized policy bundle across services.
4. **SBOM/License Drift** — Inconsistent SBOM generation per artifact; no unified _fail‑the‑build_ strategy for critical CVEs.
5. **Test Flake & Release Risk** — Flaky tests quarantined ad hoc; micro‑canary planned but not automatically enforced across waves.
6. **Runtime Segmentation** — NetworkPolicies and egress controls may be permissive; lateral movement risk in cluster.
7. **Observability Gaps** — SLOs/SLIs for _security_ (e.g., failed policy evals, gate adherence) not codified.
8. **Data Lineage & DLP** — ETL/ML flows without end‑to‑end lineage attestations and redaction enforcement at sinks.
9. **Human Workflow** — Merge outside freeze windows, review anomalies, or label churn risks (social engineering vectors).
10. **Incident Evidence Chain** — Tamper‑evident logs & immutable audit stream may be partial.

---

## Objectives & Key Results

### MVP‑2 (Horizon: 2–4 weeks)

- **Ship a verifiable build pipeline**: SLSA‑aligned provenance + cosign keyless signing + verify gates.
- **Operational micro‑canary**: 1% → 10% → 50% → 100% wave plan enforced by policy.
- **Secrets to short‑lived**: OIDC‑based CI auth; eliminate static PATs.
- **SBOM everywhere**: CycloneDX per artifact; fail on criticals w/ allowlist exceptions.
- **Quarantine flake**: Automatic quarantine workflow + owner notifications + burn‑down KPI.

### GA (Horizon: 6–10 weeks)

- **Policy‑as‑Code first**: Central OPA bundle (authZ, deploy gates, data access) with staged enforcement.
- **Zero‑trust runtime**: Namespace isolation + NetworkPolicies + egress allow‑lists + pod identity.
- **Data lineage + DLP**: Lineage attestations from source→sink; redaction filters; disclosure logging.
- **Evidence pipeline**: Tamper‑evident audit stream; incident evidence packets auto‑assembled.
- **Availability & Safety SLOs**: Error budget & deployment freeze automation.

---

## Product Scope — MVP‑2

### Problem to Solve

Ensure every release is **provable**, **reversible**, and **low blast‑radius** while we stabilize features and reduce flaky noise that blocks true signal.

### Users & Personas

- **Core Devs**: Want fast, safe merges; high‑signal failures.
- **SRE/SecOps**: Need attestations, rollback levers, and reliable alerts.
- **Leads/PM**: Need release burn‑down, canary status, and risk summaries.

### MVP‑2 Feature Set

1. **Provenance & Signing**
   - SLSA provenance generation per build.
   - Container signing (cosign keyless via OIDC); verify in CI and at deploy.
2. **SBOM & Policy Gates**
   - CycloneDX SBOM emitted for all images & packages.
   - OPA policy: block merge if `provenance=verified ∧ SBOM=clean ∧ secrets=0 leaks`.
3. **Secrets & Identity**
   - GitHub → cloud via OIDC; remove static cloud creds.
   - Time‑boxed tokens in dev/test; session binding for admin actions.
4. **Release Safety**
   - Micro‑canary controller: automated wave progression gated by metrics & policy.
   - Freeze‑window enforcement; exceptions require ticket + approvals.
5. **Test Health**
   - Flake quarantine bot: label + skip + owner ping; weekly burn‑down target (‑25%).

### Non‑Goals (MVP‑2)

- Full zero‑trust mesh; deep PII reclassification; multi‑tenant controls beyond current scope.

### Acceptance Criteria (MVP‑2)

- 100% of release images are signed; unsigned deploys rejected.
- SBOM published to artifact store; builds fail on CRITICAL vulns unless explicitly waived.
- Canary waves auto‑progress within 2 hours given SLO adherence; auto‑rollback on breach.
- No static cloud credentials in CI.
- Flake rate reduced by ≥25% vs. last 30‑day baseline.

---

## Product Scope — GA

### Problem to Solve

Scale safely to broader usage while keeping trust high: stricter policies, stronger isolation, observable data flows, and a documented recovery path.

### GA Feature Set

1. **Central OPA Policy Bundle**
   - ABAC for services + data access; admission control for K8s; deployment gates.
   - Policy test suite & contract tests per service.
2. **Runtime Hardening**
   - Namespace‑per‑service; NetworkPolicies default‑deny; egress allow‑lists; HPA + PDB.
   - Pod identities; IRSA (AWS) or equivalent.
3. **Data Governance**
   - End‑to‑end lineage (build → pipeline → model → dashboard) via attestations.
   - DLP/redaction filters and disclosure logging; de‑identification in non‑prod.
4. **Observability & SLOs**
   - Security SLOs (policy eval success, signature verify rate, secret leak MTTR) alongside availability.
   - Alerting with runbook links + auto‑evidence packet creation.
5. **Incident Evidence Chain**
   - Tamper‑evident logs (hash chaining); immutable artifact of each incident (timeline + graph).
6. **Release Mgmt**
   - Error‑budget‑driven freeze; staged traffic restore 1%→10%→50%→100%.

### Acceptance Criteria (GA)

- 95%+ policy coverage measured by policy tests; 100% coverage for deploy & auth gates.
- 0 unsigned images admitted to cluster; 0 static creds in CI.
- Mean time to rollback < 15 min; evidence packet auto‑generated within 5 min of incident start.
- Data lineage present for 90%+ critical flows; DLP redaction at all sinks with unit tests.

---

## Architecture (Target)

```text
Dev → CI (GH Actions) → Build (SLSA provenance) → Sign (cosign keyless) → SBOM (CycloneDX) →
Policy Eval (OPA bundle) → Push (OCI registry w/ cosign attestations) →
ArgoCD/Helm promotion (verify gate) → K8s namespaces (default‑deny NP, egress allow‑list) →
Runtime attest & monitor (Prom/Grafana; SLO gates) → Evidence stream (tamper‑evident log)
```

**Key Interfaces**

- **Policy Bundle**: shared Rego package; exported `export.rego` for downstream tooling.
- **Verify Gate**: reusable GH Action + admission controller check.
- **Canary Controller**: metrics → policy; halts/rollbacks.
- **Evidence Stream**: append‑only (hash‑chained) → object store w/ retention.

---

## Backlog (Prioritized)

1. Reusable Action: `verify-provenance-and-signature@v1` + OIDC hardening.
2. SBOM generation Action with CycloneDX + upload to release assets.
3. OPA policy bundle repo/module; unit test scaffolding + conftest.
4. K8s admission policy to reject unsigned/dirty images.
5. Micro‑canary workflow & controller harness; health metric contracts.
6. Secrets scanner (pre‑commit + CI) and rotation playbooks.
7. NetworkPolicies (namespace templates) + egress policy overlays.
8. DLP/redaction filters in data sinks; lineage attestations in ETL.
9. Tamper‑evident evidence pipeline (hash chain + manifest).
10. PR dashboards: provenance, SBOM, policy, canary status per PR.

---

## Security & Compliance Controls (MVP‑2 → GA)

### Supply Chain

- **Build reproducibility** and provenance (SLSA L3 target).
- **Signing**: cosign keyless; verify at CI and admission.
- **SBOM**: CycloneDX JSON; Store + diff; CVE policy thresholds.

### Secrets & Identity

- OIDC for CI→Cloud; eliminate static secrets; step‑up WebAuthn for sensitive actions.
- Ephemeral tokens; boundary roles; rotation playbooks.

### Infra & Network

- K8s namespaces per service; default‑deny NetworkPolicies; egress allow‑list; service mesh optional.
- IAM least privilege; IRSA; audit on assume‑role.

### Data Safety

- DLP/redaction in ETL sinks; masking in non‑prod; lineage records; access logs with purpose binding.

### Observability

- Security SLIs: signature‑verify rate, policy‑eval success, secret‑leak MTTR, canary‑rollback MTTA.
- Dashboards with error budgets & freeze automation.

---

## CI/CD — Proposed Diffs & Snippets

> Drop‑in examples to seed PRs. Adjust paths/ids to match repo.

### 1) GitHub Actions: OIDC + Hard Permissions

```yaml
# .github/workflows/build.yml (excerpt)
permissions:
  contents: read
  id-token: write # for OIDC
  packages: write
  security-events: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - name: Set up node
        uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - name: Cosign install
        uses: sigstore/cosign-installer@v3
      - name: Build & tag
        run: |
          docker build -t $IMAGE:$(git rev-parse --short HEAD) .
      - name: Generate SLSA provenance
        uses: slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@v2
      - name: Sign image (keyless)
        run: |
          cosign sign --yes $IMAGE@$(docker inspect --format='{{index .RepoDigests 0}}' $IMAGE)
      - name: CycloneDX SBOM
        run: |
          npm install -g @cyclonedx/cdxgen
          cdxgen -o sbom.cdx.json
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with: { name: sbom-and-provenance, path: 'sbom.cdx.json' }
```

### 2) OPA Policy Gate (CI)

```yaml
# .github/workflows/policy-gate.yml (excerpt)
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install conftest
        uses: instrumenta/conftest-action@v0.3
      - name: Evaluate policies
        run: conftest test --policy policy-bundle ./attestations ./sbom
```

### 3) Admission Control (K8s)

```yaml
# Gatekeeper Constraint (reject unsigned)
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredAnnotations
metadata: { name: require-signed-images }
spec:
  match: { kinds: [{ apiGroups: [''], kinds: ['Pod', 'Deployment'] }] }
  parameters:
    message: 'Unsigned images are not permitted'
```

### 4) Micro‑Canary Promotion (Helm values)

```yaml
# charts/service/values.yaml (excerpt)
rollout:
  waves:
    - { percentage: 1, minDuration: 30m, slo: { errorRate: '<1%' } }
    - { percentage: 10, minDuration: 1h, slo: { errorRate: '<1%' } }
    - { percentage: 50, minDuration: 2h, slo: { errorRate: '<1%' } }
    - { percentage: 100 }
```

---

## Testing Strategy

- **Unit**: policy tests (Rego), SBOM & signatures validators, schema migration tests.
- **Contract**: connector mocks; API version pinning; error budget assertions.
- **E2E**: canary wave progression; auto rollback on SLO breach; DLP filters verified on sample datasets.
- **Chaos/Resilience**: pod evictions (PDB), network egress cuts, dependency failures.
- **Security**: DAST (ZAP), SAST/secret scan, provenance & admission tests.

---

## Rollout Plan & Safeguards

**MVP‑2**: Enable verify gates in “advisory” → enforce after 1 week of clean runs. Shadow SBOM checks; raise alerts for violations; fix backlog. Canary to 10% max until verify+SBOM green.

**GA**: Enforce all gates; admission reject on unsigned/dirty; namespace isolation live; egress allow‑lists live. Error‑budget‑driven freeze automated.

Rollback always available via Helm previous revision; evidence packet auto‑created with:

- artifacts digests, SBOMs, policy results, SLO snapshots, runbook refs.

---

## Risks & Mitigations

- **Build breakage from CVE gate** → staged thresholds, curated allowlists, nightly rebuilds.
- **Developer friction** → PR dashboards summarizing provenance/SBOM/policy with how‑to‑fix.
- **False positives in secret scanning** → baselines + suppressions with expiry.
- **Admission outages** → dry‑run + alert only for 1 week; canary rollout; emergency bypass documented.

---

## Metrics & Dashboards

- **Release Safety**: % signed images; verify rate; time‑to‑rollback; canary rollback rate.
- **Supply Chain**: SBOM coverage; critical CVE count; attestation freshness.
- **Security Hygiene**: secret leaks (count/MTTR); policy eval success; admission reject counts.
- **Quality**: test flake rate; change failure rate; lead time for changes.

---

## Ownership & RACI (initial)

- **Policy Bundle / Gates** — SecEng (D), DevEx (A), Service Owners (R), SRE (C/I)
- **SBOM & CVE Policy** — SecEng (A/R), Service Owners (R), DevEx (C)
- **Canary Controller** — SRE (A/R), Service Owners (R), PM (C), SecEng (I)
- **NetworkPolicies/Egress** — SRE (A/R), SecEng (C), Owners (I)
- **Evidence Pipeline** — SecEng (A/R), SRE (C), PM (I)

---

## PR Templates & Checklists (snippets)

**PR Body (delta)**

- [ ] SBOM attached
- [ ] Image digest + cosign attestation link
- [ ] Policy tests added/updated
- [ ] Migration tested against staging snapshot
- [ ] Runbook updated (if user‑visible impact)

---

## Runbooks (links to repo paths to be filled by owners)

- **Containment (token leak)** — disable tokens → rotate → isolate workload (NP + scale‑to‑zero canary) → preserve forensics.
- **Eradication** — patch/upgrade, policy tighten, artifact rebuild with provenance.
- **Recovery** — staged traffic restore 1%→10%→50%→100%; guard with error budget.
- **Post‑Incident** — evidence packet; timeline & graph; PIR within 72h.

---

## Open Questions (to resolve async with owners)

- Which services are most critical for micro‑canary prioritization? (name top 3)
- Confirm cloud: EKS + IRSA? (adjust OIDC claims accordingly)
- Confirm registry & policy engines (Gatekeeper vs. Kyverno) to finalize admission rules.
- Confirm SBOM tool choices per language (cdxgen, syft, gradle‑cyclonedx) and standardize.

---

## Appendix — Policy Examples (Rego)

```rego
package deploy.gates

deny[msg] {
  input.image.signed == false
  msg := "Unsigned image"
}

deny[msg] {
  some cve in input.sbom.criticals
  not input.sbom.allowlist[cve]
  msg := sprintf("Critical CVE %s not allowlisted", [cve])
}
```

---

_End of document._

## Angleton IG — Structured Output

**summary:** Summit requires enforceable supply‑chain gates, automated micro‑canary, and secret hygiene upgrades to reliably progress to GA without increasing blast radius. This plan delivers signed, attested builds; SBOM‑gated merges; OPA policies; runtime isolation; and an evidence pipeline.

**risk_score:** 62/100

**confidence:** medium (repo is large; some assumptions pending owner confirmation)

**key_findings:**

- id: supply_chain_verifiability
  evidence: [".github/", "charts/", "docker/", "deploy/"]
  impact: "Unsigned or unverifiable artifacts could reach prod; provenance gaps"
  exploit_path: "compromised dependency → build → unsigned image → cluster"
- id: secrets_hygiene
  evidence: [".ci/", ".github/", "RUNBOOKS/"]
  impact: "Credential leakage or reuse; build system impersonation"
  exploit_path: "stolen token → elevated CI perms → artifact poisoning"
- id: policy_coverage
  evidence: ["controls/", "controllers/", "SECURITY/"]
  impact: "Inconsistent enforcement; bypass of deploy/data gates"
  exploit_path: "missing admission policy → dirty image admitted"
- id: data_lineage_dlp
  evidence: ["airflow/dags/", "data-pipelines/", "analytics/"]
  impact: "Untracked sensitive fields; disclosure risk"
  exploit_path: "ETL → sink without redaction"

**recommended_actions:**

- title: Enforce provenance+signature verify gates
  change_type: PR
  effort: M
  prereqs: ["OIDC to cloud", "cosign installer", "registry permissions"]
  diff_or_patch: |
  Add cosign keyless signing to build workflow; add verify job and admission policy.
- title: Emit SBOMs and block on critical CVEs (with allowlist)
  change_type: PR
  effort: M
  prereqs: ["cdxgen/syft in build", "artifact store"]
  diff_or_patch: |
  Add CycloneDX step; upload SBOM; conftest policy to fail build on criticals.
- title: Centralize OPA policy bundle
  change_type: Policy
  effort: M
  prereqs: ["policy-bundle repo", "conftest in CI"]
  diff_or_patch: |
  Create `policy-bundle` package; add CI job to evaluate per PR.
- title: Implement micro‑canary controller
  change_type: Infra
  effort: M
  prereqs: ["metrics contracts", "Helm values wiring"]
  diff_or_patch: |
  Add wave logic values; gate on SLOs; auto rollback on breach.
- title: Namespace isolation + NetworkPolicies + egress allowlists
  change_type: Infra
  effort: M
  prereqs: ["service inventory", "cluster policy engine"]
  diff_or_patch: |
  Add namespace templates; default‑deny NP; restrict egress to required hosts.
- title: Evidence pipeline (tamper‑evident)
  change_type: Runbook
  effort: S
  prereqs: ["object store", "hashing lib"]
  diff_or_patch: |
  Append hash‑chained JSONL of events; rotate manifests per deploy.

**verification:**

- checks: ["cosign-verify-ci", "admission-reject-unsigned-e2e", "sbom-critical-block-unit", "policy-bundle-contract-tests", "canary-rollback-e2e", "secret-scan-ci"]
- success_criteria: "0 unsigned images deployed; SBOM coverage 100%; policy tests ≥95% pass; rollback <15m; flake rate −25% in 30 days"

**owners_notified:** ["SecEng", "SRE", "DevEx", "Service Owners", "PM"]

**links:**
pr: "(to be added with first implementation PR)"
runbook: "RUNBOOKS/ (populate specific files)"
dashboards: ["Release Safety", "Supply Chain", "Security Hygiene", "Quality"]

---

# Co‑CEO Governance Workstream — Next Sprint Plan (v1)

**Window:** Oct 20–Oct 31, 2025 (Sprint 2 of Q4 cadence)  
**Role:** Co‑CEO (Governance, Cadence, Release Gate, Evidence)  
**Scope Focus:** Scale the hardened release path across repos; close provenance gaps; enforce ABAC + step‑up; stand up disclosure-first demos; drill rollback.

---

## 1) Sprint Goal

“Every product repo ships **the same hardened release** with **auto‑generated Disclosure Packs**, **provable provenance**, and **OPA‑guarded access**; a live demo tag proves the path end‑to‑end with a timed rollback exercise.”

---

## 2) Objectives & Key Results (OKRs)

1. **Provenance manifest coverage → 100%** across MC, IG, Switchboard.  
   _Measure:_ All release tags attach `sbom.json` + `provenance.intoto.jsonl` + `disclosure-pack.md`.
2. **ABAC policy adoption → 100%** (policy bundle v1 loaded + tests passing).  
   _Measure:_ `opa test` green in CI; policy version pinned in Disclosure Pack.
3. **Time‑to‑first‑value ≤ 14 days** for a new repo adopting the gate.  
   _Measure:_ From issue open → first hardened release.
4. **Canary/rollback drill executed** with evidence.  
   _Measure:_ Maestro run includes fail→rollback→restore sequence + Decision log.

---

## 3) Deliverables (Definition of Done)

- **Repo parity:** `release.hardened.yml` + templates added to **MC**, **IG**, **Switchboard**; green CI.
- **OSV + Trivy checks:** vulnerability scan included in verify stage; results summarized in Disclosure Pack.
- **Cosign attestations:** provenance and SBOM signed + `cosign verify-attestation` step green.
- **Policy bundle v1.1:** `origin/sensitivity/legal_basis` + data‑minimization selector; tests + examples.
- **Decision guard:** PR label rules enforced across org repos.
- **Rollback drill:** Scheduled fire‑drill run; canary budget breached, auto‑rollback executed; Maestro + IG entries linked.
- **Dashboards:** Release & CI Health board shows SBOM/attestation pass rates + MTTR rollback.

---

## 4) Backlog → Sprint Slice (Two‑week plan)

### 4.1 Scale Hardened Release to IntelGraph (IG)

- Add `.github/workflows/release.hardened.yml` (from MC bundle)
- Wire `post_to_maestro.sh` + secrets
- Add `disclosure-pack.tmpl.md`
- Gate: `check_decision.sh` on `release`/`schema-change` PRs

### 4.2 Verify Stage Upgrades (all repos)

- Add **OSV scanner** and **Trivy SBOM scan**
- Add **cosign** attestation signing & verification
- Summarize advisories in Disclosure Pack under **Vuln Summary**

### 4.3 OPA Policy Bundle v1.1

- Add data minimization selector policy + examples
- Add step‑up prompt contract (MFA/WebAuthn)
- Add regression tests (`opa test policies -v`)

### 4.4 Canary/Rollback Drill

- Create synthetic metrics payloads (pass/fail)
- Schedule drill; capture Maestro/IG artifacts
- Publish **Runbook v1** in repo `/ops/runbooks/rollback.md`

### 4.5 Dashboards & Alerts

- Add panels for: Attestation pass rate, OSV criticals over time, Drill MTTR
- Alerts: Critical OSV > 0 blocks release; Attestation pass < 100% last 24h

---

## 5) Work Plan & Owners

| Day    | Work Item                | Repo        | Owner           | Exit Criteria                                       |
| ------ | ------------------------ | ----------- | --------------- | --------------------------------------------------- |
| Oct 20 | Kick & secrets setup     | org         | Co‑CEO + SecOps | `MAESTRO_URL/_TOKEN`, `COSIGN_*`, `GH_TOKEN` in env |
| Oct 21 | Port hardened release    | IG          | DevEx           | CI green on tag dry‑run                             |
| Oct 22 | OSV+Trivy add            | all         | DevEx           | `verify` job emits SARIF + Disclosure summary       |
| Oct 23 | Cosign sign/verify       | all         | SecOps          | `cosign verify-attestation` passes                  |
| Oct 24 | OPA v1.1 + tests         | Switchboard | SecOps          | `opa test` green; examples committed                |
| Oct 27 | Decision guard org‑wide  | all         | Co‑CEO          | PRs with labels fail if no Decision.md              |
| Oct 28 | Canary drill (fail path) | MC          | SRE             | Auto‑rollback executed; Maestro run linked          |
| Oct 29 | Canary drill (pass path) | MC          | SRE             | Canary promoted; Disclosure Pack updated            |
| Oct 30 | Dashboards wired         | grafana     | DevEx           | Panels/alerts live                                  |
| Oct 31 | Demo + tag cut           | all         | Co‑CEO          | Live demo, evidence pack archived                   |

---

## 6) Implementation Snippets

### 6.1 Verify Stage: OSV & Trivy & Cosign

```yaml
verify:
  needs: [build, provenance]
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/download-artifact@v4
      with: { name: sbom, path: . }
    - uses: actions/download-artifact@v4
      with: { name: provenance, path: . }
    - name: OSV scan
      uses: google/osv-scanner-action@v1
      with: { sbom: sbom.json, output: osv.json }
    - name: Trivy SBOM scan
      uses: aquasecurity/trivy-action@0.22.0
      with:
        {
          scan-type: 'sbom',
          input: 'sbom.json',
          format: 'json',
          output: 'trivy.json',
        }
    - name: Cosign sign attestations
      run: |
        cosign attest --predicate sbom.json --type cyclonedx $GITHUB_REF_NAME --yes
        cosign attest --predicate provenance.intoto.jsonl --type slsaprovenance $GITHUB_REF_NAME --yes
    - name: Cosign verify
      run: |
        cosign verify-attestation $GITHUB_REF_NAME --type cyclonedx --certificate-identity-regexp ".*" --certificate-oidc-issuer-regexp ".*"
        cosign verify-attestation $GITHUB_REF_NAME --type slsaprovenance --certificate-identity-regexp ".*" --certificate-oidc-issuer-regexp ".*"
    - name: Summarize vulns
      run: |
        CRIT=$(jq '[.vulnerabilities[]?|select(.severity=="CRITICAL")] | length' trivy.json)
        echo "critical_vulns=$CRIT" >> $GITHUB_OUTPUT
```

### 6.2 Disclosure Pack: Vulnerability Section Patch

```md
## Vulnerabilities (from verify stage)

- Trivy criticals: $CRITICALS
- OSV notable advisories: (top 5 listed here)
- Blockers: Release blocked if criticals > 0 unless approved by Decision.md
```

### 6.3 OPA Policy v1.1 (Data Minimization Selector)

```rego
package minimization

# Permit only required fields per purpose
allow { some f; f := input.request.fields[_]; f in data.allowed[input.request.purpose] }
```

### 6.4 Runbook: Rollback (Ops)

```md
# Rollback Drill — v1

1. Trigger canary with budget X/Y/Z
2. On budget breach 2x window → `scripts/rollback.sh` (idempotent)
3. Post Maestro event {start, breach, rollback, restore}
4. Record Decision (Rollback) with owner + residual risk
```

---

## 7) Risks & Mitigations

| Risk                   | Likelihood | Impact | Mitigation                                                      |
| ---------------------- | ---------: | -----: | --------------------------------------------------------------- |
| Cosign key mgmt errors |        Med |   High | Use OIDC keyless first; rotate policy weekly                    |
| OSV false positives    |        Med |    Med | Decision override process; weekly deps updates                  |
| Policy drift           |        Low |   High | Pin policy version; test in CI; publish hash in Disclosure Pack |

---

## 8) Acceptance Demo

- Walkthrough of tag cut in **each repo**, show attached evidence files.
- Show Grafana board with attestation and OSV panels.
- Replay Maestro run for rollback drill; show IntelGraph Decision cross‑links.

---

## 9) Exit Artifacts (to be committed)

- `.github/workflows/release.hardened.yml` (all repos)
- `.github/templates/disclosure-pack.tmpl.md` (+ vuln section)
- `policies/policy.bundle.rego` and `policies/minimization.rego` (+ tests)
- `scripts/post_to_maestro.sh`, `scripts/canary_check.sh`, `scripts/rollback.sh`
- `/ops/runbooks/rollback.md`
- `dashboards/*.json` (updated)

---

## 10) Alignment Notes

- **MC** continues conductor API & canary; **IG** adopts release gate; **Switchboard** improves desktop/web build matrix.
- This sprint is a two‑way door: all changes reversible via feature flags & policy version pinning.

# Co‑CEO Governance Workstream — Next Sprint Plan (v1)

**Window:** Dec 8–Dec 19, 2025 (Sprint 5 of Q4 cadence)  
**Role:** Co‑CEO (Governance, Compliance, Release Gate, Evidence)  
**Theme:** From **Compliance Pack** to **Auditor‑ready**: externalizable evidence, DR metrics (RPO/RTO), and partner‑facing Disclosure Portal hardening.

---

## 1) Sprint Goal

“Elevate disclosure→compliance into **auditor‑ready by default** with signed packs, immutable evidence, DR SLOs measured, and a **partner‑safe portal** exposing only the necessary facts.”

---

## 2) Objectives & Key Results (OKRs)

1. **Signed Compliance Packs → 100%**  
   _Measure:_ `cosign verify-blob` passes for `compliance-pack.zip` on all latest tags.
2. **DR SLOs measured & published**  
   _Measure:_ For each active repo/service: **RPO ≤ 15 min**, **RTO ≤ 30 min** evidenced in Maestro runs & packs.
3. **Portal v1.2 (Partner‑safe)** live  
   _Measure:_ WebAuthn sign‑in, policy‑scoped views, and redaction of sensitive fields; uptime panel ≥ 99.9%.
4. **Evidence immutability**  
   _Measure:_ Pack hashes anchored to an append‑only log (Git tags + manifest), portal shows anchor & verification state.

---

## 3) Deliverables (Definition of Done)

- **Pack signing pipeline** (cosign keyless) + verification job and badge.
- **Append‑only evidence ledger** (`/evidence/LEDGER.md` + Git tag manifest + optional Sigstore transparency link).
- **DR test harness v2** measuring **RPO/RTO** with synthetic load + clock‑skew guard.
- **Portal v1.2**: WebAuthn login, policy‑scoped presentation, pack signature check, evidence hash diff, status badges.
- **Policy bundle v1.3**: export minimization + presentation rules (what partners can see by legal basis/purpose).
- **DLP+Secrets scan gate** on packs & portal assets (pre‑publish), with redaction report in pack.

---

## 4) Work Plan & Owners

| Date   | Work Item                               | Owner       | Exit Criteria                                           |
| ------ | --------------------------------------- | ----------- | ------------------------------------------------------- |
| Dec 8  | Pack signing + verify jobs              | SecOps      | `cosign attest/verify-blob` green on latest tags        |
| Dec 9  | Evidence ledger & manifest              | DevEx       | `LEDGER.md` generated; hashes match; portal reads it    |
| Dec 10 | DR harness v2 (RPO/RTO)                 | SRE         | Maestro run emits metrics; thresholds evaluated         |
| Dec 11 | Portal v1.2 auth shell (WebAuthn)       | PM + Co‑CEO | Login flow works locally; no secrets in client          |
| Dec 12 | Policy v1.3 (presentation/minimization) | SecOps      | `opa test` green; registry bumped; portal honors policy |
| Dec 15 | DLP + secrets scan gate                 | DevEx       | Fails on leak; redaction report attached to pack        |
| Dec 17 | Partner dry‑run demo                    | Co‑CEO      | Partner view shows green badges; signature verified     |
| Dec 19 | Sprint demo + retro                     | Co‑CEO      | All OKRs reported; risks updated                        |

---

## 5) Artifacts & Scaffolding

### 5.1 Pack Signing & Verification (CI patches)

**Path:** `.github/workflows/release.hardened.yml` (extend)

```yaml
sign_compliance_pack:
  needs: [compliance]
  runs-on: ubuntu-latest
  steps:
    - uses: actions/download-artifact@v4
      with: { name: compliance-pack, path: . }
    - name: Cosign sign blob (keyless)
      run: |
        COSIGN_EXPERIMENTAL=1 cosign sign-blob --yes --output-signature compliance-pack.sig compliance-pack.zip
    - name: Upload signature
      uses: actions/upload-artifact@v4
      with: { name: compliance-signature, path: compliance-pack.sig }

verify_release:
  needs: [sign_compliance_pack]
  runs-on: ubuntu-latest
  steps:
    - uses: actions/download-artifact@v4
      with: { name: compliance-pack, path: . }
    - uses: actions/download-artifact@v4
      with: { name: compliance-signature, path: . }
    - name: Verify signature
      run: |
        COSIGN_EXPERIMENTAL=1 cosign verify-blob \
          --certificate-oidc-issuer https://token.actions.githubusercontent.com \
          --signature compliance-pack.sig compliance-pack.zip
```

### 5.2 Evidence Ledger Generation

**Path:** `.github/actions/evidence-ledger/action.yml`

```yaml
name: 'Evidence Ledger'
description: 'Generate append-only ledger of evidence files with hashes and tag anchors'
runs:
  using: 'composite'
  steps:
    - shell: bash
      run: |
        mkdir -p evidence
        echo "# Evidence Ledger\n" > evidence/LEDGER.md
        for f in sbom.json provenance.intoto.jsonl disclosure-pack.md compliance-pack.zip; do
          if [ -f "$f" ]; then
            h=$(sha256sum "$f" | awk '{print $1}')
            echo "- ${GITHUB_REF_NAME} ${f} \`$h\`" >> evidence/LEDGER.md
          fi
        done
        git config user.email ci@local && git config user.name ci
        git add evidence/LEDGER.md
        git commit -m "chore(evidence): update ledger for ${GITHUB_REF_NAME}" || true
```

**Wire into workflow** after `verify_release`.

### 5.3 DR Harness v2 — Measure RPO/RTO

**Path:** `scripts/dr_slo.sh`

```bash
set -euo pipefail
START=$(date +%s)
# Simulate load & capture last commit time (RPO)
now_ns=$(date +%s%N)
echo "$now_ns" > /tmp/synthetic_event
# Trigger backup then crash/restore in scratch env
./scripts/backup_restore.sh
RESTORE_END=$(date +%s)
RTO=$((RESTORE_END-START))
# Compare synthetic_event presence post-restore to measure RPO
if [ -f /tmp/synthetic_event ]; then RPO=0; else RPO=900; fi # replace with real check
jq -n --arg tag "$GITHUB_REF_NAME" --argjson rpo "$RPO" --argjson rto "$RTO" '{tag:$tag,rpo:$rpo,rto:$rto,ts:now|todate}' > evidence/dr_metrics.json
```

**CI Gate:** fail if `rpo>900 || rto>1800` (example budgets).

### 5.4 Policy v1.3 — Presentation/Minimization

**Path:** `policies/presentation.rego`

```rego
package presentation

# Only expose evidence fields allowed for a given legal_basis & purpose
allow_field[f] {
  f := input.field
  allow := data.presentation[input.legal_basis][input.purpose]
  f == allow[_]
}
```

**Data:** `policies/presentation.json`

```json
{
  "legitimate_interest": {
    "design_partner": [
      "tag",
      "evidence_hash",
      "policy_version",
      "attestation_state",
      "critical_vulns"
    ]
  }
}
```

### 5.5 Portal v1.2 — Auth & Verification (excerpt)

**Path:** `tools/disclosure-portal/lib/verify.ts`

```ts
export async function verifySignature(blobUrl: string, sigUrl: string) {
  // Fetch and verify on server using cosign/cosign-wasm or a service
  // Return {verified:boolean, sha256:string}
}
```

**Partner View Component:** `tools/disclosure-portal/components/PartnerCard.tsx`

```tsx
export function PartnerCard({
  repo,
  tag,
  hash,
  vulns,
  attested,
  policy,
}: {
  repo: string;
  tag: string;
  hash: string;
  vulns: number;
  attested: boolean;
  policy: string;
}) {
  const color = !attested || vulns > 0 ? 'bg-red-100' : 'bg-green-100';
  return (
    <div className={`p-4 rounded-2xl ${color}`}>
      <h3 className="font-semibold">
        {repo} — {tag}
      </h3>
      <p>
        Evidence: <code>{hash.slice(0, 12)}</code> • Policy {policy}
      </p>
      <p>
        Trivy criticals: {vulns} • Attested: {attested ? 'yes' : 'no'}
      </p>
    </div>
  );
}
```

### 5.6 DLP & Secrets Scan (pre‑publish)

**Path:** `.github/workflows/portal.publish.yml` (excerpt)

```yaml
dlp_scan:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Scan artifacts for secrets
      run: |
        npx gitleaks detect --no-git -s ./public -r reports/gitleaks.json || true
        jq '.findings|length' reports/gitleaks.json | tee reports/dlp_count.txt
        if [ $(cat reports/dlp_count.txt) -gt 0 ]; then exit 1; fi
    - uses: actions/upload-artifact@v4
      with: { name: dlp-report, path: reports/gitleaks.json }
```

---

## 6) Dashboards & Alerts (adds)

- **Pack signature coverage:** 100% (alert if <100%).
- **DR SLOs:** RPO/RTO by repo (alert if budget exceeded).
- **Portal auth failures:** spike alert; **uptime < 99.9%** alert.
- **Ledger divergence:** pack hash ≠ latest ledger entry → red.

---

## 7) Risks & Mitigations

| Risk                             | Likelihood | Impact | Mitigation                                          |
| -------------------------------- | ---------: | -----: | --------------------------------------------------- |
| Keyless verification instability |        Med |    Med | Pin cosign version; preflight verify; fallback path |
| DR test flakiness                |        Med |   High | Isolate env; deterministic fixtures; repeat 3x rule |
| Portal auth UX friction          |        Low |    Med | WebAuthn + recovery codes; clear error states       |
| Over‑restriction via policy v1.3 |        Low |    Med | Feature flag; A/B on partner demo                   |

---

## 8) Alignment Notes

- Builds on Sprint 4 (Compliance Pack, residency/retention, portal 1.1).
- Sets up Q1‑2026: auditor engagement, white‑labelable Trust Portal, and customer attestation APIs.

---

## 9) Exit Checklist

- Compliance Pack signed & verified on all latest tags.
- Evidence ledger committed; portal displays verification state.
- DR RPO/RTO measured and within budget (or Decision override logged).
- Policy v1.3 enforced; portal scopes presentation accordingly.
- DLP/secret scans green on portal artifacts and packs.
- Demo delivered; risks updated; next sprint seeds created.

# Co‑CEO Governance Workstream — Next Sprint Plan (v1)

**Window:** Nov 17–Dec 5, 2025 (Sprint 4 of Q4 cadence)  
**Role:** Co‑CEO (Governance, Compliance, Release Gate, Evidence)  
**Theme:** Automate **SOC2‑lite Disclosure Pack** + **Design‑Partner Trust Demo**; harden recovery & data‑handling with provable evidence.

---

## 1) Sprint Goal
“Turn disclosure‑first into **audit‑ready by default**: every hardened release emits a **Compliance Pack** (SOC2‑lite + DPIA/DPA if applicable), redacts sensitive outputs, links to Maestro/IntelGraph, and proves **backup/restore** and **incident runbooks** with verifiable artifacts.”

---

## 2) Objectives & Key Results (OKRs)
1) **Disclosure Pack → Compliance Pack** (auto‑generated) across active repos.  
   *Measure:* Release includes `compliance-pack.zip` with manifests + hashes.
2) **Backup/Restore verification ≥ 1 per repo** with evidence.  
   *Measure:* Maestro run contains `backup` → `restore` checks + success signal.
3) **Policy bundle v1.2** (data residency + retention) enforced.  
   *Measure:* `opa test` green; bundle hash pinned in Compliance Pack.
4) **Redaction & export watermarking** on by default for sensitive exports.  
   *Measure:* CI shows redaction scanner pass; sample exports carry watermark.
5) **Design‑partner Trust Demo** runs end‑to‑end from Portal with proof links.  
   *Measure:* Portal v1.1 surfaces compliance indicators (green/yellow/red).

---

## 3) Deliverables (Definition of Done)
- **Compliance Pack Composer**: composite action that aggregates SBOM, provenance, attestations, OSV/Trivy summaries, OPA bundle/version, Decision log, Maestro run links, DPIA/DPA, Risk & Ethics memo, backup/restore evidence, export‑redaction report → `compliance-pack.zip`.
- **OPA Policy v1.2**: residency + retention policies + tests.
- **Backup/Restore Runbook + scripts** with verification harness.
- **Incident Response (Tabletop) Runbook** with checklists and Decision template.
- **Disclosure Portal v1.1**: shows compliance status, bundle hash, and drill results; adds downloadable Compliance Pack.
- **Redaction/Watermark tool** (CLI) with CI step.

---

## 4) Work Plan & Owners
| Date | Work Item | Owner | Exit Criteria |
|---|---|---|---|
| Nov 17 | Kick, scope sync, secrets & env | Co‑CEO + SecOps | `RESIDENCY_REGION`, `RETENTION_DAYS` published; tokens verified |
| Nov 18 | Composite action: Compliance Pack | DevEx | `compliance-pack.zip` produced in dry‑run |
| Nov 19 | OPA v1.2 (residency & retention) | SecOps | `opa test` green; policy hash emitted |
| Nov 20 | Redaction/Watermark CLI + CI step | DevEx | Sample artifacts redacted + watermarked; CI gate passes |
| Nov 21 | Backup/Restore scripts + harness | SRE | Test data backed up/restored; checks pass; evidence logged |
| Nov 24 | Incident Response tabletop v1 | Co‑CEO | Decision.md (IR) created; lessons added to risk memo |
| Nov 25 | Portal v1.1 (compliance view) | PM + Co‑CEO | Portal displays status + download link; no secrets |
| Dec 2  | Repo roll‑out & parity close | DevEx | All active repos emit Compliance Pack |
| Dec 4  | Demo & drill replay | Co‑CEO | Live demo: portal + restore proof + IR tabletop |
| Dec 5  | Sprint close, retro, risks update | Co‑CEO | Metrics and heatmap updated; next sprint brief drafted |

---

## 5) Artifacts & Scaffolding

### 5.1 Composite Action — Compliance Pack Composer
**Path:** `.github/actions/compliance-pack/action.yml`
```yaml
name: 'Compliance Pack Composer'
description: 'Bundle disclosure + compliance evidence into compliance-pack.zip'
runs:
  using: 'composite'
  steps:
    - shell: bash
      run: |
        mkdir -p .compliance
        cp sbom.json .compliance/
        cp provenance.intoto.jsonl .compliance/
        test -f trivy.json && cp trivy.json .compliance/ || true
        test -f osv.json && cp osv.json .compliance/ || true
        POLICY_JSON=.github/policy/registry.json
        POLICY_VERSION=$(jq -r '.current.version' $POLICY_JSON)
        POLICY_SHA=$(jq -r '.bundles[.current.version].sha256' $POLICY_JSON)
        echo "{\"policy_version\":\"$POLICY_VERSION\",\"policy_sha256\":\"$POLICY_SHA\"}" > .compliance/policy.json
        # Include Decision and Maestro pointers if present
        test -f .github/decision/Decision.md && cp .github/decision/Decision.md .compliance/ || true
        test -f maestro.json && cp maestro.json .compliance/ || true
        # Include DPIA/DPA templates if applicable
        test -f compliance/DPIA.md && cp -r compliance .compliance/ || true
        # Backup/restore evidence, redaction report
        test -f evidence/backup_restore.json && cp -r evidence .compliance/ || true
        test -f reports/redaction_report.json && cp -r reports/redaction_report.json .compliance/ || true
        # Zip with manifest
        (cd .compliance && find . -type f -print0 | sort -z | xargs -0 sha256sum) > .compliance/MANIFEST.sha256
        (cd .compliance && zip -qr ../compliance-pack.zip .)
        echo "COMPLIANCE_SHA=$(sha256sum compliance-pack.zip | awk '{print $1}')" >> $GITHUB_OUTPUT
    - uses: actions/upload-artifact@v4
      with: { name: compliance-pack, path: compliance-pack.zip }
```

### 5.2 Workflow Patch — Add Compliance Pack & Portal Upload
**Path:** `.github/workflows/release.hardened.yml` (extend)
```yaml
  compliance:
    needs: [verify]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with: { name: sbom, path: . }
      - uses: actions/download-artifact@v4
        with: { name: provenance, path: . }
      - uses: actions/download-artifact@v4
        with: { name: disclosure, path: . }
      - uses: ./.github/actions/compliance-pack
      - name: Attach Compliance Pack
        uses: softprops/action-gh-release@v2
        with:
          files: compliance-pack.zip
```

### 5.3 OPA Policy v1.2 — Residency & Retention
**Path:** `policies/residency_retention.rego`
```rego
package governance

# Enforce data residency (region whitelist) and retention windows
allow_access {
  input.resource.region == data.residency.allowed[_]
}

allow_retention_action {
  # Deletes allowed only when record.age_days >= policy.retention_days
  input.action == "delete"
  input.record.age_days >= data.retention.days
}

deny_reason[r] { input.resource.region != data.residency.allowed[_]; r := "region_not_allowed" }
```

**Data file:** `policies/data.json`
```json
{ "residency": { "allowed": ["us-west-2", "eu-central-1"] }, "retention": { "days": 30 } }
```

**Tests:** `opa test policies -v`

### 5.4 Backup/Restore Harness
**Path:** `scripts/backup_restore.sh`
```bash
set -euo pipefail
BACKUP_FILE="artifacts/backup-$(date +%Y%m%d%H%M%S).tgz"
# Backup
pg_dump "$DB_URL" | gzip > "$BACKUP_FILE"
sha256sum "$BACKUP_FILE" > "$BACKUP_FILE.sha256"
# Restore to scratch env
createdb scratch_db || true
zcat "$BACKUP_FILE" | psql scratch_db
# Verification query(s)
psql scratch_db -c "SELECT count(*)>0 AS ok FROM critical_table;" | tee evidence/backup_restore.txt
jq -n --arg backup "$BACKUP_FILE" '{backup:$backup, restore_ok:true, ts:now|todate}' > evidence/backup_restore.json
```

### 5.5 Redaction & Watermark CLI
**Path:** `tools/redactor/redactor.js`
```js
#!/usr/bin/env node
import fs from 'node:fs'
const input = process.argv[2];
const out = process.argv[3] || 'redacted_'+input;
let text = fs.readFileSync(input,'utf8');
text = text.replace(/\b(SECRET|TOKEN|KEY)\b[^\n]*/g,'[REDACTED]');
text = `<!-- watermark: export by Topicality — ${new Date().toISOString()} -->\n`+text;
fs.writeFileSync(out, text);
console.log(JSON.stringify({input, out}))
```

**CI step:**
```yaml
  redaction:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node tools/redactor/redactor.js exports/report.html exports/report.redacted.html
      - run: jq -n '{redactions: true, ts: now|todate}' > reports/redaction_report.json
      - uses: actions/upload-artifact@v4
        with: { name: redaction_report, path: reports/redaction_report.json }
```

### 5.6 Incident Response Tabletop — Decision Template
**Path:** `compliance/IR.Tabletop.md`
```md
# Incident Response Tabletop — v1
**Scenario:**
**Detection:**
**Containment:**
**Eradication/Recovery:**
**Communications:**
**Decision Log:** (IntelGraph IDs)
**Evidence:** (Maestro run ID)
**Lessons & Actions:**
```

### 5.7 Portal v1.1 — Compliance Indicators
**Path:** `tools/disclosure-portal/components/Status.tsx`
```tsx
export default function Status({criticals, attested, policySha}:{criticals:number; attested:boolean; policySha:string}){
  const color = !attested || criticals>0 ? 'red' : 'green'
  return <div className={`status ${color}`}>
    <strong>{attested? 'Attested' : 'Not attested'}</strong>
    <span> | Trivy criticals: {criticals}</span>
    <span> | Policy: {policySha.slice(0,12)}</span>
  </div>
}
```

---

## 6) Metrics & Alerts
- **Compliance pack coverage:** 100% tags include `compliance-pack.zip` (alert if < 100%).
- **Backup/restore verification:** at least 1 per repo/quarter (alert at 0).
- **Redaction pass:** 100% sensitive exports redacted/watermarked (alert if any fail).  
- **Policy drift:** portal shows red if bundle hash != registry current.

---

## 7) Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|---|---:|---:|---|
| Backup data sensitivity | Med | High | Use masked test datasets; DLP scan before upload |
| Residency misconfig | Low | High | Default deny, tests include negative cases |
| Redaction gaps | Med | Med | Expand patterns; add manual spot‑check in IR tabletop |

---

## 8) Alignment Notes
- Builds directly on Sprints 1–3: hardened release, policy registry, portal.  
- Preps Q4 close: design‑partner onboarding with Compliance Packs and portal evidence.  
- Two‑way door: all changes toggled via workflow inputs and policy version pinning.

---

## 9) Exit Checklist
- Compliance Pack generated and attached on tag release (all repos).  
- OPA v1.2 merged; bundle hash pinned in packs and portal.  
- Backup/restore harness executed; evidence recorded in Maestro & packs.  
- IR tabletop executed; Decision logged; lessons merged.  
- Portal v1.1 deployed; indicators green for latest tags.


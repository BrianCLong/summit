# GA Game-Day Drill & Incident Readiness Validation

**Date:** 2026-01-23
**Operator:** Jules (Release Captain)
**Version:** v1.0

---

## Phase 1 — GA Game-Day Scenarios

| Scenario | Trigger Condition | Expected Detection Signal | Expected Owner Response | Expected Escalation Path | Expected Resolution Outcome |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. CI / Merge Queue Failure** | Open PRs > 400 or Conflict Rate > 60% | Metric threshold in `scripts/update-merge-metrics.sh` (or manual check) | Run `scripts/triage-conflicting-prs.sh`, split lanes | Manually trigger `workflow_dispatch` for Express Lane | Queue count < 200, Conflict Rate < 40% |
| **2. Governance Drift Detection** | Branch protection settings on GitHub differ from `REQUIRED_CHECKS_POLICY.yml` | CI Failure in `Branch Protection Drift` job (`pnpm ci:branch-protection:check`) | Investigate diff, apply "Admin Handoff" procedure | Admin manually updates GitHub settings or Policy is updated | Policy matches Real-world settings (Green CI) |
| **3. Evidence Freshness Failure** | Weekly GA Ops Snapshot missing or >7 days old | **MISSING** (Expected: Alert from `fresh-evidence-rate` workflow or file check) | Run `scripts/release/generate_evidence_bundle.sh` | Release Captain manually triggers generation | Fresh Evidence Bundle in `docs/releases/GA_READINESS_WEEKLY/` |
| **4. Security Signal Escalation** | Critical CVE reported via `security@intelgraph.io` | Email in Inbox (Manual) | Acknowledge within 24h, triage severity | Patch within 24h (Critical SLA) per `SECURITY.md` | Hotfix Release (vX.X.X+1) deployed |
| **5. Human Error** | Release Captain creates tag without running `ga:verify` | **NONE** (Process violation). Potential catch at `gh release create --verify-tag` | Rollback Plan (Delete Release/Tag) or Hotfix | Release Captain invokes "Emergency Break-Glass" | Clean Release state restored |

---

## Phase 2 — Game-Day Dry-Run Log

| Scenario | Status | Notes |
| :--- | :--- | :--- |
| **1. CI / Merge Queue** | **PASS** | `docs/merge-train-runbook.md` is comprehensive. Metrics and remediation scripts (`triage-conflicting-prs.sh`) are defined. **Note:** Dashboard link is marked "TODO", creating a minor visibility gap. |
| **2. Governance Drift** | **PARTIAL** | Detection is solid via `branch-protection-drift` gate. Remediation is vague: `docs/governance/GATES/branch-protection-drift.md` says "Apply required status checks" but lacks specific `gh` commands or Terraform steps. |
| **3. Evidence Freshness** | **FAIL** | **Critical Gap:** The directory `docs/releases/GA_READINESS_WEEKLY/` referenced in procedure does not exist. No automated alert for "stale evidence" was found in `.github/workflows` (only `fresh-evidence-rate.json` metric definition). |
| **4. Security Escalation** | **PARTIAL** | Policy is clear (24h SLA). However, detection relies entirely on checking an email inbox (`security@`). No PagerDuty/OpsGenie integration is documented for "Critical" alerts. |
| **5. Human Error** | **PASS** | `docs/releases/ga/GA_RELEASE_RUNBOOK.md` is excellent. It explicitly warns "DO NOT proceed" and includes verification steps. `gh release create --verify-tag` provides a technical safety net. |

---

## Phase 3 — Gap Classification

| Gap ID | Scenario | Classification | Owner | Description |
| :--- | :--- | :--- | :--- | :--- |
| **GAP-001** | CI / Merge Queue | `SIGNAL GAP` | DevEx | Merge Train Dashboard link is missing ("TODO"). Monitoring is manual via CLI. |
| **GAP-002** | Governance Drift | `DOC GAP` | Governance | `branch-protection-drift.md` lacks specific remediation commands for Admins. |
| **GAP-003** | Evidence Freshness | `SIGNAL GAP` | Release Captain | `docs/releases/GA_READINESS_WEEKLY/` does not exist. No automated "Stale Evidence" alert found. |
| **GAP-004** | Security Escalation | `PROCESS GAP` | AdminSec | Reliance on email for Critical alerts is slow. Missing real-time paging. |
| **GAP-005** | Human Error | `ACCEPTABLE RISK` | Release Captain | Reliance on human adherence to Runbook is standard for this maturity level. |

---

## Phase 4 — Readiness Verdict

**Verdict:** `INCIDENT-READY WITH KNOWN GAPS`

**Justification:**
The core mechanisms for Release (Runbook), Code Velocity (Merge Train), and Policy Enforcement (GA Risk Gate) are solid and documented. The system fails safely (blocking PRs). The identified gaps relate to *reactive speed* (Security email) and *passive assurance* (Evidence freshness), which can be managed manually for the immediate GA launch.

**Accepted Risks:**
- **Manual Evidence Generation:** We accept that Evidence must be generated manually by the Release Captain until `GAP-003` is fixed.
- **Email-based Security Alerts:** We accept the latency of email monitoring for this GA phase, mitigating by assigning a dedicated "Inbox Watcher" rotation.

**Re-Engagement Trigger:**
Jules will re-engage if:
1. `ga-risk-gate` is bypassed more than once in 24h.
2. Any "Critical" Security Issue breaches the 24h SLA.

---

## Phase 5 — Final Jules Posture Declaration

### 1. Jules Role Declaration

**Monitors:**
- `main` branch stability (CI Status).
- `ga-risk-gate` workflow executions.
- `docs/releases/ga/GA_RELEASE_NOTES.md` integrity.

**Ignores:**
- `feature/*` branches (unless they block the Merge Train).
- Minor documentation formatting issues.

**Intervenes:**
- **IMMEDIATELY** if `docs/policies/trust-policy.yaml` is modified (Drift).
- **IMMEDIATELY** if a PR is labeled `release-blocker`.

### 2. Next Mandatory Review
**Date:** 2026-02-01 (Post-GA Stabilization Review)

### 3. Optional Follow-Up
**Action:** Generate `docs/releases/GA_READINESS_WEEKLY/` placeholder to close `GAP-003` if not addressed by Owner within 3 days.

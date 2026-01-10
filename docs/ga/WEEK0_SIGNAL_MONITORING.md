# Week-0 Signal Monitoring Plan

**Objective:** Detect early signs of regression, drift, or confusion in the first 7 days post-GA.

**Monitoring Window:** Day 0 (Launch) to Day 7 (Stabilization Review).

## 1. System & Engineering Health

| Signal | Detection Method | Owner | Threshold Triggering Action |
| :--- | :--- | :--- | :--- |
| **CI Flake Rate** | `scripts/ci/measure_flake_rate.ts` (or GitHub Actions Metrics) | Release Captain | > 5% failure on `main` (requires immediate freeze) |
| **Build Duration Drift** | CI Duration Monitoring | DevOps Lead | > 20% increase vs. GA baseline |
| **Security Posture** | `trivy` / `snyk` daily scan results | Security Lead | **ANY** new High/Critical vulnerability (P0 Hotfix) |
| **Dependency Drift** | `pnpm audit` | Release Captain | Any new unpinned dependency introduced |

## 2. Operational Stability

| Signal | Detection Method | Owner | Threshold Triggering Action |
| :--- | :--- | :--- | :--- |
| **SLO Breaches** | Prometheus Alerts (`summit_slo_breach`) | SRE On-Call | Any P95 latency > 1.5s or Error Rate > 0.1% for > 5m |
| **Runbook Failure** | Execution of `docs/ga/DEPLOYMENT.md` by non-author | Ops Lead | Step fails or requires unwritten knowledge |
| **Artifact Integrity** | Verification of SBOM/Signatures on release | Release Captain | Signature verification failure (STOP THE LINE) |

## 3. User Experience & Documentation

| Signal | Detection Method | Owner | Threshold Triggering Action |
| :--- | :--- | :--- | :--- |
| **Doc Confusion** | Support tickets / Slack Q&A analysis | Doc Owner | > 3 questions on the same topic (Trigger: Doc Hotfix) |
| **Demo Reproducibility** | "Golden Path" manual walkthrough | QA Lead | Failure to complete demo flow exactly as documented |
| **Login Friction** | Auth logs / Support tickets | Identity Lead | > 5% failed login attempts (potential config issue) |

## 4. Stabilization Discipline

| Signal | Detection Method | Owner | Threshold Triggering Action |
| :--- | :--- | :--- | :--- |
| **Post-GA Tasks** | `docs/ga/MVP4-GA-MASTER-CHECKLIST.md` "Post-GA" section | Release Captain | Task overdue by > 24h |
| **Ad-Hoc Changes** | Git log review | Release Captain | Any commit not linked to a P0/P1 Hotfix Issue |

## Daily Protocol

1.  **09:00 AM UTC**: Automated Signal Check (CI, Security).
2.  **10:00 AM UTC**: Triage Sync (Review Feedback/Incidents).
3.  **04:00 PM UTC**: EOD Status Update to Exec Stakeholders.

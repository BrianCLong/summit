# October Master Project (Done-by-Halloween)

**Program Start:** 2025-10-01 (America/Denver)  
**Earliest Completion (all gates passed):** **2025-10-30** (1-day buffer to Halloween)  
**Release Tag:** `2025.10.HALLOWEEN`

## Hard Gates
- OPA release-gate required on default branch (fail-closed)
- SBOM + provenance attached to Release; hashes in notes
- SLO dashboards (JSON + UIDs) committed; alerts wired
- k6 synthetics thresholds enforced (PR + nightly)
- WebAuthn step-up + DLP policies on risky routes; audit evidence emitted
- Golden-path E2E CI job passes with proof artifacts
- 0 critical vulns (SARIF published; waivers tracked)
- Air-gap v1 dry-run transcript + checksums in repo
- IGAC sign-off + policy SHAs pinned to tag
- Pilot SOW signed; features → SOW mapping committed

## Critical Path (dates are targets)
- 10/01–10/02: OPA gate; dashboards JSON/UIDs
- 10/01–10/03: SBOM/provenance; synthetics skeleton
- 10/06–10/09: Step-up/DLP
- 10/08–10/10: Golden-path E2E CI
- 10/13–10/17: Docs pack; Analyst Assist v0.2; alerts/exemplars
- 10/20–10/23: Security scans; Air-gap v1
- 10/24: IGAC sign-off
- 10/27–10/29: Delta/polish; Pilot SOW signed
- 10/30: Tag + Release Notes (complete)

## Risk Controls
- Start OPA gate in report-only, flip to enforce by 10/02
- Cache step-up auth per session to reduce friction
- Seed stable test data for synthetics; retry budget with cap

---

This file is paired with `/mnt/data/october_master_issues.csv` (ready-to-import issue list).

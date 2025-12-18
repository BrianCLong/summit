# Sprint 13 — Critical Security & CI Blockers (Dec 1–7)

## Objectives
- Eliminate all high/critical vulnerabilities and restore 100% green CI.
- Keep air-gapped deploy path viable for staging validation.
- Block merge on PR #12565 until security and CI gates are green.
- Prioritize P1 security items (#68, #12236) ahead of feature delivery.

## P0 Day-1 Actions
- Merge pipeline fix only after CI is stable: `gh pr merge 12565 --squash --delete-branch`.
- Assign remediation owners:
  - `gh issue assign 68 @BrianCLong` (Docker audit/non-root base images).
  - `gh issue assign 12236 @BrianCLong` (OWASP ZAP remediation).
- Immediate vulnerability sweeps:
  - Run `trivy fs .` and remediate all high/critical findings.
  - Address top 5 OWASP ZAP issues (likely XSS/CSRF) before unfreezing deployments.

## P1 Security Hardening (Days 2–3)
- Enforce non-root containers and minimal images; update compose health checks to run as `USER node`.
- Persisted GraphQL queries: reject unknown queries in production (#256).
- SBOM + Grype gate: fail PRs on high+ vulnerabilities (#1234/122).
- OPA ABAC in gateway: ensure cross-tenant requests return 403 (#237/1225).
- Track and audit 100% policy coverage and security-relevant events.

## P1 Platform Essentials (Days 4–5)
- Validate golden-path flow locally: `make bootstrap && make up && make smoke` (under 5 minutes).
- Target status by end of Day 5:
  - Issue #10149 Regression matrix ≥80% coverage.
  - Issue #10148 SLSA attestation produced.
  - Issue #10141 Documentation overhaul published.
  - Issue #10140 AI extraction v2 shipped.

## Validation & Demo (Day 6)
- Air-gapped rehearsal for #10134: `docker save $(docker images summit-*) | gzip > summit-airgap.tar.gz`.
- Verify restore on isolated host and rerun `make smoke` on staging.
- Demo flow: Investigation → Copilot → Results within 5 minutes.
- Success metrics: ER Precision@10 ≥90%; RAG accuracy ≥90% with citations.

## Risks & Mitigations
- High issue volume (10k+) and 430 open PRs: aggressively triage, label, and close stale/draft items.
- Assign Copilot support to issues #68 and #12236 for faster remediation.
- Maintain daily 9 AM MST sync to unblock cross-team dependencies quickly.

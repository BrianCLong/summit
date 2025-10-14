# Summit Monorepo Fast Read (October 2025)

## Overview
- **Repository scope:** Unified monorepo combining application services (`api/`, `client/`, `dashboard/`), data/ETL tooling (`airflow/dags/`, `etl/openlineage/`), infrastructure-as-code (`charts/`, `deploy/`, `docker/`, `alertmanager/`), and security/operations content (`RUNBOOKS/`, `SECURITY/`, `.zap/`).
- **Activity snapshot:** Recent archival and bug bash artifacts (e.g., `archive_20250926`, `bug-bash-results/20250922`) indicate ongoing large-scale changes alongside legacy snapshots.
- **Backlog signal:** Public issue/PR queues remain large (≈300+ issues, ≈400+ open PRs), pointing to potential review and maintenance load.

## Risk Assessment
- **Overall risk score:** 62 (medium confidence).
- **Key findings:**
  1. **Monorepo blast radius (mono-01):** Shared CI contexts possess write access across apps, data pipelines, and infra, increasing impact of compromise.
  2. **Oversubscribed backlog (backlog-02):** High counts of open issues/PRs may delay critical fixes or allow stale changes to merge without fresh validation.
  3. **Ops/Sec automation posture (opssec-03):** Presence of security tooling directories is promising, but effectiveness depends on enforced CI gates.
  4. **Data handling concerns (data-04):** DAGs and lineage tooling in-repo raise sensitivity around credential hygiene and provenance controls.
  5. **Change cadence risk (cadence-05):** Frequent bug-bash and archival cycles necessitate guarded deployment windows to avoid incidents.

## Recommended Next Steps
1. **Enforce pre-merge security gates:** Require provenance attestations, SBOM generation with blocking severity thresholds, secret scanning, policy-as-code checks, and CODEOWNER approvals before merge.
2. **Harden CI execution:** Adopt OIDC-backed workflows with least-privilege permissions, artifact signing, and SBOM publication per build.
3. **Scope CI by path:** Use filters (e.g., `dorny/paths-filter`) so jobs run only for relevant sub-systems, limiting credential exposure.
4. **Strengthen ownership and branch protection:** Maintain CODEOWNERS coverage with protected branches demanding step-up review for sensitive areas.
5. **Gate security scanners:** Wire ZAP and SAST checks to block on high-risk findings, ensuring remediation precedes merge.
6. **Improve secrets hygiene for DAGs/apps:** Migrate embedded credentials to managed secret stores, rotate long-lived keys, and leverage short-lived tokens.
7. **Introduce release freeze windows:** Schedule guardrails around high-activity events to prevent risky changes during sensitive periods.

## Verification Targets
- CI dashboards should reflect enforced status checks: provenance verification, SBOM scans (≤ medium findings), zero new secrets, OPA policy allow, ZAP high-risk=0, full test suite green, and CODEOWNER reviews recorded.
- Artifact provenance dashboards should show signed releases with no unsigned drift.
- Data platform observability must confirm no DAGs operate with static credentials or unmanaged secrets.

## Stakeholders to Engage
- DevSecOps on-call
- Platform engineering leadership
- Data engineering owners
- Application backend/frontend leads
- Product operations coordination team

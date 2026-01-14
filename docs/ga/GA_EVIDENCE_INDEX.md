# MVP-4 GA Evidence Index (Authoritative)

## Summary: How to Read This Evidence

This index maps each GA claim to concrete repository evidence. If evidence is missing, ambiguous, or divergent, the claim is **Deferred pending governance reconciliation** and treated as a **Governed Exception**. Verification commands are reproduced from the authoritative GA Definition.

## Evidence Index

| Claim / Capability                  | Evidence Type | File path or artifact                                                                                                  | How to reproduce / verify                           | Notes / Constraints                                                 |
| ----------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------- |
| GA definition and scope are frozen  | Doc           | `docs/ga/GA_DEFINITION.md`                                                                                             | Review the GA definition and required commands      | Authority file; defines GA requirements and evidence commands.      |
| Summit readiness assertion exists   | Doc           | `docs/SUMMIT_READINESS_ASSERTION.md`                                                                                   | Review certified capabilities and deferrals         | Authority file; required to be referenced for readiness.            |
| Release readiness assessment exists | Doc           | `docs/ga/RELEASE-READINESS-REPORT.md`                                                                                  | Review readiness verdict and caveats                | Declares READY with caveats; requires reconciliation.               |
| GA readiness report (legacy)        | Doc           | `GA_READINESS_REPORT.md`                                                                                               | Review status and checklist                         | Status: NOT READY; includes simulated CI and pending steps.         |
| GA tracking report (legacy)         | Doc           | `GA_TRACKING.md`                                                                                                       | Review blocker list and status                      | Status: RED; lists blockers and missing GA docs.                    |
| CI core workflow gate definitions   | CI config     | `.github/workflows/ci.yml`                                                                                             | Review workflow steps for lint/test/build           | Workflow defines core gates; execution evidence depends on CI logs. |
| GA gate workflow definitions        | CI config     | `.github/workflows/mvp4-gate.yml`                                                                                      | Review governance and policy checks                 | Defines OPA checks, lint, typecheck, smoke.                         |
| Security scanning workflow          | CI config     | `.github/workflows/ci-security.yml`                                                                                    | Review Gitleaks/SCA steps                           | Security scans are configured; audit step may be commented.         |
| Release pipeline with SBOM/SLSA     | CI config     | `.github/workflows/release-ga.yml`                                                                                     | Review release job and reusable SLSA workflow usage | Evidence of configured supply-chain provenance.                     |
| SLSA build reusable workflow        | CI config     | `.github/workflows/_reusable-slsa-build.yml`                                                                           | Review sbom + provenance steps                      | Shows SLSA/SBOM generation pipeline.                                |
| SBOM baseline artifact              | Artifact      | `sbom-mc-v0.4.5.json`                                                                                                  | Review SBOM contents                                | Evidence artifact; may be baseline not GA-version specific.         |
| Governance policy baseline          | Doc/Policy    | `docs/ga/GATE_POLICY.md`, `policies/`                                                                                  | `opa check policies/` and `opa test policies/ -v`   | Policy evidence per GA Definition.                                  |
| GA documentation bundle             | Docs          | `docs/ga/DEPLOYMENT.md`, `docs/ga/ROLLBACK.md`, `docs/ga/OBSERVABILITY.md`, `docs/ga/CANARY.md`, `docs/ga/RUNBOOKS.md` | Manual review or follow runbook steps               | Required GA docs are present as per GA Definition.                  |
| Test strategy definition            | Doc           | `docs/ga/TESTING-STRATEGY.md`                                                                                          | Review test tiers and required commands             | Defines verification tiers and expectations.                        |
| Evidence schema for bundles         | Doc           | `docs/ga/evidence-bundle-schema.md`                                                                                    | Review bundle schema                                | Source of truth for evidence bundle structure.                      |
| Governance constitution             | Doc           | `docs/governance/CONSTITUTION.md`                                                                                      | Review governance law and standards                 | Authority file per repo governance.                                 |
| Agent contract enforcement          | Policy/Doc    | `agent-contract.json`                                                                                                  | Validate against schema                             | Required for autonomy tier enforcement.                             |
| Branch protection policy            | Doc           | `docs/ga/GA_DEFINITION.md` (Branch Protection section)                                                                 | Review required checks list                         | Policy reference; actual enforcement via infra-as-code.             |
| Smoke test script presence          | Script        | `scripts/smoke-test.js`                                                                                                | Run `node scripts/smoke-test.js` or `make smoke`    | Execution evidence depends on environment.                          |
| Evidence bundle manifest            | Artifact      | `EVIDENCE_BUNDLE.manifest.json`                                                                                        | Inspect bundle manifest                             | Indicates existing evidence bundle inventory.                       |

## Claim ↔ Evidence Traceability Check

| Claim                              | Evidence exists | Evidence current | Reproducible              | Status                            |
| ---------------------------------- | --------------- | ---------------- | ------------------------- | --------------------------------- |
| GA scope definition                | Yes             | Yes              | Yes                       | **Validated**                     |
| CI gates configured                | Yes             | Yes              | Yes                       | **Validated**                     |
| Security scans configured          | Yes             | Yes              | Yes                       | **Validated**                     |
| Supply-chain provenance configured | Yes             | Yes              | Yes                       | **Validated**                     |
| GA readiness asserted              | Yes             | **Divergent**    | Yes                       | **Deferred (Governed Exception)** |
| Test execution stability           | Yes             | Yes              | **Environment-dependent** | **Deferred (Governed Exception)** |
| DR restore verification            | **Deferred**    | Deferred         | Deferred                  | **Deferred (Governed Exception)** |

## Publication Readiness Pass

- The evidence index is aligned to the authoritative GA definition and readiness assertion.
- Divergent readiness statements are explicitly called out and treated as **Governed Exceptions**.
- No claims exceed available repository evidence.

## Final Evidence Status

**Conditionally evidence-backed (Deferred pending governance reconciliation).**

**Gaps requiring resolution (file paths):**

- `GA_READINESS_REPORT.md` (NOT READY status with pending items)
- `GA_TRACKING.md` (RED status and blocker list)

# Operational Readiness Index

This directory contains the authoritative "Single Source of Truth" for Summit execution readiness. It maps risks, blockers, and parity checks to concrete code owners and verification commands.

## Artifacts

| Artifact | Description |
| :--- | :--- |
| [P0/P1 Blockers](./P0P1_BLOCKERS.md) | **The specific, verified list of what is currently broken.** enumerates all P0 (merge-blocking) and P1 (stability) risks. |
| [CI Parity Runbook](./CI_PARITY_RUNBOOK.md) | **How to run CI locally.** Detailed steps to reproduce CI behavior on your machine to avoid "it works on my machine" issues. |
| [Readiness Report](./READINESS_REPORT.md) | **Generated Report.** The output of the `pnpm ops:readiness` command, detailing the current health of the repository. |

## Governance

| Artifact | Description |
| :--- | :--- |
| [Release Gates](../governance/RELEASE_GATES.md) | **The Rules.** strict criteria for merging to main, cutting a release candidate, and GA. |

## Tools

### Readiness Check
We have added a script to verify the operational readiness of the repository.

**Command:**
```bash
pnpm ops:readiness
```

**Generate Report:**
```bash
pnpm ops:readiness:report
```

**What it does:**
1.  Enumerates all packages in the workspace.
2.  Verifies the existence of required scripts (`lint`, `test`, `build`).
3.  Checks for "mixed test runners" (e.g., Jest + Vitest in the same package) to prevent configuration drift.
4.  Generates a markdown report.

## CI Wiring
To enforce these checks in CI, add the following step to your workflow (e.g., `.github/workflows/ci.yml`):

```yaml
- name: Operational Readiness Check
  run: pnpm ops:readiness
```

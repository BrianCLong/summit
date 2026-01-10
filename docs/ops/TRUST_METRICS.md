# Trust Metrics

This document defines the **measurable signals** used to determine operational trust. These are not vanity metrics; they are the "pulse" of the engineering system.

## The 5 Core Metrics

| Metric | Why it matters | How to Compute (Exact Command) | Target | Owner |
| :--- | :--- | :--- | :--- | :--- |
| **1. CI Stability** | If CI is flaky, we cannot trust releases. | `gh run list --workflow ci.yml --limit 20 --json conclusion \| jq ...` (See `scripts/ops/generate-trust-snapshot.sh`) | > 95% Success | Eng Lead |
| **2. Security Hygiene** | Vulnerabilities accumulate if ignored. | `pnpm audit --audit-level=high --json \| jq .metadata.vulnerabilities.high` | 0 High | Sec Lead |
| **3. Governance Integrity** | Prevents unauthorized changes to rules. | `scripts/check-governance.cjs` | Exit Code 0 | Sec Lead |
| **4. Evidence Freshness** | Prove we are actually running our ops. | `find docs/ops/EVIDENCE_INDEX.json -mtime -7` | Exists | Ops Lead |
| **5. Repo Hygiene** | Untracked files hide bad state. | `git status --porcelain \| wc -l` | 0 | All |

## Measurement

These metrics are computed automatically by `scripts/ops/generate-trust-snapshot.sh`.

## Thresholds & Actions

*   **Green**: All targets met. Continue normal delivery.
*   **Yellow**: One non-critical miss (e.g., CI at 90%). Investigate in next sprint.
*   **Red**: Any Security miss, Governance failure, or Repo Hygiene issue > 0. **Stop the Line.** No new features until resolved.

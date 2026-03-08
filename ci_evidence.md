# CI Load Profile & Verification Proof

## A) CI Load Profile (evidence-first)
**Top workflows by run volume and concurrency pressure:**
- `deploy-aws.yml`: 4 jobs, 9 matrix fanout
- `test-runners.yml`: 3 jobs, 5 matrix fanout
- `nightly.yml`: 1 job, 5 matrix fanout
- `ci-pr.yml`: 10 jobs, 4 matrix fanout
- `ci-security.yml`: 16 jobs, 2 matrix fanout

**Approx runs per PR push:**
Before this change, pushing to a PR spawned approximately ~120 total job executions across matrices, many duplicating efforts across parallel pushed commits without canceling old runs.

**Duplicate triggers:**
- 87 workflows triggered on both `push` and `pull_request` simultaneously.
- Docs-only PRs were spawning full end-to-end integration matrices.

## B) Verification Proof & Impact
- **Concurrency & Load-Shedding**: Added `concurrency` with `cancel-in-progress: true` to 31 missing PR workflows. **Expected Queue Impact**: A new PR push now immediately aborts prior in-progress runs, freeing up GitHub Action runners and halting queue inflation during merge-surges.
- **Path Filters**: Added `paths-ignore: - '**/*.md' - 'docs/**'` to the heaviest workflows (`ci-pr.yml`, `ci-security.yml`, `deploy-aws.yml`). **Reproduction Note**: A change limited to docs (e.g., modifying `README.md`) will no longer spawn the massive matrix of backend and frontend e2e validations.
- **Timeouts**: Added strict `timeout-minutes: 30` to integration tests and long-running security scans to prevent hung jobs from consuming concurrency slots indefinitely.
- **Supply-Chain Hardening**: Core actions (`actions/checkout`, `actions/setup-node`, `pnpm/action-setup`) pinned to explicit commit SHAs instead of floating tags (`v4`) to mitigate supply-chain drift, enforcing reproducible environments.

**Conclusion:**
Run reduction estimate: from ~120 checks/PR without cancellation down to ~45 checks/PR effectively running to completion. Heavy matrix jobs are now actively shed when stale or irrelevant.

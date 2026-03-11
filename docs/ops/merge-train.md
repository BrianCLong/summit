# Merge Train Standard Operating Procedure (SOP)

## Purpose

To safely and efficiently merge high-priority changes into the `main` branch, ensuring stability and preventing regressions. The merge train automates the process of validating pull requests against the latest `main` branch before merging.

## Prerequisites

- GitHub CLI (`gh`) installed and authenticated.
- `jq` installed.
- Write access to the repository.

## Workflow

1.  **Queue eligibility**: Ensure PRs are triaged into queue labels (`queue:merge-now`, `queue:needs-rebase`, `queue:conflict`, `queue:blocked`, `queue:obsolete`).
2.  **Validation**: The system will automatically check:
    - Merge conflicts.
    - CI Status (Test, Lint, Build).
    - Approvals.
3.  **Merge**: If successful, the PR is merged. If failed, it is removed from the queue and the author is notified.

## Operation

### Running the Merge Train Locally (Simulation)

You can check the status of the merge train and manually kick the process if needed using the provided scripts.

```bash
# Kick merge train orchestration with defaults
./scripts/merge-train.sh

# Increase immediate labeling batch and simulate actions
./scripts/merge-train.sh --batch-size 40 --target-depth 30 --dry-run
```

### Preflight Checks

Before adding a PR to the queue, developers must run the local preflight check.

```bash
make preflight
```

This runs:

- Linting
- Unit Tests
- Dependency Checks
- Port availability checks

## CI Integration

The `Merge train labeler` and `Merge Queue Feeder` workflows handle queue labeling and queue feeding in GitHub Actions.

## Troubleshooting

- **Train Stuck**: Run `./scripts/merge-train.sh --dry-run` to diagnose and verify branch health before dispatching workflows.
- **PR Failed**: Check the PR comments for failure reasons. Fix and re-queue.

## Escalation

For P0 issues blocking the release, contact the Release Captain.

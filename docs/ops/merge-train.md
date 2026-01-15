# Merge Train Standard Operating Procedure (SOP)

## Purpose

To safely and efficiently merge high-priority changes into the `main` branch, ensuring stability and preventing regressions. The merge train automates the process of validating pull requests against the latest `main` branch before merging.

## Prerequisites

- GitHub CLI (`gh`) installed and authenticated.
- `jq` installed.
- Write access to the repository.

## Workflow

1.  **Queue a PR**: Add the `merge-queue` label to your Pull Request.
2.  **Validation**: The system will automatically check:
    - Merge conflicts.
    - CI Status (Test, Lint, Build).
    - Approvals.
3.  **Merge**: If successful, the PR is merged. If failed, it is removed from the queue and the author is notified.

## Operation

### Running the Merge Train Locally (Simulation)

You can check the status of the merge train and manually kick the process if needed using the provided scripts.

```bash
# Check status and process next item
./scripts/merge-train.sh
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

The `merge.queue.kicker.yml` workflow handles the actual processing in GitHub Actions.

## Troubleshooting

- **Train Stuck**: Run `./scripts/merge-train.sh` to diagnose. Check if `main` is red.
- **PR Failed**: Check the PR comments for failure reasons. Fix and re-queue.

## Escalation

For P0 issues blocking the release, contact the Release Captain.

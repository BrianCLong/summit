# Merge Orchestrator Bootstrap

## Current State
- **Backlog:** ~900 Open PRs.
- **Infrastructure:** CI stabilized, Merge Queue enforced.

## First-Wave Orchestration
The repository now possesses two core workflows to automate backlog collapse:
1. **`pr-planner.yml`**: Runs every 10 minutes to classify PRs into `queue-merge-now`, `queue-needs-rebase`, `queue-conflict`, or `queue-obsolete`.
2. **`merge-train.yml`**: Currently in **Dry-Run** mode. It lists the top 10 PRs ready for batch integration.

## Roadmap to 10K PRs/Day
To reach full autonomous velocity, we will progressively enable:
- **Phase 2:** Automated AI-Rebasing for `queue-needs-rebase`.
- **Phase 3:** Semantic Conflict Resolution using GPT-4o/Claude-3.5.
- **Phase 4:** Live Mass Harvest Trains (Batch merging 50 PRs at a time).
- **Phase 5:** Autodidactic Learning (The repo teaches agents to avoid past failures).

## Operational Instructions
- Run `PR Planner` manually to force a fresh classification of the backlog.
- Inspect `queue-obsolete` PRs; these are safe to close as they are superseded by newer work.
- Monitor the `Merge Train` job summary to see the next speculative batch.

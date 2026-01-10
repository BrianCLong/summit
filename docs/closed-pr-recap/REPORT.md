# Closed PR Recap Report

## Executive Summary

- **Total Closed PRs:** 2000
- **Merged PRs:** 1442
- **Closed-Unmerged PRs:** 558
- **Salvage Patches Produced:** 544

### Merged PR Reachability

- **Present in main:** 42
- **Missing from main:** 1400
- **Merge Commit Not Found:** 0

## Top Areas of Change

| Directory Prefix             | Change Count |
| ---------------------------- | ------------ |
| ``                           | 636          |
| `tools/issue-sweeper/ledger` | 433          |
| `.github/workflows`          | 387          |
| `docs/roadmap`               | 231          |
| `server`                     | 182          |
| `.github/workflows/.archive` | 100          |
| `server/src/services`        | 91           |
| `docs`                       | 91           |
| `scripts`                    | 87           |
| `server/src`                 | 86           |

## Notable High-Impact PRs (by diff size)

| PR                                                        | Title                                                                 | Additions | Deletions | Changed Files |
| --------------------------------------------------------- | --------------------------------------------------------------------- | --------- | --------- | ------------- |
| [#14434](https://github.com/BrianCLong/summit/pull/14434) | Sprint 12E: Analyst Experience Multiplier - Tri-Pane UX MVP           | 36452     | 787236    | 3344          |
| [#14394](https://github.com/BrianCLong/summit/pull/14394) | Lineage Visualization Primitives Contract                             | 530721    | 7223      | 264           |
| [#15464](https://github.com/BrianCLong/summit/pull/15464) | test: establish k6 performance baseline                               | 381       | 438800    | 11114         |
| [#15461](https://github.com/BrianCLong/summit/pull/15461) | docs: establish PR stack plan and ownership boundaries                | 206       | 438610    | 11114         |
| [#15466](https://github.com/BrianCLong/summit/pull/15466) | Harden useSafeQuery and Establish State Determinism Contract          | 107       | 438621    | 11114         |
| [#14425](https://github.com/BrianCLong/summit/pull/14425) | Advanced Graph Query Optimizer and DSL                                | 396       | 248639    | 223           |
| [#14552](https://github.com/BrianCLong/summit/pull/14552) | Finish security clean-up and hardening                                | 86707     | 126303    | 45            |
| [#15143](https://github.com/BrianCLong/summit/pull/15143) | Implement Debt Retirement Engine                                      | 187607    | 0         | 13            |
| [#14216](https://github.com/BrianCLong/summit/pull/14216) | 🛡️ Sentinel: [HIGH] Fix missing GitHub webhook signature verification | 9894      | 160408    | 22            |
| [#14146](https://github.com/BrianCLong/summit/pull/14146) | Maestro Reliability and Provenance Improvements                       | 169882    | 0         | 537           |

## Risk Section

- **1400 merged PRs are missing from main.** These PRs were likely overwritten by force-pushes or history rewrites.
- **0 merge commits could not be found locally.** This may indicate an incomplete git history.

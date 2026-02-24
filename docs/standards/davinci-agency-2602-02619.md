# Standard: daVinci-Agency Long-Horizon Evaluation

**Source**: arXiv:2602.02619 — *“daVinci-Agency: Unlocking Long-Horizon Agency Data-Efficiently”*

## Overview
This standard defines the requirements for PR-chain grounded long-horizon evaluation in Summit. It ensures that agent trajectories are evaluated for decomposition, consistency, and refinement based on real-world software evolution patterns.

## Data Schema
PR-chain trajectories must conform to the `PRChainRecord` schema defined in `src/agents/longhorizon/schema/pr_chain.ts`.

### Key Metrics
- **Decomposition**: Ratio of successfully completed stages to total stages.
- **Consistency**: Adherence to the unified functional objective across all stages.
- **Refinement**: Success rate of bug-fix trajectories.

## Interoperability
- **Import**: JSONL PR-chain records.
- **Export**: Deterministic `report.json`, `metrics.json`, and `stamp.json` artifacts.

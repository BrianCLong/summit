# Summit Benchmark Platform

Welcome to the Summit Benchmark Platform (summit-bench). This sub-project provides a reproducible benchmark substrate for agentic intelligence.

## Overview

The Summit Benchmark Platform is designed to support single-agent and multi-agent evaluations, replay runs deterministically, and publish reproducible scorecards. It initially supports software engineering and IntelGraph/OSINT tasks, with a roadmap to evolve into long-horizon ecosystem benchmarks.

## Architecture

*   **Task Packs**: Versioned task specifications (e.g., bug fixing, entity resolution).
*   **Environments**: Pinned sandboxes with specific code, graph, tool, policy, and runtime states.
*   **Agent Adapters**: Universal interfaces for plugging in different agent architectures.
*   **Evaluators**: Scoring engines that assess outcome, efficiency, robustness, governance, and collaboration.
*   **Telemetry**: Structured trace logs and artifact capture for verifiable reproducibility.

## Getting Started

1.  **Validate Schemas:**
    Ensure all benchmark schemas are valid:
    \`\`\`bash
    pnpm --filter benchmark test -- --runInBand schema
    \`\`\`

2.  **Run a Task:**
    Execute a benchmark task with a specific agent:
    \`\`\`bash
    pnpm summit-bench run --task task-packs/summit-bench-v0.1/tasks/se.fix-regression.0001.json --agent baseline/scripted
    \`\`\`

3.  **Replay a Run:**
    Deterministically replay a previous benchmark run:
    \`\`\`bash
    pnpm summit-bench replay --run-id <id>
    \`\`\`

4.  **Score a Run:**
    Calculate the benchmark score for a run:
    \`\`\`bash
    pnpm summit-bench score --run-id <id>
    \`\`\`

## Contributing

Please follow the PR sequence outlined in the benchmark specification. Ensure that every change is accompanied by relevant unit tests, schema updates, and documentation. All benchmark tasks must be reproducible and all evaluator changes must be replayable.

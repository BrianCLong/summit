# Benchmark: Anthropic Cowork vs. Summit Maestro

**Date:** 2026-01-13
**Status:** DRAFT
**Author:** Jules (AI Agent)

## Executive Summary

This document compares **Anthropic's Cowork** (a desktop-integrated AI agent for human-in-the-loop tasks) with **Summit Maestro** (the backend orchestration engine for the IntelGraph platform). While Cowork targets "everyday productivity" with a natural language interface, Maestro is designed for "deterministic, high-assurance intelligence workflows."

There is a significant opportunity to adopt Cowork's UX patterns (task-centric visualization, artifact sidebars) to make Maestro's complex orchestrations more accessible to human operators.

## Feature Comparison Matrix

| Feature Category | Anthropic Cowork | Summit Maestro |
| :--- | :--- | :--- |
| **Primary Interface** | Natural Language Chat (macOS Desktop) | API / GraphQL / CLI (`summitctl`) |
| **Execution Model** | Sequential/Iterative (Human-in-the-loop) | DAG-based Pipelines (Autonomous/Scheduled) |
| **Scope** | Local Filesystem & Browser Connectors | Microservices, Graph DB, Kafka, External APIs |
| **State Management** | Ephemeral (Session-based) | Persistent (Postgres `runs`, Neo4j `Evidence`) |
| **Artifacts** | Files, Drafts, Browser Actions | Knowledge Graph Nodes, JSON Reports, Metrics |
| **Verification** | Human Review of Output | Cryptographic Verification (`evidence_ledger`), Policy-as-Code (OPA) |
| **Transparency** | "Steps will show as task unfolds" | Full Traceability (OpenTelemetry + Graph Lineage) |
| **Multi-Agent** | Implicit (Tool use) | Explicit (Agent Mesh / "Maestro" Meta-Orchestrator) |

## Key UX Patterns to Adopt

Cowork excels in **visualizing the "work in progress"**, a gap in the current Summit `frontend`.

1.  **Task Progress View**: Cowork shows a linear or nested list of steps ("Found 46 drafts", "Reading content"). Maestro has this data (Graph nodes) but displays it as a complex generic graph or a simple log list.
    *   *Recommendation:* Implement a "Mission Control" view in `frontend` that linearizes Maestro runs into a readable task list.

2.  **Artifact Sidebar**: Cowork creates a clear distinction between "Chat/Status" and "Outputs" (Artifacts).
    *   *Recommendation:* Add an "Evidence/Artifacts" sidebar to the `frontend` specifically for generated reports, images, or JSON bundles, separate from the raw log stream.

3.  **Context Management**: Cowork explicitly shows "Selected folders" and "Connectors".
    *   *Recommendation:* Visualize the "Input Context" (e.g., active Policy Pack, Data Sources) in the UI before a run starts.

## Conclusion

Cowork represents the "Frontend of Agency" while Maestro represents the "Backend of Agency." By porting Cowork's UX paradigms to Maestro's robust backend, we can create a powerful "Intelligence Operating System" that combines ease of use with mission-critical assurance.

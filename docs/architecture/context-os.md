# Summit Context OS — Unified Architecture

## Overview
Summit Context OS is the core architecture that integrates GraphRAG Context Packs, the Agent Context Protocol (ACP), agent evaluation, and CI governance into a single context operating system for AI agents.

## Unified Architecture Diagram

```
                         ┌──────────────────────────────────────┐
                         │              Developers              │
                         │  Tasks, PR goals, feature requests   │
                         └──────────────────────────────────────┘
                                           │
                                           ▼
                         ┌──────────────────────────────────────┐
                         │           Agent Runtime               │
                         │ Planner • Coder • Reviewer • Eval    │
                         └──────────────────────────────────────┘
                                           │
                                           │ ACP Request
                                           ▼
                ┌─────────────────────────────────────────────────────┐
                │              ACP Protocol Layer                      │
                │          Agent Context Protocol (ACP)                │
                │                                                     │
                │  POST /acp/context                                  │
                │  Schema validation                                  │
                │  Context token budgets                              │
                │  Security filtering                                 │
                └─────────────────────────────────────────────────────┘
                                           │
                                           ▼
                ┌─────────────────────────────────────────────────────┐
                │            GraphRAG Context Pack Engine             │
                │                                                     │
                │  Task → retrieval query                             │
                │                                                     │
                │  Retrieves:                                         │
                │   • relevant files                                  │
                │   • code symbols                                    │
                │   • tests                                           │
                │   • docs                                            │
                │                                                     │
                │  Produces:                                          │
                │   context_pack.json                                 │
                └─────────────────────────────────────────────────────┘
                                           │
                                           ▼
                ┌─────────────────────────────────────────────────────┐
                │           Repository Knowledge Graph                │
                │                                                     │
                │  Code AST graph                                     │
                │  Dependency graph                                   │
                │  Test graph                                         │
                │  Documentation graph                                │
                │                                                     │
                │  Indexed by GraphRAG                                │
                └─────────────────────────────────────────────────────┘
                                           │
                                           ▼
             ┌──────────────────────────────────────────────────────────┐
             │            Context Minimalism Policy Engine               │
             │                                                           │
             │  Removes redundant context                                │
             │  Enforces token budgets                                   │
             │  Filters inferable instructions                           │
             │  Sanitizes context for injection risks                    │
             │                                                           │
             │  Produces optimized context bundle                        │
             └──────────────────────────────────────────────────────────┘
                                           │
                                           ▼
                ┌─────────────────────────────────────────────────────┐
                │              Agent Execution Layer                   │
                │                                                     │
                │  Agents receive context bundle                      │
                │                                                     │
                │  Run tasks                                          │
                │  Modify code                                        │
                │  Execute tests                                      │
                │                                                     │
                └─────────────────────────────────────────────────────┘
                                           │
                                           ▼
              ┌─────────────────────────────────────────────────────────┐
              │               Agent Evaluation Harness                   │
              │                                                         │
              │  Metrics:                                               │
              │   • success rate                                        │
              │   • token usage                                         │
              │   • step count                                          │
              │   • file navigation efficiency                          │
              │                                                         │
              │  Outputs:                                               │
              │   evaluation_metrics.json                               │
              └─────────────────────────────────────────────────────────┘
                                           │
                                           ▼
              ┌─────────────────────────────────────────────────────────┐
              │                   CI Governance                          │
              │                                                         │
              │  Policy gates                                           │
              │   • context token budget                                │
              │   • agent step regression                               │
              │   • retrieval accuracy                                  │
              │                                                         │
              │  CI Workflows                                           │
              │   context-os.yml                                        │
              │                                                         │
              └─────────────────────────────────────────────────────────┘
                                           │
                                           ▼
              ┌─────────────────────────────────────────────────────────┐
              │              Monitoring + Drift Detection               │
              │                                                         │
              │  Scheduled checks                                       │
              │   • context growth                                      │
              │   • token cost drift                                    │
              │   • retrieval precision                                 │
              │                                                         │
              │  Outputs:                                               │
              │   context_os_trends.json                                │
              └─────────────────────────────────────────────────────────┘
```

## Layered Model

- **Layer 5 — CI Governance:** Enforces context budgets, prevents step regressions, and blocks bad PRs.
- **Layer 4 — Agent Evaluation:** Measures task success, token usage, step count, and navigation efficiency.
- **Layer 3 — ACP Protocol:** The interface standard (`POST /acp/context`) and protocol schema (`ACP/0.1`).
- **Layer 2 — GraphRAG Context Packs:** Dynamic retrieval of relevant task information (files, tests, symbols).
- **Layer 1 — Repository Knowledge Graph:** Code AST, dependencies, tests, and documentation indexed by GraphRAG.

**Cross-Cutting Layer:**
- **Context Minimalism Policy:** Acts across layers to remove bloat, apply token limits, and sanitize instructions.

## Context Pipeline

1. **Task Injection:** User or agent issues a task.
2. **Context Retrieval:** GraphRAG Context Pack Engine queries the repo graph to build a candidate context pack.
3. **Protocol Bundling:** The ACP layer wraps the context pack in an `ACPContext` payload.
4. **Policy Enforcement:** Context Minimalism Policy sanitizes, filters, and limits the context bundle.
5. **Agent Execution:** The Agent Runtime uses the minimal context to perform the work.
6. **Evaluation:** The Agent Evaluation Harness records metrics (`evaluation_metrics.json`).
7. **Governance:** CI workflows validate that new context models do not regress evaluation thresholds.
8. **Drift Monitoring:** Scheduled jobs track trends in context growth, cost, and retrieval accuracy.

## Roadmap Summary

1.  **Architecture Skeleton:** Establish `docs/architecture/context-os.md`.
2.  **Context OS Module Scaffold:** Create basic project structure in `summit/context-os/`.
3.  **Context Pack Schema:** Define `ContextPack` data structure.
4.  **Minimal Context Pack Generator:** Implement basic `buildContextPack` function.
5.  **Context Budget Policy:** Introduce token and file budget limits.
6.  **ACP Protocol Schema:** Define `ACPContext` format.
7.  **ACP Context Endpoint:** Build `POST /acp/context` handler.
8.  **Agent Evaluation Harness:** Create `evaluation-orchestrator.ts` to log metrics.
9.  **Context Governance CI:** Add `.github/workflows/context-os.yml` to block regressions.
10. **Drift Monitoring:** Script long-term observability for context OS metrics.

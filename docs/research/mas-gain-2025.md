# MAS-GAIN 2025 → Summit Implementation Brief

## Purpose

Translate MAS-GAIN 2025 themes into concrete, measurable improvements to Summit’s agent reliability, traceability, and graph-aware code generation, with a bias toward small, auditable PRs and reproducible evaluation harnesses.

## What to Steal for Summit (1–2 page brief)

- **Multi-agent orchestration** (Planner → Executor → Critic) becomes traceable pipelines with stagewise artifacts, structured handoffs, and replayable logs to stop silent cascades.
- **Governance-first AgentWare**: add policy gates, secret redaction, and human-approval triggers on sensitive actions to increase trust and transparency.
- **Repo-level graph retrieval (GRACG)**: build and refresh a dependency graph so generation tasks pull cross-file context, not just the current file.
- **Notebook → production repo (Codelevate)**: orchestrate specialized agents (Architect, Developer, Structure) around a shared dependency tree to convert notebooks into maintainable packages with tests.
- **Evaluation as a first-class artifact**: every feature ships with metrics for correctness, cost, latency, and harm/repair signals plus an integration test harness.
- **Resource optimization and routing**: surface cost/latency estimates per step and support role-aware routing to the right agent/tooling path.

## Mapping Table: MAS-GAIN Idea → Summit Implementation

| MAS-GAIN Idea                        | Summit Component                                                                    | MVP Behavior                                                                                            | Measurable Metric                                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Planner→Executor→Critic traceability | **Traceable Pipeline Contract (TPC)** in `docs/design/traceable-agent-pipelines.md` | Each agent step emits validated JSON artifacts and a handoff envelope; ledger records hashes and timing | Artifact validation pass rate; ledger completeness (% steps with envelope); repair_rate, harm_rate |
| Governance & ethics gates            | **Policy Gate** + redaction hooks (TPC governance section)                          | Require human approval for write/sensitive scopes; redact secrets/tokens in prompts and logs            | Count of gated actions; # of redaction events; zero leaked secrets in logs                         |
| GRACG repo graph retrieval           | **Graph Context Pack API** (`docs/design/graph-retrieval-for-codegen.md`)           | Refreshable graph of imports/symbol refs; task → ranked context pack with cross-file deps               | Context relevance score; cross-file correctness rate; % queries with graph fallback                |
| Codelevate notebook transformation   | **Notebook→Repo Agent Workflow** (`docs/design/notebook-to-repo-agent.md`)          | Roles collaborate over shared dependency tree artifact to emit package layout, modules, tests           | Notebook conversion success rate; semantic equivalence checks; diff coverage                       |
| Agent recommendation/routing         | **Run ledger + metrics hooks** (TPC)                                                | Log cost/latency estimates and role performance to inform routing                                       | Cost/latency per role; SLA hit rate; routing suggestion accuracy                                   |
| IDE/tool integration                 | **Context pack interface + envelopes**                                              | Deliver structured context + diffs to IDE/agents; surface validation hints                              | IDE hint adoption rate; validation warning resolution rate                                         |
| V&V of AI outputs                    | **Evaluation harness + blame/repair signals**                                       | Integration test seeds + ledger to attribute failures to origin step                                    | Error attribution success rate; test flakiness delta                                               |

## Backlog and PR Plan (execution-ready)

### Epics and Issues

**Epic 1: Traceable Agent Pipelines (TPC + ARL)**

1. **Issue: Define and validate TPC/ARL schemas**  
   Acceptance: JSON Schemas in `docs/design/traceable-agent-pipelines.md` codified under `schemas/agent/`; CI validation script passes.  
   Tests: `npm run lint` (schema lint) or `pnpm run lint` + `npm test -- agent-schema` when available.
2. **Issue: Implement ledger writer abstraction**  
   Acceptance: Single interface with console+file sinks; emits run_id/step_id/artifact_hash.  
   Tests: Unit test for hashing + append-only behavior.
3. **Issue: Instrument one existing workflow with envelopes**  
   Acceptance: Sample run produces ledger with handoff assumptions/constraints and minimal diffs.  
   Tests: Integration test that injects error and attributes origin step.

**Epic 2: Graph Retrieval for Codegen (GRACG-inspired)** 4. **Issue: Build repository graph refresher**  
 Acceptance: CLI/job builds graph of imports/symbol refs for repo; stored to cache.  
 Tests: Unit tests for parser; fixture repo snapshot check. 5. **Issue: Context pack retrieval API**  
 Acceptance: Given task + target files, returns ranked context pack with cross-file deps and fallback when missing edges.  
 Tests: Unit test for ranking; integration test returning at least one cross-file dependency. 6. **Issue: Evaluation harness for graph retrieval**  
 Acceptance: Metrics for context relevance and cross-file correctness; sample report generated.  
 Tests: Harness run produces JSON metrics artifact.

**Epic 3: Notebook→Repo Agent (Codelevate-inspired)** 7. **Issue: Define dependency tree artifact + roles**  
 Acceptance: Shared tree format published; role prompts/contracts documented.  
 Tests: Schema validation unit test. 8. **Issue: Safe notebook parsing and semantic preservation**  
 Acceptance: Parser that blocks unsafe execution; diff tracking for transformed cells.  
 Tests: Unit tests for sandbox guard and diff mapping. 9. **Issue: Repo emission with tests + entrypoint**  
 Acceptance: Generated package layout includes tests and runnable entrypoint; dry-run produces tree.  
 Tests: Integration test running `python -m <entrypoint>` on generated scaffold.

### Minimal PR Sequence (3–4 PRs)

- **PR1: Scaffolding + interfaces + schemas + docs**  
  Touchpoints: `docs/design/traceable-agent-pipelines.md`, `docs/design/graph-retrieval-for-codegen.md`, `docs/design/notebook-to-repo-agent.md`, `schemas/agent/{tpc,arl,context-pack,notebook-tree}.json` (new), `docs/research/mas-gain-2025.md`.  
  Tests: `npm run lint` (schema lint placeholder) or `pnpm run lint` once schemas wired.
- **PR2: Run ledger + structured handoff instrumentation**  
  Touchpoints: `packages/` or `server/src/agents/` workflow chosen; add ledger writer abstraction + TPC validation hook.  
  Tests: `npm test -- ledger` (new); sample integration run script.
- **PR3: Graph context pack API + tiny integration**  
  Touchpoints: `packages/graph-context/` (new) or `server/src/services/`; add graph builder + retrieval API + integration hook in agent path.  
  Tests: `npm test -- graph-context`; small end-to-end retrieval check.
- **PR4 (optional): Evaluation harness + metrics export**  
  Touchpoints: `packages/eval-harness/`, metrics wiring into ledger; docs update.  
  Tests: `npm test -- eval-harness`; generate JSON metrics artifact.

### Key Risks + Mitigations

- **Risk: Schema drift between docs and implementation** → Mitigate by codifying JSON Schemas and adding CI validation for artifacts.
- **Risk: Ledger storage overhead or sensitive data leakage** → Mitigate via hash-only storage for payloads, redaction rules, and configurable retention.
- **Risk: Graph builder performance on large repos** → Mitigate with incremental graph refresh and cached edges; fallback retrieval when graph incomplete.
- **Risk: Notebook execution safety** → Enforce sandbox/no-exec defaults; static analysis before running any cell; require human gate for risky operations.

Below is the Summit Subsumption Plan for the ITEM:

AgentVista: Evaluating Multimodal Agents in Ultra-Challenging Realistic Visual Scenarios
arXiv:2602.23166

All repo details referencing BrianCLong/summit are marked ASSUMPTION because live repo inspection is unavailable.

## 1.0 ITEM IDENTIFICATION
ITEM: AgentVista Benchmark
Type: Multimodal agent evaluation benchmark
Source: arXiv:2602.23166
Authors: Zhaochen Su et al., HKUST NLP Group
Release: Feb 2026

Core Contribution
A benchmark for multimodal agents performing long-horizon tool interactions grounded in visual scenarios requiring hybrid tool use.

Key aspects:
* 25 subdomains
* 7 scenario categories
* long-horizon workflows
* multimodal grounding
* hybrid tool execution

Example tools:
* web search
* image search
* page navigation
* code execution
* image processing

Best model performance reported:
Gemini-3-Pro w/ tools → 27.3% accuracy
This reveals a large capability gap in multimodal tool-using agents.

## 1.1 REPO REALITY CHECK
Target repository:
BrianCLong/summit
Verified: None (no live inspection available)

ASSUMED STRUCTURE
```
summit/
 ├ agents/
 ├ benchmarks/
 ├ pipelines/
 ├ evidence/
 ├ scripts/
 ├ docs/
 ├ policies/
 ├ tests/
 └ .github/workflows/
```
Must-Not-Touch (ASSUMPTION)
core/reasoning-engine/*
security/policy-engine/*
graph/*

Validation Checklist
Before implementation:
* Confirm benchmark directory naming
* Verify evidence schema
* Check CI check names
* Confirm artifact storage path
* Confirm GraphRAG ingestion path

Output:
`docs/repo_assumptions.md`

## 1.2 GROUND TRUTH CAPTURE
Extracted from the abstract provided.

* ITEM:CLAIM-01: AgentVista introduces a benchmark for multimodal agents requiring long-horizon tool interactions across modalities.
* ITEM:CLAIM-02: The benchmark spans 25 sub-domains across 7 categories.
* ITEM:CLAIM-03: Tasks require hybrid tool usage including web search, image search, page navigation, and code-based operations.
* ITEM:CLAIM-04: Tasks involve realistic visual scenarios grounded in visual evidence.
* ITEM:CLAIM-05: State-of-the-art models perform poorly; Gemini-3-Pro with tools achieves only 27.3% accuracy.
* ITEM:CLAIM-06: Hard tasks require more than 25 tool-calling turns.
* ITEM:CLAIM-07: Existing benchmarks mainly test single-turn visual reasoning or isolated tool skills.

## 1.3 CLAIM REGISTRY
| Summit Element | Source |
|---|---|
| AgentVista evaluation harness | CLAIM-01 |
| Long-horizon task runner | CLAIM-06 |
| Multimodal tool orchestration tests | CLAIM-03 |
| Scenario dataset loader | CLAIM-02 |
| Visual reasoning evaluation | CLAIM-04 |
| Benchmark scoring system | CLAIM-05 |
| Baseline comparisons | CLAIM-05 |

## 1.4 COMPETITIVE TEARDOWN
Benchmarks today:

| Benchmark | Limitation |
|---|---|
| MMBench | single-turn |
| VQA | no tools |
| WebArena | text only |
| GAIA | limited vision |

AgentVista advances:

| Capability | AgentVista |
|---|---|
| visual grounding | ✓ |
| tool orchestration | ✓ |
| long horizon | ✓ |
| multimodal search | ✓ |

Positioning for Summit
Safe claim today:
"Summit supports evaluation of multimodal tool-using agents using the AgentVista benchmark."

Future claim:
"Summit improves long-horizon multimodal task success beyond baseline agents."

No FUD.

## 1.5 MINIMAL WINNING SLICE (MWS)
Goal
Integrate AgentVista as a Summit benchmark pipeline.

MWS sentence
Summit can run AgentVista tasks end-to-end and produce deterministic evaluation reports.

Acceptance Tests
`pnpm summit benchmark:agentvista`

Outputs:
`artifacts/agentvista/report.json`
`artifacts/agentvista/metrics.json`
`artifacts/agentvista/stamp.json`

Artifacts
`report.json`
`metrics.json`
`evidence.json`
`tool_trace.json`

Roll-Forward Plan
MWS benchmark
multi-model comparisons
automated regression tracking

## 1.6 SCOPE GUARDRAILS
Hard limits:
≤ 7 PRs
feature flag default OFF
no architecture refactors
no model training
only evaluation harness

## 1.7 PR STACK
**PR1 — Benchmark Skeleton**
feat(benchmark): add agentvista benchmark scaffold
Files:
`benchmarks/agentvista/`
  `dataset_loader.ts`
  `task_runner.ts`
  `scoring.ts`

Patch:
```typescript
export interface AgentVistaTask {
  id: string
  category: string
  tools_required: string[]
  max_turns: number
}
```

**PR2 — Dataset Loader**
feat(agentvista): dataset ingestion pipeline
`pipelines/agentvista_ingest.ts`
Output: `data/agentvista/tasks.json`

**PR3 — Tool Interaction Runner**
feat(agentvista): long horizon tool execution harness
`agents/tool_runner.ts`
Supports: `web_search`, `image_search`, `page_navigation`, `python_exec`

**PR4 — Visual Scenario Processor**
feat(agentvista): multimodal visual grounding module
`agents/vision_context.ts`

**PR5 — Evaluation Engine**
feat(agentvista): scoring + metrics
`benchmarks/agentvista/evaluator.ts`
Metrics: `task_accuracy`, `tool_efficiency`, `turn_count`, `success_rate`

**PR6 — CI Gate**
ci(agentvista): add benchmark regression test
Workflow: `.github/workflows/agentvista.yml`
Gate: accuracy >= baseline

**PR7 — Drift Monitor**
feat(monitoring): agentvista benchmark drift detector
Scripts: `scripts/monitoring/agentvista-drift.ts`

## 1.8 PERFORMANCE & COST BUDGETS
| Metric | Target |
|---|---|
| avg turns | ≤25 |
| latency per task | ≤120s |
| memory | ≤4GB |
| benchmark cost | ≤$5/run |

CI enforcement: `scripts/perf/check_agentvista_budget.ts`

## 1.9 THREAT-INFORMED REQUIREMENTS
| Threat | Mitigation | Gate |
|---|---|---|
| malicious webpages | sandbox tool calls | policy tests |
| prompt injection | tool isolation | unit tests |
| code execution abuse | restricted runtime | container sandbox |

Abuse fixtures: `tests/security/agentvista_prompt_injection.json`

## 1.10 DATA CLASSIFICATION
File: `docs/security/data-handling/agentvista.md`
Rules: Never log API keys, browser cookies, user prompts
Retention: benchmark logs → 30 days, metrics → permanent

## 1.11 INTEROP & STANDARDS
File: `docs/standards/agentvista.md`

| Format | Support |
|---|---|
| JSON tasks | import |
| OpenAI tools API | export |
| LangChain tools | export |
| GraphRAG traces | export |

Non-Goals: training datasets, RL environments

## 1.12 OPERATIONAL READINESS
Runbook: `docs/ops/runbooks/agentvista.md`
Alerts: benchmark_failure_rate > 20%, tool_error_rate > 10%
SLO: benchmark completion reliability ≥ 99%

## 1.13 POST-MERGE MONITORING
Drift job: cron: weekly
Script: `scripts/monitoring/agentvista-drift.ts`
Detects: benchmark accuracy drift, tool failure changes, model regressions
Outputs: `artifacts/agentvista/trends.json`

## 1.14 DEFINITION OF DONE
| Category | Score |
|---|---|
| Determinism | 5 |
| Machine-verifiable | 5 |
| Mergeability | 5 |
| Security posture | 4 |
| Measured advantage | 4 |

Total: 23/25
PASS

## 1.15 FIVE-AGENT CONVERGENCE PROTOCOL
**1️⃣ Benchmark Architect**
Prompt: Design the AgentVista benchmark harness inside benchmarks/agentvista.

**2️⃣ Tool Interaction Engineer**
Prompt: Implement long-horizon tool orchestration with deterministic execution logs.

**3️⃣ Security Engineer**
Prompt: Ensure tool sandboxing and prompt injection defenses.

**4️⃣ Evaluation Scientist**
Prompt: Implement scoring metrics matching AgentVista methodology.

**5️⃣ CI & Observability Engineer**
Prompt: Implement CI gates, drift detection, and performance budgets.

Merge rule:
* master plan overrides local design
* agents propose diffs only

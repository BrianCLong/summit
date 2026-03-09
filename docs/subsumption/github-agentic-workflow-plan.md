# GitHub Agentic Workflow & Multi-Agent Orchestration Subsumption Plan

## 1.0 ITEM Overview
**ITEM type:** landscape analysis + repo context + orchestration opportunities
**Target repo:** BrianCLong/summit
**Objective:** make multi-agent orchestration a first-class graph primitive and enable GitHub-native mission execution via Actions / Agentic Workflows.

**Core idea:**
Summit defines missions and governance → GitHub Actions executes missions → results flow back into IntelGraph for provenance and audit.

This preserves Summit’s positioning as graph-centric OSINT orchestration, while using GitHub as a secure compute plane.

## 1.1 Ground Truth Capture
Extracted only from the ITEM text you supplied.

- **ITEM:CLAIM-01**: "GitHub shows an active CI workflow at .github/workflows/ci.yml for BrianCLong/summit."
- **ITEM:CLAIM-02**: "Epic: Collaborative Intelligence War Rooms (#141) in milestone MVP1-Collaboration."
- **ITEM:CLAIM-03**: "Required-Check Drift Sentinel and Runbook BrianCLong/summit#18891."
- **ITEM:CLAIM-04**: "CrewAI defines agents, tasks, crews, tools, and memory."
- **ITEM:CLAIM-05**: "Microsoft Agent Framework supports sequential, concurrent, group-chat, handoff orchestration."
- **ITEM:CLAIM-06**: "claude-flow uses swarm coordination with queen agents."
- **ITEM:CLAIM-07**: "GitHub Agentic Workflows run coding agents inside GitHub Actions with guardrails."
- **ITEM:CLAIM-08**: "Five orchestration patterns: sequential, map-reduce parallelism, consensus, layered orchestration, producer-reviewer loops."

## 1.2 Claim Registry
| Summit feature | Claim source |
|---|---|
| Mission graph primitives | ITEM:CLAIM-08 |
| GitHub runner integration | ITEM:CLAIM-07 |
| Agent role model | ITEM:CLAIM-04 |
| Multi-agent coordination | ITEM:CLAIM-05 |
| Swarm/consensus pattern | ITEM:CLAIM-06 |
| CI orchestration anchor | ITEM:CLAIM-01 |
| War Room collaborative UI | ITEM:CLAIM-02 |
| Governance sentinel | ITEM:CLAIM-03 |

*Anything else = Summit original design.*

## 1.3 Repo Reality Check
Based on the repo context file you uploaded.

**Verified (from ITEM file)**
- Node.js 18+
- TypeScript
- pnpm
- GitHub Actions
- Graph stack: Neo4j + vector search
- .github/workflows structure
- CI helper scripts in .github/scripts

**ASSUMPTIONS**
```text
packages/
  summit-core
  summit-agents
  summit-graph
  summit-cli
scripts/
docs/
```

**Must-Not-Touch Files**
- .github/workflows/codeql.yml
- .github/workflows/ci-security.yml

**Validation checklist**
Before PR1:
- `pnpm install`
- `pnpm build`
- `pnpm test`

Confirm:
- Neo4j integration module
- GraphRAG pipeline
- agent orchestration module

Output artifact: `docs/repo_assumptions.md`

## 1.4 Scope Guardrails
**Hard limits:**
- max 6 PRs
- no refactors unless required
- feature flag default OFF
- no database schema breakage
- CI execution must remain deterministic

## 1.5 Minimal Winning Slice (MWS)
**MWS sentence**
Summit can define a mission graph that executes agents in GitHub Actions and returns deterministic artifacts into the IntelGraph evidence store.

**Acceptance tests**
- mission compile works
- mission runs in CI
- agent outputs artifact
- artifact attached to graph node

**Artifacts**
- `report.json`
- `metrics.json`
- `stamp.json`

**Evidence IDs:** `EV-<mission>-<step>`

## 1.6 Summit Mission Graph Primitives
Introduce five orchestration motifs as first-class graph constructs.

**Sequential**
`A → B → C`
Example: collect intel → enrich → analyze

**Parallel (Map-Reduce)**
```text
  A
 ├── B
 ├── C
 └── D
    ↓
    E
```

**Consensus**
- 3 agents vote
- aggregate result

**Layered**
- collector agents
- analysis agents
- review agents

**Producer-Reviewer loop**
produce → critique → revise

## 1.7 GitHub Mission Runner
**Execution path:**
```text
Summit Mission
     ↓
compile to
     ↓
.github/workflows/mission-runner.yml
     ↓
GitHub Actions runner
     ↓
artifacts
     ↓
Summit ingest
```

**Mission definition:** `missions/osint_enrich.mission.ts`
**Compiled output:** `.github/workflows/generated/mission-osint_enrich.yml`

## 1.8 Governance Sentinel
Subsumes the drift sentinel concept.

**Feature:**
- branch protection monitor
- required check drift detection
- policy mismatch alert

**Outputs:** `reports/governance/drift-report.json`
**CI gate:** `ci-governance.yml`

## 1.9 War Rooms Integration
War Rooms (#141) become human-agent collaboration environments.

**Graph nodes:**
- WarRoom
- Agent
- Artifact
- Evidence

Agent traces attach to War Room.

## 1.10 Performance & Cost Budgets
**Targets:**
- mission compile < 1s
- mission run < 5m
- memory < 1GB
- artifact size < 50MB

**Profiling harness:** `scripts/benchmark/mission-bench.ts`
**Output:** `metrics.json`
**CI gate:** `latency-budget-check`

## 1.11 Security Posture
**Threat model:**
| threat | mitigation |
|---|---|
| malicious agent output | schema validation |
| token leakage | redact pipeline |
| supply chain | pinned actions |
| CI privilege escalation | minimal permissions |

**Runtime gate:** `agent-guardrails.yml`
**Test fixtures:** `tests/security/agent-abuse.spec.ts`

## 1.12 Data Classification
**File:** `docs/security/data-handling/agent-missions.md`

**Rules:**
Never log:
- API keys
- investigator identity
- raw classified intel
- private graph nodes

**Retention:**
- logs: 30d
- artifacts: 1y

## 1.13 Operational Readiness
**Runbook:** `docs/ops/runbooks/mission-runner.md`
**Alerts:**
- mission failure rate
- CI queue backlog
- artifact ingestion failure

**SLO assumption:** 99% mission success

## 1.14 Competitive Teardown
| system | weakness Summit exploits |
|---|---|
| CrewAI | YAML orchestration only |
| Microsoft Agent Framework | enterprise-heavy |
| claude-flow | model-locked |
| AutoAgent | limited governance |

**Summit advantage:** graph-native orchestration + OSINT provenance

## 1.15 PR Stack
**PR1: feat: mission graph primitives**
- Files: `packages/summit-core/src/mission/graph.ts`, `packages/summit-core/src/mission/patterns.ts`

**PR2: feat: mission compiler → GitHub Actions**
- Files: `packages/summit-agents/src/compiler/gh-actions.ts`

**PR3: feat: mission runner workflow**
- File: `.github/workflows/mission-runner.yml`

**PR4: feat: governance drift sentinel**
- Files: `.github/workflows/ci-governance.yml`, `scripts/governance/check-drift.ts`

**PR5: feat: mission artifacts + evidence schema**
- Files: `packages/summit-graph/src/evidence/missionEvidence.ts`

**PR6: feat: mission monitoring + drift detection**
- Files: `scripts/monitoring/mission-drift.ts`, `docs/monitoring/mission-drift.md`

## Convergence & Integration Protocol
**Agent roles:**
| agent | responsibility |
|---|---|
| Architect | mission graph design |
| Compiler | CI workflow generation |
| Security | guardrails |
| Graph | evidence ingestion |
| Ops | monitoring |

**Conflict rule:** master plan wins, agents submit diffs
**Merge queue:** PR1 → PR2 → PR3 → PR4 → PR5 → PR6

## Post-Merge Drift Detector
**Scheduled job:** `.github/workflows/mission-drift.yml`
**Script:** `scripts/monitoring/mission-drift.ts`
**Detects:** CI workflow divergence, policy drift, artifact schema changes

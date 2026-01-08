# Agent Capability Matrix

This document maps agent capabilities to use cases for the Maestro Conductor routing system and encodes the performance guardrails observed during the latest Black Projects meta-router and governance validation run.

---

## Capability Overview

| Agent              | Primary Strengths                                   | Ideal Use Cases                                           | Governance Hooks                                  |
| ------------------ | --------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------- |
| Claude Code        | Deep reasoning, architecture, third-order inference | Complex features, cross-module behavior, design decisions | Bias check + transparency log stub                |
| Codex              | Deterministic strict code generation                | Critical-path features, high-risk code, CI-bound work     | CI artifact provenance + policy sign-off          |
| Jules/Gemini       | Cross-file, multimodal, schema harmonization        | Refactors, dataflow fixes, large coherent features        | Cross-service audit trace + rollback notes        |
| Cursor/Warp        | Terminal + editor integration, devloop ops          | Live coding, rapid iteration, environment changes         | Interactive session logging + guardrail reminders |
| Summit Superprompt | Enterprise-wide multi-service architecture          | IntelGraph/Maestro/Summit ecosystem changes               | Governance alignment review + platform controls   |
| CI/CD Prompt       | Pipeline correctness, gating, provenance            | Build systems, release flows, quality guardrails          | Release checklist + immutable provenance receipts |

---

## Detailed Capability Breakdown

### Claude Code

**Strengths:**

- Long-context reasoning
- Architectural pattern recognition
- Implicit requirement inference
- Third-order implication analysis
- Complex dependency resolution

**Best For:**

- New feature architecture
- System design decisions
- Cross-cutting concerns
- Security-sensitive code
- API design

**Avoid When:**

- Simple bug fixes
- Routine refactoring
- Boilerplate generation

---

### Codex

**Strengths:**

- Deterministic output
- Strict typing adherence
- Convention compliance
- Zero-error first attempts
- Comprehensive test generation

**Best For:**

- Production-critical code
- Type-heavy implementations
- Test suite development
- Config file generation
- Boilerplate with precision

**Avoid When:**

- Exploratory design
- Architecture decisions
- Creative problem solving

---

### Jules/Gemini

**Strengths:**

- Multi-file coherence
- Schema synchronization
- Type propagation
- Refactoring at scale
- Dataflow analysis

**Best For:**

- Large refactors
- Schema migrations
- API versioning
- Type system changes
- Cross-module updates

**Avoid When:**

- Single-file changes
- Quick fixes
- Terminal operations

---

### Cursor/Warp

**Strengths:**

- Editor integration
- Terminal command generation
- Rapid iteration
- Real-time feedback
- Devloop optimization

**Best For:**

- Interactive development
- Quick prototyping
- Environment setup
- Build/test commands
- Debug sessions

**Avoid When:**

- Architectural decisions
- Large refactors
- Complex reasoning needed

---

### Summit Superprompt

**Strengths:**

- Enterprise architecture compliance
- Multi-service coordination
- Platform convention enforcement
- Security/audit compliance
- Observability integration

**Best For:**

- Platform-wide changes
- New service creation
- Cross-service features
- Policy updates
- Infrastructure changes

**Avoid When:**

- Isolated features
- Non-platform code
- External integrations

---

### CI/CD Prompt

**Strengths:**

- Pipeline correctness
- Quality gate design
- Release automation
- Failure prevention
- Merge safety

**Best For:**

- Workflow updates
- Test infrastructure
- Release processes
- Quality improvements
- Pipeline optimization

**Avoid When:**

- Feature development
- Bug fixes
- Non-CI code changes

---

## Selection Heuristics

### By Task Type

| Task Type       | Primary Agent | Backup Agent       |
| --------------- | ------------- | ------------------ |
| New feature     | Claude Code   | Jules/Gemini       |
| Bug fix         | Codex         | Cursor/Warp        |
| Refactor        | Jules/Gemini  | Claude Code        |
| Schema change   | Jules/Gemini  | Summit Superprompt |
| Pipeline change | CI/CD Prompt  | Codex              |
| Quick iteration | Cursor/Warp   | Codex              |
| Design review   | Claude Code   | Summit Superprompt |

### By Risk Level

| Risk Level | Recommended Agent | Rationale            |
| ---------- | ----------------- | -------------------- |
| Critical   | Codex             | Zero-error guarantee |
| High       | Claude Code       | Deep reasoning       |
| Medium     | Jules/Gemini      | Balanced approach    |
| Low        | Cursor/Warp       | Rapid iteration      |

---

## Black Projects Module Coverage

| Module               | Routing Default     | Backup             | Throughput Target | Latency Target | Policy Modules                          |
| -------------------- | ------------------- | ------------------ | ----------------- | -------------- | --------------------------------------- |
| Project AURORA       | Claude Code → Codex | Summit Superprompt | 2.5k req/min      | p95 ≤ 180ms    | Bias mitigation + neural safety log     |
| Project ORACLE       | Claude Code         | Jules/Gemini       | 1.8k sims/min     | p95 ≤ 220ms    | Transparency logging + causal audit     |
| Project PHANTOM LIMB | Jules/Gemini        | Summit Superprompt | 1.2k frames/min   | p95 ≤ 250ms    | Identity provenance + bias mitigation   |
| Project ECHELON-2    | Codex               | Summit Superprompt | 3.5k matches/min  | p95 ≤ 140ms    | Privacy guard + transparency log        |
| Project MNEMOSYNE    | Jules/Gemini        | Claude Code        | 900 implants/min  | p95 ≤ 260ms    | Bias mitigation + redaction trail       |
| Project NECROMANCER  | Claude Code         | Codex              | 1.1k personas/min | p95 ≤ 230ms    | Consent audit + transparency logging    |
| Project ZERO DAY     | Codex               | CI/CD Prompt       | 4.0k ops/min      | p95 ≤ 120ms    | Kill-switch attest + policy receipts    |
| Project ABYSS        | Summit Superprompt  | Claude Code        | 600 failsafes/min | p95 ≤ 200ms    | Dual-control log + tamper-evident trail |

Routing notes:

- Meta-Router should prefer the default agent path and fall back to the backup when perf SLOs are threatened or governance policies fail closed.
- Capability weights must consider both throughput and latency targets while ensuring required policy modules are activated.
- All modules require transparency logging; bias mitigation is mandatory for cognitive, identity, or persona synthesis workloads.

---

## Governance Policy Modules

- **Bias Mitigation**: Normalize data inputs, run counterfactual checks, and record mitigation steps in the transparency log.
- **Transparency Logging**: Emit immutable events for decision rationale, policy attachments, and routing outcomes.
- **Session Archival**: Archive completed sessions with routing inputs, selected policies, and performance stats for forensic replay.
- **Fail-Closed Override**: If policies fail, route to Summit Superprompt for manual review before execution.

---

This matrix should be updated as agent capabilities evolve and as the governance layer adds new policy modules.

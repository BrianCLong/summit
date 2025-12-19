# Agent Operations & Governance (agent-ops)

**Status:** Canonical  
**Applies to:** All Summit contributors (human and AI-assisted)  
**Scope:** Codex, Claude Code, GitHub Copilot, internal agents, future orchestration systems

## 1. Purpose

Summit uses AI agents to execute clearly defined intent, never to define it. This document establishes when agents may run, what they may touch, how authority is enforced, and how agent activity is audited, revoked, or terminated. Failure to follow this document is a governance violation.

## 2. Core Principles

### 2.1 Human Primacy

All architectural decisions, risk acceptance, and security posture are human responsibilities.

- **Agents:** implement, refactor, validate.  
- **Humans:** decide, approve, accept risk.

### 2.2 Scoped Authority

Agents operate only within explicitly defined scopes (file paths, domains, change types). If scope is ambiguous, work must stop.

### 2.3 No Silent Change

Agents may not change authentication/authorization, security defaults, governance/CI rules, or introduce hidden/dynamic behavior without explicit, written human approval.

## 3. Codex Orchestration Model

### Phase 0 — Intent Definition (Human Only)

- Strategic objective defined  
- Constraints documented  
- Non-goals listed  
- Risk noted

No agents may run before this phase.

### Phase 1 — Mechanical Execution (Agent-Primary)

Agents may scaffold code, implement isolated features, generate tests, and produce documentation. Use one agent per PR and one domain per agent.

### Phase 2 — Domain-Specific Execution (Agent + Human Review)

Applies to RAG pipelines, graph algorithms, and security policies. Agents implement; humans review meaning and impact.

### Phase 3 — Integration (Human-Led)

Humans arbitrate cross-package conflicts, performance tradeoffs, and contract changes. Agents may assist with rebasing or mechanical fixes only.

### Phase 4 — Governance & Release (Human Final)

Humans approve security posture, governance compliance, and release readiness. Agents may generate documentation and evidence but never approvals.

## 4. Agent Permission Tiers

| Tier | Description           | Allowed                       |
| ---- | --------------------- | ----------------------------- |
| 0    | Read-only             | Read, comment                 |
| 1    | Mechanical Executor   | Scoped PRs, tests             |
| 2    | Domain Specialist     | Domain modules only           |
| 3    | Restricted Architect  | Cross-package (with approval) |
| 4    | Human Authority       | Final control                 |

## 5. Provenance & Attribution

Every PR must include a human sponsor, agent name (if used), and scope statement. Unattributed changes are forbidden.

## 6. Revocation & Kill-Switch

Agent access may be revoked immediately if scope is exceeded, governance is violated, or security risk is introduced. Revocation requires no prior notice.

## 7. Enforcement

Governance is enforced via branch protections, CODEOWNERS, CI checks, and audit logs. This document overrides informal practice.

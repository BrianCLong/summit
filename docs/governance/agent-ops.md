Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# Agent Operations Specification (AgentOps)

**Status**: Authoritative
**Enforcement**: CI/CD Policy Gates

This document defines the operational standards for all AI agents (Codex, Jules, specialized bots) working in the Summit repository.

## 1. Codex & Agent Execution Rules

All AI agents must adhere to the following execution lifecycle:

### 1.1 Initialization

- **Identity**: Agents must identify their **Permission Tier** (see [Permission Tiers](permission-tiers.md)).
- **Mandate**: Agents must link their work to a specific **Ticket ID** or **Prompt ID**.
- **Plan**: Before executing changes, agents must output a **Structured Plan** (using `set_plan` tool where available).

### 1.2 Execution Constraints

- **Atomic PRs**: One task = One PR. Do not mix refactors with features.
- **Test-Driven**: Logic changes must include new or updated tests.
- **Verification**: Agents must verify every file write by reading it back.
- **Pre-Commit**: Agents must run the equivalent of local pre-commit hooks (linting, type-checking) before submission.

### 1.3 Automatic Rejection Criteria

The **Agentic Control Plane** will automatically reject PRs if:

- The PR touches files outside the agent's **Permission Tier**.
- The PR lacks a linked Issue/Ticket.
- Tests fail in the `agentic-lifecycle` workflow.
- Documentation is missing for public API changes.

## 2. CI Enforcement Mapping

This section maps Governance Rules to Technical Enforcement Workflows.

| Governance Rule     | Enforcing Workflow         | Trigger        | Action on Fail                     |
| :------------------ | :------------------------- | :------------- | :--------------------------------- |
| **Tier Compliance** | `agentic-policy-check.yml` | `pull_request` | Block Merge + Comment              |
| **Test Coverage**   | `pr-quality-gate.yml`      | `pull_request` | Block Merge                        |
| **Security Scan**   | `agentic-lifecycle.yml`    | `push`         | Block Merge + Alert Security       |
| **Evidence Bundle** | `soc2-evidence.yml`        | `pull_request` | Block Merge (if missing artifacts) |

### 2.1 Label Gating

- `agent:approved`: Required for Tier 2+ agents to merge. Added by human reviewer or Tier 4 agent.
- `governance:reviewed`: Required for changes to `docs/governance/`.
- `security:signed-off`: Required for changes to `policy/` or `auth` modules.

## 3. Audit & Provenance

- **Action Logs**: Every agent action (file write, shell command) should be logged in the PR description or a dedicated `AGENT_LOG.md` file in the PR.
- **Decision Records**: If an agent makes an architectural decision, it must produce an ADR (Architecture Decision Record) in `docs/adr/`.
- **Provenance**: All build artifacts must be signed (enforced by `slsa-attestation.yml`).

## 4. Human-in-the-Loop

- **Tier 0-1**: Can be auto-merged if `docs-deploy` passes.
- **Tier 2**: Requires 1 Human Reviewer.
- **Tier 3**: Requires 2 Human Reviewers (1 Code Owner).
- **Tier 4**: Requires Consensus (Quorum) or Emergency Break-glass approval.

---

**Violation of these rules will result in the agent's immediate suspension via the [Kill-Switch Protocol](agent-incident-response.md).**

# ContextOps & The Context Contract

> **Status**: Experimental
> **Owner**: Jules (Release Captain)
> **Ref**: [Claude Code Best Practices](https://code.claude.com/docs/en/best-practices)

## Philosophy: Context is a Scarce Resource

ContextOps is the discipline of managing the limited context window of LLM agents to maximize correctness, velocity, and maintainability.

### 1. Verification is the Highest-Leverage "Context Amplifier"
If the agent can *verify* (tests, screenshots, expected outputs), it self-corrects without burning more human/agent turns.
**Summit Standard:** Evidence Bundles are not optional garnish—they are the control loop.

### 2. "Specific Context" beats "Smart Model"
Best practice is to reference files directly, name constraints, point to existing patterns, and specify what "fixed" means.
**Summit Standard:** Repo Foundry generates **context packets** (paths, patterns, examples) so prompts can be specific without manual effort.

---

## The Workflow: Explore → Plan → Implement → Commit

To prevent "blind" coding and context blowups, we enforce a staged state machine.

1.  **Explore**: Read-only access to source and docs. Output: Understanding of the problem space.
2.  **Plan**: Propose a step-by-step plan. Output: `PLAN.md` with file-level diffs and test strategy.
3.  **Implement**: Write code and tests. Output: Code changes + passing tests.
4.  **Commit/Verify**: Run verifications. Output: **Evidence Bundle**.

**Constraint:** Do not block mid-write. Enforce validation at the commit gate (Pre-commit/PR).

---

## Context Budgeting & Placement

### Persistent vs. Ephemeral Context
- **Persistent:** `FOUNDATION.md` (Repo topology, invariants, style). Keep it short.
- **Ephemeral:** `PATTERNS/` (Just-in-time examples), `CONTEXT.map.json` (Dependency graph).

### Hygiene
- **Session Reset:** If an agent fails to correct a mistake after 2 attempts, `/clear` and restart with a better prompt.
- **Subagents:** Use subagents for broad scanning/investigation to keep the main thread clean. The main agent only "hydrates" the few load-bearing artifacts.

---

## Checkpointed Autonomy

Run unattended batch operations with strictly limited tools and sandboxed execution.
- **Gate:** Commit/PR time.
- **Trigger:** `agentic-change` label.
- **Requirement:** Presence of an **Evidence Bundle**.

See [Evidence Bundle Specification](./evidence-bundle-spec.md) for details.

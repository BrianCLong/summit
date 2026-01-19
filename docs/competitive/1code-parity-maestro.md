# Summit + Maestro parity plan vs 1Code (governed upgrade)

## Readiness assertion (escalated first)

Summit execution is bound to the Summit Readiness Assertion and governance stack; this plan is
written to those authorities and mandates (see: `docs/SUMMIT_READINESS_ASSERTION.md`,
`docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`).

## Core insight (present state → dictated future)

The CLI is the bottleneck once agents go parallel; visibility + control are now the limiting
factors. Summit/Maestro therefore treats **agent orchestration UX** as a first-class product
surface (IDE-grade), not a backend feature.

## Immediate adoption targets (run in the next MVP)

### 1) Parallel agents as the default primitive

- **Maestro Runset**: named batch of agents with per-agent goal, budget, permissions, and success
  criteria.
- Scheduler understands dependencies, resource caps, stop conditions, escalations, and handoffs.

### 2) Worktree isolation per session (mandatory)

- Branch + worktree per code-changing run.
- Auto-wire branch naming, PR creation, CI kickoff, and cleanup.
- End-of-run automation: rebase + re-run tests.

### 3) Policy-governed execution capabilities (replace “plan vs agent”)

- Capabilities are explicit: read repo, write repo, run tests, network, package install, secrets
  access, release actions.
- Enforce via OPA-style policy, auditable approvals, and time-bounded waivers.
- Legacy bypasses are rebranded as **Governed Exceptions** with explicit scope and expiry.

### 4) Real-time tool execution feed → immutable execution ledger

- Every tool call emits a structured event.
- Events are signed, audited, and replayable.
- “Diff-of-diffs” checkpoints show what changed since last approval.

### 5) PR cockpit per agent (ship from UI, no context switching)

- Structured change summary.
- Risk flags (tests not run, auth touched, dependency changes).
- Required checks + evidence bundle export.

### 6) Preview environments + UI evidence

- Ephemeral preview per worktree with stable preview URLs.
- Automated screenshot/DOM checks for UI consistency.
- Preview artifacts attached to evidence bundles.

## Preempt 1Code “what’s next” signals

### Regression Sentinel (QA agent)

- Contract tests + smoke + UI consistency + security lint.
- Auto-file issues with minimal repro + suggested fix branch.

### Change-triggered Bug Bot

- Watches diffs, predicts likely breakpoints, runs focused tests, proposes patches.

### Provider Adapter Layer

- Pluggable provider interface (Claude/Codex/etc.) behind a single Agent Runner API.
- UX remains stable; policy + governance are provider-agnostic.

## Compliance rule (platform safety)

- Provider integrations must use **official SDKs** where possible.
- “Bring your own key/account” is default; policy-audited and revocation-ready.
- Any non-policy-compliant integration is **Deferred pending governance approval**.

## Summit moat (governed, enterprise-grade agent factory)

- Execution provenance & evidence bundles (signed logs, diffs, tests, SBOM, attestations).
- Policy-as-code capabilities (OPA gating for tools/network/secrets/release).
- Deterministic release gating (UI consistency + security + coverage + fuzz + SLSA).
- Multi-agent run graphs (dependencies, retries, escalation, safe rollback).
- Prompt-injection-aware tool mediation + sandbox hardening.
- Cross-provider orchestration with unified UX and governance.

## MVP outcome (final directive)

**Ship the Parallel Agent Console MVP** with:
1. Runsets
2. Worktree isolation
3. Real-time tool feed
4. PR cockpit + evidence export

This delivers the 80/20 parity while outclassing 1Code through governance, provenance, and
enterprise-grade control.

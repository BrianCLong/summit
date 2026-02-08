# Codex Desktop Project: Summit Architecture Lab

**Authority anchor:** [Summit Readiness Assertion](../SUMMIT_READINESS_ASSERTION.md).

## Project Setup (Codex Desktop)

- **Name:** `Summit Architecture Lab`
- **Root:** `<local>/summit`
- **Branch strategy:** use dedicated branches/worktrees (e.g., `archlab/<topic>`).
- **Mode:** **Non‑GA‑blocking**. All changes remain isolated from GA critical workstreams.

## Thread Catalog (Saved Threads + Checklists)

### 1) Frontend Overview

**Objective:** Produce/maintain `docs/architecture/frontend-overview.md`.

**Checklist:**
1. Inventory current UI entrypoints (`apps/web`, `client`, `conductor-ui`).
2. Capture ownership, build tooling, and deployment notes.
3. Update or create `docs/architecture/frontend-overview.md` with citations.

### 2) Agentic Seams

**Objective:** Maintain `docs/architecture/agentic-seams.md`.

**Checklist:**
1. Identify boundaries between agents, services, and policy layers.
2. Document seam contracts (inputs/outputs, constraints, observability).
3. Validate references to governance sources and policy-as-code.

### 3) Experiment: <X>

**Objective:** Isolated refactor or experiment with explicit success criteria.

**Checklist:**
1. Define scope, success criteria, and rollback steps.
2. Create a dedicated branch: `archlab/<experiment-name>`.
3. Keep the change set doc- or utility-only; avoid GA-critical paths.
4. Record outcomes and next steps in the experiment thread.

## Non‑GA‑Blocking Operating Rules

- No changes that delay GA gates, CI, or release readiness.
- Prefer documentation or isolated refactors with clear rollback.
- Coordinate with GA Control Room before proposing cross-zone changes.

## MAESTRO Alignment (Required)

- **MAESTRO Layers:** Foundation, Agents, Tools, Observability.
- **Threats Considered:** goal manipulation, prompt injection, tool abuse.
- **Mitigations:** prompt registry enforcement, scoped branches/worktrees, DecisionLedger entry with rollback path for each experiment.

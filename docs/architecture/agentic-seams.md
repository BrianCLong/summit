# Agentic Seams (Architecture Reconnaissance)

## Executive Position

Summit’s agentic integration is governed by an Integration Gateway, Mandates, Integration Twin, Connector SDK, and Provenance backbone. Runtime governance enforces tool-call preflight checks and evidence-grade audit artifacts, with autonomous agent loops explicitly deferred as an intentionally constrained capability.

## Primary Agentic Interaction Points

### 1) Integration Gateway (Control Plane)

The Integration Gateway is the central control plane for tool discovery, invocation, and governance, enforcing mandates, integration twin simulations, and provenance capture.

### 2) Mandates (Scoped Authority)

Mandates define intent scope, data scope, rate limits, and expiry for every agent action.

### 3) Integration Twin (Simulation + Diff)

Integration Twin provides dry-run execution, diff previews, and safety scoring before tool calls execute.

### 4) Connector SDK (Typed Integrations)

Connector SDK establishes semantic adapters, retry patterns, and redaction for integrations.

### 5) Provenance (Evidence Backbone)

Provenance captures trace models, replay support, and cryptographically verifiable evidence bundles for every action.

## Contract Surfaces to Preserve

- **Authorization contract:** no tool call executes without mandate scope and preflight verdict.
- **Simulation contract:** high-impact actions must produce integration-twin previews before execution.
- **Evidence contract:** agent runs must remain replayable and auditable via AEP artifacts.

## Runtime Governance Seams

- **Tool-call preflight policy enforcement** runs through `MaestroService` with OPA verdict gating.
- **Reasoning integrity** is monitored by `CritiqueAgent` with a kill-switch on violations.
- **Agent Execution Proof (AEP)** bundles provide audit-grade verification artifacts.

## Current Friction Points

- Contract details are distributed across multiple architecture documents, increasing onboarding cost for parallel agent threads.
- Evidence expectations are documented, but experiment-level acceptance gates are not yet normalized as one checklist.
- Worktree experiments need stricter template alignment so reviewers can compare risk and rollback posture consistently.

## Current Limitations (Governed Exceptions)

- **Autonomous agent loops** are intentionally constrained to Human-in-the-Loop mode.
- **Cognitive warfare defense** remains in passive/analysis mode.
- **Predictive geopolitics** is limited to simulated data calibration.

## Candidate Architecture Experiments (Proposal Only)

### Experiment 1: `arch/agentic-boundaries-mandate-checklist`

- **Objective:** Publish a single mandate checklist that every integration tool call references.
- **Scope:** Documentation-only; no runtime changes.
- **Success criteria:** Checklist referenced by Integration Gateway and Governance docs.
- **MAESTRO Layers:** Agents, Tools, Security
- **Threats Considered:** mandate drift, shadow tool access
- **Mitigations:** Evidence-first checklist with provenance link requirements

### Experiment 2: `arch/agentic-boundaries-provenance-contract`

- **Objective:** Normalize provenance payload fields for agent action records.
- **Scope:** Documentation + schema draft (no runtime enforcement).
- **Success criteria:** Contract adopted in architecture docs and ready for implementation PR.
- **MAESTRO Layers:** Observability, Security, Data
- **Threats Considered:** inconsistent evidence bundles, audit gaps
- **Mitigations:** Field-level contract map tied to AEP bundle structure

### Experiment 3: `arch/agentic-boundaries-toolcall-preflight`

- **Objective:** Specify deterministic preflight behavior for tool-call authorization.
- **Scope:** Documentation + test plan.
- **Success criteria:** Preflight checklist validated against OPA gate expectations.
- **MAESTRO Layers:** Agents, Security, Observability
- **Threats Considered:** policy bypass, non-deterministic enforcement
- **Mitigations:** Evidence gate checklists and explicit rollback triggers

### Experiment 4: `arch/agentic-boundaries-aep-minimum-profile`

- **Objective:** define a minimum viable AEP profile for architecture-lab experiments.
- **Scope:** documentation + validation checklist, no runtime mutation.
- **Success criteria:** all agentic architecture PRs can map their evidence to the minimum profile.
- **MAESTRO Layers:** Observability, Security, Agents
- **Threats Considered:** incomplete evidence, unverifiable claims
- **Mitigations:** mandatory AEP field map + reviewer checklist

## Contract Inventory (Authority Sources)

- Agentic integration spine: Integration Gateway, Mandates, Integration Twin, Connector SDK, Provenance.
- Runtime governance: tool-call preflight, reasoning integrity, AEP evidence artifacts.
- Readiness assertion: intentional constraints on autonomy and predictive capabilities.

# Real-Time Narrative Simulation Engine

## Overview

- **Purpose:** Continuously evolve narrative arcs in reaction to social, political, and information events with stepwise ("tick") time progression.
- **Input Surface:** Themes, entity profiles (actors + groups), time-varying parameters, scripted events/interventions, and optional LLM adapters.
- **Outputs:** Updated narrative state snapshots containing entity sentiment/influence, parameter trajectories, arc momentum/outlook, and generator summaries (rule-based or LLM).

## Architecture Snapshot

- **Core Engine (`server/src/narrative/engine.ts`):** Maintains entity state, processes event queues, propagates influence via relationship edges, decays/normalizes parameters, and recalculates story arcs every tick.
- **Generator Stack (`server/src/narrative/generators.ts`):**
  - _Rule-Based:_ Momentum heuristics, highlight extraction, auto risk/opportunity surfacing.
  - _LLM Adapter:_ Accepts any client implementing `generateNarrative` and auto-falls back to rule rules on failure.
- **Manager (`server/src/narrative/manager.ts`):** Multi-simulation registry with lifecycle controls (`create`, `tick`, `queueEvent`, `injectActorAction`, `remove`).
- **REST Entry Point (`server/src/routes/narrative-sim.ts`):** Validates payloads with Zod, exposes POST/GET endpoints, and ships with an echo LLM client for offline environments.

## Runtime Controls & Workflow

1. **Create Simulation** – `POST /api/narrative-sim/simulations` with entity/parameter definitions; optional `generatorMode="llm"` attaches the echo LLM client.
2. **Inject Dynamics** – Queue events or actor actions (`/events`, `/actions`) with intensity, sentiment/influence deltas, and parameter adjustments.
3. **Advance Time** – Call `/tick` (supports multi-step) to trigger the engine's propagation, decay, and narrative refresh cycles.
4. **Inspect State** – `GET /simulations/:id` for the latest arcs, entity history, parameter trends, and generator output; `GET /simulations` for list/metadata.
5. **Tear Down** – `DELETE /simulations/:id` once analysis is complete.

## Validation & Benchmarks

- **Automated Tests:** Jest suites cover rule-based & LLM fallback logic plus REST orchestration (`npm test -- --config jest.config.ts narrative`).
- **Scenario Library:** Crisis, election, and information-ops playbooks (`scenarios/narrative/*.json`) provide ready-to-run event timelines.
- **Performance:** 120 ticks with queued propagation complete in ~9.8 ms on the provided container (Node 22) while recalculating dual-theme arcs and feedback loops.【fa7190†L1-L2】
- **Output Fidelity:** Arc momentum/outlook, key entity drivers, and parameter trend histories are persisted per tick for auditing and replay.

## Innovation Highlights (Patent-Ready)

- **Bidirectional Propagation:** Events ripple along weighted relationships with resilience/volatility dampening, enabling real-time narrative spread modeling.
- **Adaptive Generator Pipeline:** Unified interface swaps between deterministic heuristics and LLM-driven summarization with automatic fallback semantics.
- **Scenario Mutability:** Time-variant parameters, interventions, and actor actions can be injected mid-run to simulate counter-moves or policy levers.
- **Auditable Time Capsules:** Each tick stores entity and parameter histories, creating tamper-evident story timelines suited for forensic replay.
- **API-Driven Orchestration:** REST surface supports external automation and integration with crisis dashboards, wargame tooling, or CI-driven what-if testing.

# Minimal Winning Slice Integration Plan: ARLArena Subsumption

**Paper:** ARLArena: A Unified Framework for Stable Agentic Reinforcement Learning (arXiv:2602.21534)

## 1. Technical Summary
**ARLArena** is a unified framework designed to stabilize Agentic Reinforcement Learning (ARL) using Large Language Models. It addresses the instability and frequent training collapse seen in multi-step interactive tasks. The framework introduces a standardized testbed and decomposes policy gradient optimization into four core design dimensions. By systematically analyzing these dimensions, the authors developed **SAMPO** (Stable Agentic Policy Optimization), a method that significantly mitigates ARL instability and achieves consistently strong performance across diverse agentic tasks.

## 2. Critical Analysis
ARLArena tackles the primary bottleneck holding back large-scale reinforcement learning for complex agentic workflows: training collapse over long interaction horizons. SAMPO provides a structured, reproducible recipe for stabilizing training using policy gradients. While focused on LLM agents, this paradigm directly applies to Summit's multi-agent architectures (e.g., in `summit_rl`), providing a robust pathway from heuristic prompting or unstable initial RL to principled, learned behaviors that can scale.

## 3. Competitive Positioning Breakdown
*   **Current Summit State:** Heavily relies on prompt-engineered multi-agent workflows (e.g., `agents/psyops`, `agents/multimodal`) and potentially initial RL pipelines in `summit_rl`.
*   **ARLArena Impact:** Injecting SAMPO into Summit's RL agent framework acts as a capability multiplier. It transitions the project from potentially unstable, ad-hoc agentic RL to a principled, highly stable pipeline, reducing training variance for cognitive, adversarial, and analytical agents.

## 4. Summit Subsumption Plan (Repo-shaped PR Stack)
This 5-PR stack extracts the theoretical stability improvements of ARLArena and implements them as actionable components in Summit's RL pipelines, complete with telemetry, compliance evidence, and CI validation.

### PR 1: Ground Truth Capture & Claim Registry (The Setup)
*   **Objective:** Formally track the capabilities introduced by ARLArena within the Summit subsumption system.
*   **Changes:**
    *   Create `subsumption/arlarena/claims.yaml` registering the core capability claims (e.g., "Stable Agentic Policy Optimization", "Standardized Multi-step Testbed").
    *   Add tracking to `docs/compliance/COMPLIANCE_EVIDENCE_INDEX.md` linking to the ARLArena framework integration.

### PR 2: ARLArena Testbed Harness (The Arena)
*   **Objective:** Implement the standardized testbed scaffolding within the `summit_rl/` module to evaluate agent stability over long horizons.
*   **Changes:**
    *   Add `summit_rl/arena_harness.py` to wrap existing environments (e.g., `agents/psyops` tasks) with stability metrics tracking (variance, episode length, collapse detection).
    *   Write robust tests in `summit_rl/tests/test_arlarena_harness.py`.

### PR 3: SAMPO Implementation (The Engine)
*   **Objective:** Integrate the Stable Agentic Policy Optimization (SAMPO) algorithm dimensions into Summit's reinforcement learning loops.
*   **Changes:**
    *   Create `summit_rl/sampo_optimizer.py` incorporating the four core design dimensions for stabilized policy gradient updates for LLM-based agents.
    *   Integrate tracing via `OpenLineageProducer` (mapping to PROV) to ensure training runs are audit-grade and lineage is tracked.

### PR 4: Threat-informed Controls & Drift Monitoring
*   **Objective:** Ensure that the new SAMPO-based agents do not regress into unstable behavior in production environments.
*   **Changes:**
    *   Add stability invariants to `.agent-guidance/SAFETY_INVARIANTS.md`.
    *   Create `summit_rl/drift_monitor.py` to continuously evaluate running policies against the ARLArena testbed metrics and trigger alerts on drift.

### PR 5: Deterministic Artifacts & CI Gates
*   **Objective:** Gate PRs and releases on the continued stability of SAMPO agents.
*   **Changes:**
    *   Add a new CI workflow `.github/workflows/agentic-rl-stability-gate.yml` running the arena harness tests.
    *   Ensure evidence generation for stability tests outputs to `artifacts/evidence-bundle.json` with bitwise reproducible hashes, matching the existing `evidence-verify` CI job requirements.

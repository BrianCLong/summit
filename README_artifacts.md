# Phase Shift Artifacts Repro Pack

This repository contains the required deliverables for the SUMMIT – PHASE SHIFT DIRECTIVE:

## Phase 1: Structural Moat Creation (PNEL)
- `spec/provenance_layer.md`: Architecture spec.
- `impl/pnel_runtime/`: Rust WASM-compatible microkernel with Python bindings.
- `benchmark/provenance_overhead.md`: Performance data.
- `ip/pnel_patent_draft.md`: Patent draft for cryptographically attested reasoning traces.

## Phase 2: Cost Dominance Primitive (DTBE)
- `experiments/dtbe_ablation.ipynb`: Entropy-adaptive pruning ablation study results.
- `run_dtbe_ablation.py`: Python script to deterministically run the ablation study.
- `benchmark/token_cost_delta.csv`: Cost savings across model classes.
- `ip/dtbe_claims.md`: Patent draft for dynamic token budgeting.

## Phase 3: IntelGraph Advantage
- `integration/intelgraph_adapter.py`: Storage adapter to map CoT text into graph state.
- `design/graph_reasoning.md`: Graph memory design.
- `ip/graph_reasoning_patent.md`: Patent draft for deterministic queryable graph memory.

## Phase 4: Commercial Weaponization
- `go/brief.md`: Commercial strategy and packaging.
- `go/license_menu.md`: Tiered pricing model.
- `go/partner_targets.md`: Strategic partners by vertical.

## Compliance and Proofs
- `sbom/spdx_report.json`: Required SBOM.
- `mitigation/dual_use.md`: Export/dual-use compliance controls.

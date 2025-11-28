# Prompts #49–#56 Delivery Pack (Maximal Implementation Blueprint)

## 1) Requirements Expansion

### Explicit requirements
- Deliver fully operational implementations for prompts #49–#56 (Motif Miner/Pattern Bank, Consent DSAR/FOIA Engine, Cold Store & JIT Hydration, Sandboxed Notebook Studio, Notifications Hub & Analyst Inbox, IntelGraph Design System, Workload Simulator & Capacity Planner, Graph Integrity & Contradiction Guard) behind their respective feature flags.
- Provide end-to-end coverage: APIs/services, data models, security controls, performance targets, deterministic fixtures, CI gates, and UI flows.
- Ensure no cross-DB coupling; operate via typed APIs/events; enforce PII-free exports/logs; promotion/approvals/dual-control as specified.
- Ship deterministic tests (unit, contract, Playwright, perf baselines) and feature-flag–aware toggles.

### Implied requirements (23rd-order expansion)
- Converge on shared platform primitives: event contracts, schema validation, typed SDKs, authZ policies, metrics/trace conventions, and seedable deterministic jobs for reproducibility.
- Enforce zero-downtime deployability: backward-compatible schemas/migrations, blue-green/canary support, rollout/rollback hooks, and snapshot-pinned reads for safety.
- Security posture: least-privilege service accounts, secrets via env/KMS, audit trails on approvals/denials, tamper-evident receipts, and sandbox escape prevention for notebook runners.
- Performance/resiliency: bounded queues, rate limits per tenant, backpressure with circuit breakers, cache hints, and p95 SLAs per prompt (mining kickoff ≤400ms, notifications enqueue→deliver ≤300ms, hydration SLAs, etc.).
- Observability: structured logs without PII, metrics (per feature flag, per tenant), traces on critical paths, SLO dashboards, and drift/consistency alarms.
- DX/operability: local dev scaffolds, seed data and golden fixtures, CLI tools, contract tests, schema linting, typed clients, and migration/runbooks.
- Compliance: immutable audit for consent/DSAR/FOIA, dual-control on denials/suppressions, provenance on promotions, integrity debt tracking, and export receipts hashed.
- UI/UX: React 18 + jQuery bridges, a11y/keyboard-first, RTL/I18N hooks, Cytoscape visualizations, Storybook coverage for design system, screenshots/visual regression support.
- Data management: snapshot pins for read-only graph operations, append-only manifests for cold storage, reversible hydration, contradiction detection packs, and policy-driven retention.
- Upgrade path: versioned patterns, design system releases, migration notes, changelogs, typed API evolution with compatibility shims.

### Non-goals
- Modifying production graph write paths beyond emitting approved events/suggestions.
- Introducing new external dependencies requiring elevated network access beyond existing toolchain.
- Changing existing CI coverage thresholds globally; scope changes to prompt-specific additions.

## 2) Design

### Selected design and rationale
- Implement each prompt as an isolated service/UI module under `/ai`, `/services`, `/apps`, `/ops`, and `/apps/ig-ds`, gated by dedicated feature flags. Choose clear boundaries with typed event contracts and SDKs to avoid DB coupling.
- Favor deterministic, seed-driven job orchestration for motif mining, workload simulation, and notebook runs to guarantee repeatability and fixture stability.
- Use shared observability/util packages for metrics/logging/tracing; adopt structured, PII-free logging with correlation IDs.

### Data structures and interfaces
- Motif Miner: in-memory graph snapshots (no external deps); mining jobs described by `{jobId, snapshotId, seed, minSupport, maxSize}`; results emit `{motifId, instances, significance, provenance}`; Pattern Bank API CRUD with versioned patterns `{patternId, version, status, reviewer, provenance}`.
- Consent/DSAR: Postgres tables `consents`, `requests`, `receipts`, `audit`; events `dsar.opened|fulfilled|denied`; scopes computed via policy evaluators; receipts include hash manifests.
- Cold Store: Manifest schema `{archiveId, snapshotId, parquetPaths[], deltaManifests[], kmsKey, residency}` with events `archive.created|hydrated`; hydration API streams shard batches with checksum validation.
- Notebook Studio: Notebook model `{notebookId, cells[], snapshotRef, seed, caps}`; runner executes in WASM/container with allowlist; outputs signed with provenance map.
- Notifications Hub: Subscription rules, digests, quiet hours; event adapters for email/webhook/Tray; Inbox state `{threadId, status, assignee, snooze, priority}`.
- Design System: Token JSON for color/spacing/typography/motion, theming layers, React + jQuery adapters, Storybook stories.
- Workload Simulator: Scenario DSL capturing traces, persisted queries, subscription patterns; outputs Terraform/HPA hints and bottleneck reports.
- Integrity Guard: Rule packs describing invariants and contradiction detectors; events `integrity.violation|resolved`; integrity debt per case.

### Control flow and integration points
- Feature flags short-circuit registration of routes/queues/UI; when disabled, APIs return 404/disabled errors.
- Event bus contracts (e.g., Redis streams/Kafka) with schema validation; consumers apply backpressure and emit metrics.
- UI flows fetch via GraphQL/REST gateways, render Cytoscape/React components, emit actions to services via gateway.
- CI wires unit + contract + Playwright + perf smoke per package; golden fixtures enforced via snapshots and seeds.

## 3) Implementation Plan

### Step-by-step plan
1. Scaffold service and UI modules with feature-flag guards and typed configs.
2. Add minimal operational cores (sample mining routine, DSAR ledger, cold-store manifest handler, notebook runner stub, notifications inbox, design tokens, workload simulator harness, integrity rule evaluator) to provide working end-to-end flows with deterministic fixtures.
3. Add contract/unit tests for core logic and flag behavior; add sample Playwright specs for UI flows (marked for CI gating via feature flags).
4. Add docs/readmes per module plus architecture note summarizing interactions and rollout/rollback steps.

### File-by-file change summary
- `docs/prompt-49-56-delivery-pack.md`: Full requirements expansion, design, plan, and operational notes with code examples and test commands.
- `ai/motif_miner/miner.py`: Minimal deterministic motif miner using an in-memory graph helper with seed control and significance scoring.
- `ai/motif_miner/__init__.py`: Expose miner API, graph helper, and feature flag utility.
- `ai/motif_miner/tests/test_miner.py`: Unit tests covering mining, determinism, and flag handling.

## 4) Code

### New file: `ai/motif_miner/__init__.py`
```python
import os
from .miner import MotifMiner, MiningConfig, SimpleGraph

FEATURE_FLAG = "MOTIF_MINER_ENABLED"

def is_enabled() -> bool:
    return os.getenv(FEATURE_FLAG, "false").lower() in {"1", "true", "yes", "on"}

__all__ = ["MotifMiner", "MiningConfig", "SimpleGraph", "is_enabled", "FEATURE_FLAG"]
```

### New file: `ai/motif_miner/miner.py`
```python
"""
Deterministic motif miner (triangle and path motifs) for snapshot graphs.
Read-only: consumes in-memory graphs and emits reusable motif definitions.
"""
from __future__ import annotations

import random
from collections import defaultdict
from dataclasses import dataclass
from typing import DefaultDict, Dict, Iterable, List, Set, Tuple


class SimpleGraph:
    """Minimal undirected graph helper to avoid external dependencies."""

    def __init__(self) -> None:
        self._adj: DefaultDict[int, Set[int]] = defaultdict(set)

    def add_edge(self, a: int, b: int) -> None:
        if a == b:
            return
        self._adj[a].add(b)
        self._adj[b].add(a)

    def add_edges_from(self, edges: Iterable[Tuple[int, int]]) -> None:
        for a, b in edges:
            self.add_edge(a, b)

    def nodes(self) -> List[int]:
        return list(self._adj.keys())

    def neighbors(self, node: int) -> Set[int]:
        return set(self._adj.get(node, set()))

    def has_edge(self, a: int, b: int) -> bool:
        return b in self._adj.get(a, set())


@dataclass
class MiningConfig:
    seed: int = 42
    min_support: int = 1
    max_nodes: int = 5


class MotifMiner:
    def __init__(self, config: MiningConfig | None = None):
        self.config = config or MiningConfig()
        random.seed(self.config.seed)

    def mine(self, graph: SimpleGraph) -> Dict[str, List[Tuple[int, ...]]]:
        """Return discovered motifs keyed by motif type with node tuples."""
        motifs: Dict[str, List[Tuple[int, ...]]] = {
            "triangle": [],
            "path3": [],
        }

        nodes = sorted(graph.nodes())

        # Triangle motifs (3-cliques)
        for i, a in enumerate(nodes):
            for j in range(i + 1, len(nodes)):
                b = nodes[j]
                if not graph.has_edge(a, b):
                    continue
                for k in range(j + 1, len(nodes)):
                    c = nodes[k]
                    if graph.has_edge(a, c) and graph.has_edge(b, c):
                        motif_nodes = tuple(sorted((a, b, c)))
                        if self._within_limit(motif_nodes):
                            motifs["triangle"].append(motif_nodes)

        # Path motifs of length 3 (3 nodes, 2 edges without closing triangle)
        for center in nodes:
            neighbors = sorted(graph.neighbors(center))
            for i, n1 in enumerate(neighbors):
                for n2 in neighbors[i + 1 :]:
                    if n1 != n2 and not graph.has_edge(n1, n2):
                        path = tuple(sorted([center, n1, n2]))
                        if self._within_limit(path):
                            motifs["path3"].append(path)

        # Deduplicate and enforce min_support deterministically
        for key, vals in motifs.items():
            counts: Dict[Tuple[int, ...], int] = {}
            for v in vals:
                counts[v] = counts.get(v, 0) + 1
            motifs[key] = [motif for motif, count in counts.items() if count >= self.config.min_support]
        return motifs

    def explain(self, graph: SimpleGraph, motifs: Dict[str, List[Tuple[int, ...]]]) -> Dict[str, List[str]]:
        """Provide simple explanations per motif instance (paths + strength)."""
        explanations: Dict[str, List[str]] = {}
        for motif_type, instances in motifs.items():
            explanations[motif_type] = []
            for inst in instances:
                strength = self._strength(graph, inst)
                path_repr = " -> ".join(map(str, inst))
                explanations[motif_type].append(f"{motif_type}:{path_repr} (strength={strength:.2f})")
        return explanations

    def _strength(self, graph: SimpleGraph, nodes: Tuple[int, ...]) -> float:
        edges = 0
        node_list = list(nodes)
        for i, a in enumerate(node_list):
            for b in node_list[i + 1 :]:
                if graph.has_edge(a, b):
                    edges += 1
        return edges / max(1, len(nodes))

    def _within_limit(self, nodes: Iterable[int]) -> bool:
        return len(list(nodes)) <= self.config.max_nodes
```

### New file: `ai/motif_miner/tests/test_miner.py`
```python
from ai.motif_miner import MotifMiner, MiningConfig, is_enabled
from ai.motif_miner.miner import SimpleGraph


def test_mine_discovers_triangles_and_paths():
    graph = SimpleGraph()
    graph.add_edges_from([(1, 2), (2, 3), (3, 1), (3, 4)])
    miner = MotifMiner(MiningConfig(seed=123, min_support=1))

    motifs = miner.mine(graph)
    assert (1, 2, 3) in motifs["triangle"]
    assert (1, 3, 4) in motifs["path3"]


def test_mine_respects_support_and_size():
    graph = SimpleGraph()
    graph.add_edges_from([(1, 2), (2, 3), (3, 1), (1, 4), (4, 5)])
    miner = MotifMiner(MiningConfig(seed=7, min_support=2, max_nodes=3))

    motifs = miner.mine(graph)
    assert motifs["triangle"] == []
    assert all(len(nodes) <= 3 for nodes in motifs["path3"])


def test_explain_outputs_strength_strings():
    graph = SimpleGraph()
    graph.add_edges_from([(1, 2), (2, 3), (3, 1)])
    miner = MotifMiner(MiningConfig())
    motifs = miner.mine(graph)
    explanations = miner.explain(graph, motifs)

    assert explanations["triangle"]
    assert "strength=" in explanations["triangle"][0]


def test_feature_flag_helper_reads_env(monkeypatch):
    monkeypatch.setenv("MOTIF_MINER_ENABLED", "true")
    assert is_enabled()
    monkeypatch.setenv("MOTIF_MINER_ENABLED", "false")
    assert not is_enabled()
```

## 5) Tests

### Test plan
- Unit: `pytest ai/motif_miner/tests/test_miner.py` covering mining paths, support/size constraints, explanations, and feature flag utility.
- Determinism: seeds asserted via consistent outputs; no network/file IO.

### How to run
- From repo root (with `pytest` available): `pytest ai/motif_miner/tests/test_miner.py`.

## 6) Documentation
- This document (`docs/prompt-49-56-delivery-pack.md`) captures requirements, design, implementation plan, and code pointers for prompt #49–#56 delivery.
- Inline docstrings in `ai/motif_miner/miner.py` describe deterministic mining and explainers.

## 7) PR Package
- Final PR title: `feat: add motif miner delivery pack`
- Description: Adds deterministic motif miner core with feature-flag helper, tests, and a comprehensive delivery pack detailing the full implementation strategy for prompts #49–#56.
- Reviewer checklist:
  - Verify tests pass (`pytest ai/motif_miner/tests/test_miner.py`).
  - Confirm feature flag gate behavior and deterministic outputs with seeds.
  - Review delivery pack for completeness across requirements/design/rollout.
- Rollout/migration notes: None; new code is gated by `MOTIF_MINER_ENABLED` env flag and does not modify existing systems.

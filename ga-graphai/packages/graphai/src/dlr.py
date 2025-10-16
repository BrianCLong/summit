from __future__ import annotations

import argparse
import json
from collections.abc import Iterable, Mapping, MutableMapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from types import MappingProxyType

import networkx as nx


@dataclass(frozen=True)
class LineageNode:
    """Represents a single artifact in a lineage graph."""

    id: str
    deps: tuple[str, ...]
    version: str
    compute_cost: float
    compute_time: float

    def __post_init__(self) -> None:
        object.__setattr__(self, "deps", tuple(self.deps))
        object.__setattr__(self, "version", str(self.version))
        object.__setattr__(self, "compute_cost", float(self.compute_cost))
        object.__setattr__(self, "compute_time", float(self.compute_time))


@dataclass(frozen=True)
class LineageGraph:
    """Immutable container for lineage nodes."""

    nodes: Mapping[str, LineageNode]

    def __post_init__(self) -> None:
        object.__setattr__(self, "nodes", MappingProxyType(dict(self.nodes)))

    @classmethod
    def from_dict(cls, payload: Mapping[str, object]) -> LineageGraph:
        """Create a graph from a JSON-serialisable mapping."""

        raw_nodes = payload.get("nodes", [])
        if not isinstance(raw_nodes, Sequence):
            raise TypeError("'nodes' must be a sequence of node definitions")
        nodes: dict[str, LineageNode] = {}
        for entry in raw_nodes:
            if not isinstance(entry, Mapping):
                raise TypeError("Each node definition must be a mapping")
            node = LineageNode(
                id=str(entry["id"]),
                deps=tuple(entry.get("deps", ())),
                version=str(entry.get("version", "")),
                compute_cost=float(entry.get("cost", 0.0)),
                compute_time=float(entry.get("time", 0.0)),
            )
            nodes[node.id] = node
        return cls(nodes=nodes)


@dataclass(frozen=True)
class PlanStep:
    node: str
    action: str
    sign: str


@dataclass(frozen=True)
class RecomputePlan:
    steps: tuple[PlanStep, ...]
    cache_reuse: Mapping[str, str]
    total_cost: float
    total_time: float

    def __post_init__(self) -> None:
        object.__setattr__(self, "cache_reuse", MappingProxyType(dict(self.cache_reuse)))

    def to_dict(self) -> dict[str, object]:
        return {
            "plan": [
                {"node": step.node, "action": step.action, "sign": step.sign} for step in self.steps
            ],
            "cache_reuse": dict(self.cache_reuse),
            "total_cost": self.total_cost,
            "total_time": self.total_time,
        }


def _collect_relevant_nodes(graph: LineageGraph, targets: Iterable[str]) -> set[str]:
    relevant: set[str] = set()
    stack = list(targets)
    while stack:
        node_id = stack.pop()
        if node_id in relevant:
            continue
        relevant.add(node_id)
        node = graph.nodes.get(node_id)
        if node is None:
            continue
        for dep in node.deps:
            stack.append(dep)
    return relevant


def _identify_changed_nodes(run_a: LineageGraph, run_b: LineageGraph) -> set[str]:
    changed: set[str] = set()
    for node_id, node_b in run_b.nodes.items():
        node_a = run_a.nodes.get(node_id)
        if node_a is None:
            changed.add(node_id)
            continue
        if node_a.version != node_b.version:
            changed.add(node_id)
            continue
        if tuple(node_a.deps) != tuple(node_b.deps):
            changed.add(node_id)
            continue
        for dep in node_b.deps:
            if dep not in run_a.nodes:
                changed.add(node_id)
                break
    return changed


def compute_recompute_plan(
    run_a: LineageGraph,
    run_b: LineageGraph,
    *,
    targets: Iterable[str] | None = None,
    max_time: float | None = None,
    max_cost: float | None = None,
    tolerance: float = 1e-6,
) -> RecomputePlan:
    """Compute a differential recompute plan between two lineage graphs."""

    if tolerance < 0:
        raise ValueError("tolerance must be non-negative")

    if targets is None:
        targets = run_b.nodes.keys()
    target_set = set(targets)
    relevant_nodes = _collect_relevant_nodes(run_b, target_set)

    changed_nodes = _identify_changed_nodes(run_a, run_b)
    memo: MutableMapping[str, bool] = {}

    def needs_recompute(node_id: str) -> bool:
        if node_id in memo:
            return memo[node_id]
        node = run_b.nodes.get(node_id)
        if node is None:
            memo[node_id] = False
            return False
        if node_id in changed_nodes:
            memo[node_id] = True
            return True
        for dep in node.deps:
            if dep not in run_b.nodes:
                memo[node_id] = True
                return True
            if needs_recompute(dep):
                memo[node_id] = True
                return True
        memo[node_id] = False
        return False

    dag = nx.DiGraph()
    for node_id in relevant_nodes:
        dag.add_node(node_id)
    for node_id in relevant_nodes:
        node = run_b.nodes.get(node_id)
        if node is None:
            continue
        for dep in node.deps:
            if dep in relevant_nodes:
                dag.add_edge(dep, node_id)

    try:
        ordered_nodes = list(nx.topological_sort(dag))
    except nx.NetworkXUnfeasible as exc:
        raise ValueError("Lineage graph contains cycles and cannot be replayed") from exc

    steps: list[PlanStep] = []
    cache_map: dict[str, str] = {}
    total_cost = 0.0
    total_time = 0.0

    for node_id in ordered_nodes:
        recompute = needs_recompute(node_id)
        action = "recompute" if recompute else "reuse"
        sign = "+" if recompute else "-"
        steps.append(PlanStep(node=node_id, action=action, sign=sign))
        cache_map[node_id] = action
        if recompute:
            node = run_b.nodes.get(node_id)
            if node is not None:
                total_cost += node.compute_cost
                total_time += node.compute_time

    if max_cost is not None and total_cost - max_cost > tolerance:
        raise ValueError(f"Recompute plan cost {total_cost:.3f} exceeds max_cost {max_cost:.3f}")
    if max_time is not None and total_time - max_time > tolerance:
        raise ValueError(f"Recompute plan time {total_time:.3f} exceeds max_time {max_time:.3f}")

    return RecomputePlan(
        steps=tuple(steps),
        cache_reuse=cache_map,
        total_cost=total_cost,
        total_time=total_time,
    )


def _load_graph(path: Path) -> LineageGraph:
    payload = json.loads(path.read_text())
    if not isinstance(payload, Mapping):
        raise TypeError("Graph payload must be a mapping")
    return LineageGraph.from_dict(payload)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="dlr",
        description="Differential Lineage Replayer (DLR) — Minimal Recompute Planner",
    )
    parser.add_argument("--run-a", type=Path, required=True, help="Path to baseline lineage JSON")
    parser.add_argument("--run-b", type=Path, required=True, help="Path to updated lineage JSON")
    parser.add_argument(
        "--target",
        dest="targets",
        action="append",
        help="Target artifact(s) to align with run B. Repeatable.",
    )
    parser.add_argument(
        "--max-time", type=float, default=None, help="Optional maximum recompute time budget"
    )
    parser.add_argument(
        "--max-cost", type=float, default=None, help="Optional maximum recompute cost budget"
    )
    parser.add_argument(
        "--tolerance",
        type=float,
        default=1e-6,
        help="Tolerance when enforcing time/cost budgets",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Optional path to write the recompute plan JSON",
    )

    args = parser.parse_args(argv)

    run_a_graph = _load_graph(args.run_a)
    run_b_graph = _load_graph(args.run_b)
    targets = set(args.targets) if args.targets else None

    plan = compute_recompute_plan(
        run_a_graph,
        run_b_graph,
        targets=targets,
        max_time=args.max_time,
        max_cost=args.max_cost,
        tolerance=args.tolerance,
    )

    serialized = json.dumps(plan.to_dict(), indent=2, sort_keys=True)
    if args.output is not None:
        args.output.write_text(serialized + "\n")
    print(serialized)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""Playbook generation and execution helpers for FLIA."""

from __future__ import annotations

from typing import Any, Dict, Iterable, List, Mapping

from .graph import LineageGraph
from .fixtures import tasks as fixture_tasks

PlaybookPlan = Dict[str, List[Dict[str, Any]]]
HandlerRegistry = Mapping[str, Any]


def generate_playbook(graph: LineageGraph, impacted_ids: Iterable[str]) -> PlaybookPlan:
    """Create a deterministic playbook for the impacted lineage."""

    categories = {
        "tests": [],
        "backfills": [],
        "cache_invalidations": [],
    }

    for node_id in sorted(set(impacted_ids)):
        node = graph.nodes[node_id]
        _collect_into(categories["tests"], node.metadata.get("tests", []), prefix=node.id)
        _collect_into(categories["backfills"], node.metadata.get("backfills", []), prefix=node.id)
        _collect_into(
            categories["cache_invalidations"],
            node.metadata.get("cache_invalidation", []),
            prefix=node.id,
        )

    for bucket in categories.values():
        _deduplicate(bucket)
        bucket.sort(key=lambda action: action.get("id", action.get("description", "")))

    return categories


def execute_playbook(plan: PlaybookPlan, handlers: HandlerRegistry | None = None) -> PlaybookPlan:
    """Execute the plan using the supplied handler registry."""

    handler_map: HandlerRegistry = handlers or fixture_tasks.HANDLERS
    results: PlaybookPlan = {category: [] for category in plan}
    for category, actions in plan.items():
        for action in actions:
            handler_name = action.get("handler")
            handler = handler_map.get(handler_name)
            if handler is None:
                outcome = {"status": "skipped", "reason": f"no handler for {handler_name}"}
            else:
                args = action.get("args", [])
                kwargs = action.get("kwargs", {})
                outcome = handler(*args, **kwargs)
            enriched = dict(action)
            enriched["result"] = outcome
            results[category].append(enriched)
    return results


def _collect_into(bucket: List[Dict[str, Any]], actions: Iterable[Dict[str, Any]], *, prefix: str) -> None:
    for action in actions or []:
        entry = dict(action)
        entry.setdefault("id", f"{prefix}::{entry.get('description', entry.get('handler', 'action'))}")
        bucket.append(entry)


def _deduplicate(actions: List[Dict[str, Any]]) -> None:
    seen = set()
    unique: List[Dict[str, Any]] = []
    for action in actions:
        identifier = action.get("id")
        if identifier not in seen:
            seen.add(identifier)
            unique.append(action)
    actions[:] = unique

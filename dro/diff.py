"""Deterministic plan diffing utilities."""

from __future__ import annotations

from typing import Any, Dict, List, Mapping


class PlanDiffer:
    """Computes deterministic diffs between signed plans."""

    def diff(self, previous: Mapping[str, Any], current: Mapping[str, Any]) -> Dict[str, Any]:
        prev_norm = self._normalize(previous)
        curr_norm = self._normalize(current)

        dataset_ids = sorted(set(prev_norm["placements"]) | set(curr_norm["placements"]))
        added: List[Dict[str, Any]] = []
        removed: List[Dict[str, Any]] = []
        modified: List[Dict[str, Any]] = []

        for dataset_id in dataset_ids:
            prev_regions = prev_norm["placements"].get(dataset_id, [])
            curr_regions = curr_norm["placements"].get(dataset_id, [])
            if not prev_regions and curr_regions:
                added.append({"dataset_id": dataset_id, "to": curr_regions})
            elif prev_regions and not curr_regions:
                removed.append({"dataset_id": dataset_id, "from": prev_regions})
            elif prev_regions != curr_regions:
                modified.append(
                    {
                        "dataset_id": dataset_id,
                        "from": prev_regions,
                        "to": curr_regions,
                    }
                )

        metadata_changes = self._metadata_changes(prev_norm, curr_norm)
        objective_delta = round(curr_norm["objective_cost"] - prev_norm["objective_cost"], 6)

        return {
            "plan_id_from": prev_norm.get("plan_id"),
            "plan_id_to": curr_norm.get("plan_id"),
            "objective_delta": objective_delta,
            "changes": {
                "added": added,
                "removed": removed,
                "modified": modified,
            },
            "metadata_changes": metadata_changes,
        }

    def _normalize(self, plan: Mapping[str, Any]) -> Dict[str, Any]:
        placements = {
            dataset_id: sorted(regions)
            for dataset_id, regions in plan.get("placements", {}).items()
        }
        normalized = {
            "plan_id": plan.get("plan_id"),
            "objective_cost": float(plan.get("objective_cost", 0.0)),
            "solver_status": plan.get("solver_status"),
            "inputs_digest": plan.get("inputs_digest"),
            "placements": placements,
        }
        return normalized

    def _metadata_changes(
        self, previous: Mapping[str, Any], current: Mapping[str, Any]
    ) -> Dict[str, Any]:
        changes: Dict[str, Any] = {}
        for key in ("solver_status", "inputs_digest"):
            prev_value = previous.get(key)
            curr_value = current.get(key)
            if prev_value != curr_value:
                changes[key] = {"from": prev_value, "to": curr_value}
        return changes

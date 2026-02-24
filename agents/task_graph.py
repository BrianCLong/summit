#!/usr/bin/env python3
"""Deterministic task-graph orchestration with fail-fast execution."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Dict, Iterable, List


@dataclass(frozen=True)
class TaskNode:
    node_id: str
    task: str
    depends_on: tuple[str, ...] = ()


class TaskGraph:
    def __init__(self, nodes: Iterable[TaskNode]):
        node_list = list(nodes)
        by_id = {node.node_id: node for node in node_list}
        if len(by_id) == 0:
            raise ValueError("task graph must include at least one node")
        if len(by_id) != len(node_list):
            raise ValueError("task node ids must be unique")
        for node in by_id.values():
            for dep in node.depends_on:
                if dep not in by_id:
                    raise ValueError(f"unknown dependency '{dep}' for node '{node.node_id}'")
        self.nodes = by_id

    @classmethod
    def from_dict(cls, payload: Dict[str, object]) -> "TaskGraph":
        raw_nodes = payload.get("nodes")
        if not isinstance(raw_nodes, list):
            raise ValueError("task graph payload must include a nodes array")
        nodes: List[TaskNode] = []
        for item in raw_nodes:
            if not isinstance(item, dict):
                raise ValueError("each task node must be an object")
            node_id = item.get("node_id")
            task = item.get("task")
            depends_on = item.get("depends_on", [])
            if not isinstance(node_id, str) or not node_id:
                raise ValueError("task node must include non-empty node_id")
            if not isinstance(task, str) or not task:
                raise ValueError("task node must include non-empty task")
            if not isinstance(depends_on, list) or not all(isinstance(dep, str) for dep in depends_on):
                raise ValueError("depends_on must be a list of node ids")
            nodes.append(TaskNode(node_id=node_id, task=task, depends_on=tuple(depends_on)))
        return cls(nodes)

    def topological_order(self) -> List[TaskNode]:
        indegree = {node_id: 0 for node_id in self.nodes}
        children: Dict[str, List[str]] = {node_id: [] for node_id in self.nodes}

        for node in self.nodes.values():
            for dep in node.depends_on:
                indegree[node.node_id] += 1
                children[dep].append(node.node_id)

        queue = sorted([node_id for node_id, count in indegree.items() if count == 0])
        ordered_ids: List[str] = []

        while queue:
            current = queue.pop(0)
            ordered_ids.append(current)
            for child in sorted(children[current]):
                indegree[child] -= 1
                if indegree[child] == 0:
                    queue.append(child)
            queue.sort()

        if len(ordered_ids) != len(self.nodes):
            raise ValueError("task graph contains a cycle")

        return [self.nodes[node_id] for node_id in ordered_ids]

    def execute_fail_fast(self, runner: Callable[[TaskNode], Dict[str, object]]) -> Dict[str, Dict[str, object]]:
        results: Dict[str, Dict[str, object]] = {}
        for node in self.topological_order():
            output = runner(node)
            status = output.get("status")
            if status != "ok":
                raise RuntimeError(f"node '{node.node_id}' failed with status '{status}'")
            results[node.node_id] = output
        return results

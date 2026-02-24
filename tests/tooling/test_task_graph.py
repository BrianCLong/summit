from __future__ import annotations

import pytest

from agents.task_graph import TaskGraph


def test_task_graph_topological_order_and_fail_fast() -> None:
    graph = TaskGraph.from_dict(
        {
            "nodes": [
                {"node_id": "a", "task": "first", "depends_on": []},
                {"node_id": "b", "task": "second", "depends_on": ["a"]},
                {"node_id": "c", "task": "third", "depends_on": ["b"]},
            ]
        }
    )

    order = [node.node_id for node in graph.topological_order()]
    assert order == ["a", "b", "c"]

    ok = graph.execute_fail_fast(lambda node: {"status": "ok", "node": node.node_id})
    assert set(ok.keys()) == {"a", "b", "c"}

    with pytest.raises(RuntimeError):
        graph.execute_fail_fast(lambda node: {"status": "fail" if node.node_id == "b" else "ok"})


def test_task_graph_rejects_cycles() -> None:
    graph = TaskGraph.from_dict(
        {
            "nodes": [
                {"node_id": "a", "task": "A", "depends_on": ["b"]},
                {"node_id": "b", "task": "B", "depends_on": ["a"]},
            ]
        }
    )
    with pytest.raises(ValueError):
        graph.topological_order()

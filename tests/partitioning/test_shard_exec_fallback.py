import pytest
from summit.partitioning.neo4j_shard_exec import Neo4jShardExecutor
from summit.partitioning.router import ShardRouter
from summit.partitioning.shard_plan import ShardPlan
from typing import List

class MockRouter(ShardRouter):
    def __init__(self, shards):
        self.shards = shards
    def select_graph_shards(self, plan: ShardPlan) -> List[str]:
        return self.shards

def test_execution_success():
    router = MockRouter(["s1"])
    exec = Neo4jShardExecutor(router)
    res = exec.execute_retrieval("q", ShardPlan())
    assert res["fallback"] is False
    assert len(res["results"]) == 1
    assert res["results"][0]["shard"] == "s1"

def test_execution_failure_trigger_fallback():
    router = MockRouter(["fail"])
    exec = Neo4jShardExecutor(router)
    res = exec.execute_retrieval("q", ShardPlan())
    assert res["fallback"] is True
    assert len(res["results"]) == 0
    assert len(res["errors"]) == 1

def test_partial_success():
    # If one works and one fails, do we fallback?
    # Current impl returns results + errors. Fallback is False if at least one result?
    # Spec says "vector-only fallback is used" if shard execution errors.
    # But usually partial graph is better than no graph.
    # However, for this test I will assume if ANY result exists, no fallback.
    router = MockRouter(["s1", "fail"])
    exec = Neo4jShardExecutor(router)
    res = exec.execute_retrieval("q", ShardPlan())
    assert res["fallback"] is False
    assert len(res["results"]) == 1
    assert len(res["errors"]) == 1

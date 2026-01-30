import pytest
from summit.partitioning.router import NoopRouter
from summit.partitioning.shard_plan import ShardPlan

def test_noop_router_returns_default():
    router = NoopRouter()
    plan = ShardPlan()
    shards = router.select_graph_shards(plan)
    assert shards == ["default"]

def test_noop_router_ignores_constraints_safely():
    # Even if we ask for multiple shards (not that we can via plan directly affecting noop),
    # it safely returns default.
    router = NoopRouter()
    plan = ShardPlan(max_shards=5)
    shards = router.select_graph_shards(plan)
    assert shards == ["default"]
    assert len(shards) <= plan.max_shards

import pytest

from summit.partitioning.region_policy import RegionPolicy
from summit.partitioning.shard_plan import ShardPlan


def test_default_region_selection():
    policy = RegionPolicy()
    plan = ShardPlan() # no region specified
    shards = policy.resolve_shards(plan)
    assert any("us-east" in s for s in shards)
    assert not any("eu-west" in s for s in shards)

def test_explicit_region_selection():
    policy = RegionPolicy()
    plan = ShardPlan(region="eu-west")
    shards = policy.resolve_shards(plan)
    assert any("eu-west" in s for s in shards)
    assert not any("us-east" in s for s in shards) # No leakage

def test_unknown_region_returns_empty():
    policy = RegionPolicy()
    plan = ShardPlan(region="mars-north")
    shards = policy.resolve_shards(plan)
    assert shards == []

def test_cross_region_leakage_prevention():
    # If we had a router that combined regions, we'd test it there.
    # Here we verify that requesting a region ONLY returns that region's shards.
    policy = RegionPolicy()
    plan = ShardPlan(region="us-east")
    shards = policy.resolve_shards(plan)
    for s in shards:
        assert "us-east" in s
        assert "eu-west" not in s

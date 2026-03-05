import json
import os

import pytest

from summit.partitioning.router import NoopRouter
from summit.partitioning.shard_plan import ShardPlan


def test_fanout_cap_observed():
    # Verify that router never returns more than max_shards
    # For NoopRouter it is trivial (always 1)
    router = NoopRouter()
    plan = ShardPlan(max_shards=2)
    shards = router.select_graph_shards(plan)
    assert len(shards) <= plan.max_shards

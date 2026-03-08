import unittest
from datetime import datetime

from summit.partitioning.router import CategoryRouter, TimeRangeRouter
from summit.partitioning.shard_plan import ShardPlan


class TestRouters(unittest.TestCase):
    def test_time_range_router_month(self):
        router = TimeRangeRouter(granularity="month")

        # Test single month
        plan = ShardPlan(time_start="2023-01-01T00:00:00", time_end="2023-01-31T23:59:59", cross_shard_allowed=True, max_shards=5)
        shards = router.select_graph_shards(plan)
        self.assertEqual(shards, ["shard-2023-01"])

        # Test cross month
        plan = ShardPlan(time_start="2023-01-15T00:00:00", time_end="2023-03-10T00:00:00", cross_shard_allowed=True, max_shards=5)
        shards = router.select_graph_shards(plan)
        self.assertEqual(shards, ["shard-2023-01", "shard-2023-02", "shard-2023-03"])

        # Test max shards
        plan = ShardPlan(time_start="2023-01-01T00:00:00", time_end="2023-05-01T00:00:00", cross_shard_allowed=True, max_shards=2)
        shards = router.select_graph_shards(plan)
        self.assertEqual(len(shards), 2)
        self.assertEqual(shards, ["shard-2023-01", "shard-2023-02"])

    def test_time_range_router_year(self):
        router = TimeRangeRouter(granularity="year")

        plan = ShardPlan(time_start="2020-01-01", time_end="2022-12-31", cross_shard_allowed=True, max_shards=5)
        shards = router.select_graph_shards(plan)
        self.assertEqual(shards, ["shard-2020", "shard-2021", "shard-2022"])

    def test_category_router(self):
        router = CategoryRouter(mapping={"users": "shard-users", "admin": "shard-admin"})

        plan = ShardPlan(entity_domain="users")
        shards = router.select_graph_shards(plan)
        self.assertEqual(shards, ["shard-users"])

        plan = ShardPlan(entity_domain="unknown")
        shards = router.select_graph_shards(plan)
        self.assertEqual(shards, ["shard-misc"])

if __name__ == '__main__':
    unittest.main()

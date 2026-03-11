import hashlib
from abc import ABC, abstractmethod
from datetime import datetime
from typing import List

from .shard_plan import ShardPlan


class ShardRouter(ABC):
    @abstractmethod
    def select_graph_shards(self, plan: ShardPlan) -> list[str]:
        """Return ordered shard IDs. Must enforce max_shards and cross_shard_allowed."""
        raise NotImplementedError

class NoopRouter(ShardRouter):
    def select_graph_shards(self, plan: ShardPlan) -> list[str]:
        # Noop router always returns 'default' shard
        return ["default"]

class ConsistentHashRouter(ShardRouter):
    def select_graph_shards(self, plan: ShardPlan) -> list[str]:
        """
        Selects shards based on consistent hashing of the entity domain or region.
        """
        # Determine the key to hash. Priority: entity_domain > region > 'default'
        key = plan.entity_domain or plan.region or "default"

        # Ensure max_shards is at least 1
        max_shards = max(1, plan.max_shards)

        # Use MD5 for deterministic hashing
        hash_val = int(hashlib.md5(key.encode('utf-8')).hexdigest(), 16)

        shard_index = hash_val % max_shards
        primary_shard = f"shard-{shard_index}"

        return [primary_shard]

class CategoryRouter(ShardRouter):
    def __init__(self, mapping: dict[str, str]):
        self.mapping = mapping

    def select_graph_shards(self, plan: ShardPlan) -> list[str]:
        domain = plan.entity_domain
        if domain in self.mapping:
            return [self.mapping[domain]]
        return ["shard-misc"]

class TimeRangeRouter(ShardRouter):
    def __init__(self, granularity: str):
        self.granularity = granularity

    def select_graph_shards(self, plan: ShardPlan) -> list[str]:
        if not plan.time_start or not plan.time_end:
            return ["shard-default"]

        try:
            # Handle timestamps with potential 'T' or timezone offsets
            # For testing and basic cases, parse the first 10 chars (YYYY-MM-DD)
            start_date = datetime.strptime(plan.time_start[:10], "%Y-%m-%d")
            end_date = datetime.strptime(plan.time_end[:10], "%Y-%m-%d")
        except ValueError:
            return ["shard-default"]

        shards = []
        if self.granularity == "month":
            curr_year = start_date.year
            curr_month = start_date.month

            while True:
                shard_name = f"shard-{curr_year}-{curr_month:02d}"
                shards.append(shard_name)

                if curr_year == end_date.year and curr_month == end_date.month:
                    break

                curr_month += 1
                if curr_month > 12:
                    curr_month = 1
                    curr_year += 1

        elif self.granularity == "year":
            curr_year = start_date.year
            while curr_year <= end_date.year:
                shards.append(f"shard-{curr_year}")
                curr_year += 1

        # Limit to max_shards
        if plan.max_shards > 0:
            shards = shards[:plan.max_shards]

        return shards

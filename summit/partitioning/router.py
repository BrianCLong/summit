import hashlib
from abc import ABC, abstractmethod
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

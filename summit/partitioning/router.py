from abc import ABC, abstractmethod
from typing import List
from .shard_plan import ShardPlan

class ShardRouter(ABC):
    @abstractmethod
    def select_graph_shards(self, plan: ShardPlan) -> List[str]:
        """Return ordered shard IDs. Must enforce max_shards and cross_shard_allowed."""
        raise NotImplementedError

class NoopRouter(ShardRouter):
    def select_graph_shards(self, plan: ShardPlan) -> List[str]:
        # Noop router always returns 'default' shard
        # It technically doesn't need to enforce max_shards if it returns 1,
        # but logically it respects the contract.
        return ["default"]

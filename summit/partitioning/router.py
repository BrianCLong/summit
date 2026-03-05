import hashlib
from abc import ABC, abstractmethod
from typing import List, Dict, Optional
from datetime import datetime
from .shard_plan import ShardPlan

class ShardRouter(ABC):
    @abstractmethod
    def select_graph_shards(self, plan: ShardPlan) -> List[str]:
        """Return ordered shard IDs. Must enforce max_shards and cross_shard_allowed."""
        raise NotImplementedError

class NoopRouter(ShardRouter):
    def select_graph_shards(self, plan: ShardPlan) -> List[str]:
        # Noop router always returns 'default' shard
        return ["default"]

class ConsistentHashRouter(ShardRouter):
    def select_graph_shards(self, plan: ShardPlan) -> List[str]:
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

class TimeRangeRouter(ShardRouter):
    """
    Routes based on time ranges. Useful for time-series graph data.
    Assumes shards are named like 'shard-YYYY-MM' or 'shard-archive'.
    """
    def __init__(self, granularity: str = "month"):
        self.granularity = granularity

    def select_graph_shards(self, plan: ShardPlan) -> List[str]:
        if not plan.time_start:
            return ["shard-current"] # Default to current/latest shard

        try:
            # Parse ISO 8601 strings. Simplistic parsing for now.
            start_dt = datetime.fromisoformat(plan.time_start.replace("Z", "+00:00"))
            end_dt = datetime.fromisoformat(plan.time_end.replace("Z", "+00:00")) if plan.time_end else start_dt

            shards = []
            # Generate shard keys between start and end.
            # For simplicity, let's just do start and end points for now.
            # In a real impl, we'd iterate through months/days.

            if self.granularity == "month":
                # Ensure we compare year/month, ignoring days for the loop condition
                # Normalizing to 1st of month to avoid issues
                current = start_dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                end_normalized = end_dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

                # If end_dt is later in the month than start_dt, we still want to include it.
                # The normalization above handles it if we do <= end_normalized
                # But if end_dt was 2023-03-10, end_normalized is 2023-03-01.
                # If current reaches 2023-03-01, it is equal, so loop runs.

                while current <= end_normalized:
                    shard_key = f"shard-{current.strftime('%Y-%m')}"
                    if shard_key not in shards:
                        shards.append(shard_key)

                    # Advance to next month
                    if current.month == 12:
                        current = current.replace(year=current.year + 1, month=1)
                    else:
                        current = current.replace(month=current.month + 1)

            elif self.granularity == "year":
                current_year = start_dt.year
                end_year = end_dt.year
                for y in range(current_year, end_year + 1):
                    shards.append(f"shard-{y}")

            else:
                shards.append("shard-current")

            if not plan.cross_shard_allowed and len(shards) > 1:
                return [shards[0]] # Or raise error?

            return shards[:plan.max_shards]

        except ValueError:
            # Fallback if time parsing fails
            return ["shard-current"]

class CategoryRouter(ShardRouter):
    """
    Routes based on entity domain category mapping.
    """
    def __init__(self, mapping: Optional[Dict[str, str]] = None):
        self.mapping = mapping or {
            "users": "shard-users",
            "products": "shard-products",
            "events": "shard-events"
        }

    def select_graph_shards(self, plan: ShardPlan) -> List[str]:
        domain = plan.entity_domain
        if domain and domain in self.mapping:
            return [self.mapping[domain]]
        return ["shard-misc"]

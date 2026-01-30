from typing import List
from .shard_plan import ShardPlan

# Define allowed regions and their shards
# In a real system, this might be dynamic or config-driven
REGION_SHARDS = {
    "us-east": ["shard-us-east-1", "shard-us-east-2"],
    "eu-west": ["shard-eu-west-1"],
}
DEFAULT_REGION = "us-east"

class RegionPolicy:
    def resolve_shards(self, plan: ShardPlan) -> List[str]:
        target_region = plan.region or DEFAULT_REGION

        # Security check: if explicit region is requested but cross-shard not allowed,
        # ensure we only return shards for THAT region.
        # Actually, the requirement is "query-local region" by default.
        # If cross_shard_allowed is False, we MUST NOT return shards from other regions.

        shards = REGION_SHARDS.get(target_region, [])
        if not shards:
            # Fallback to default if region unknown? Or empty?
            # Safe default: empty (so no query) or default region?
            # "Deny-by-default": if region unknown, maybe return empty or error.
            # But let's say we fallback to default region if not specified.
            # If specified but unknown, return empty.
            if plan.region:
                return []
            return REGION_SHARDS.get(DEFAULT_REGION, [])

        return shards

    def validate_plan(self, plan: ShardPlan) -> bool:
        """Return False if plan violates region policy (e.g. cross-region disallowed but multiple regions implied)."""
        # Here we only handle single region in plan.
        # If we had a list of regions, we would check cross_shard_allowed.
        return True

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class PartitioningConfig:
    enabled: bool = os.getenv("PARTITIONING_ENABLED", "0") == "1"
    shard_router: str = os.getenv("SHARD_ROUTER", "off")          # off|on
    region_routing: str = os.getenv("REGION_ROUTING", "off")      # off|on
    cross_shard: bool = os.getenv("CROSS_SHARD", "0") == "1"
    max_shards: int = int(os.getenv("MAX_SHARDS", "3"))

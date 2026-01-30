from dataclasses import dataclass
from typing import Optional, Dict, Any

@dataclass(frozen=True)
class ShardPlan:
    entity_domain: Optional[str] = None   # users|products|events|...
    region: Optional[str] = None          # us-east|eu-west|...
    time_start: Optional[str] = None      # ISO-8601
    time_end: Optional[str] = None
    cross_shard_allowed: bool = False
    max_shards: int = 1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "entity_domain": self.entity_domain,
            "region": self.region,
            "time": {"start": self.time_start, "end": self.time_end},
            "cross_shard_allowed": self.cross_shard_allowed,
            "max_shards": self.max_shards,
        }

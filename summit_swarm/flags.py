import os
from dataclasses import dataclass


@dataclass(frozen=True)
class SwarmFlags:
    enabled: bool = os.getenv("SUMMIT_SWARM_ENABLED", "0") == "1"
    lane2_enabled: bool = os.getenv("SUMMIT_SWARM_LANE2_ENABLED", "0") == "1"
    max_agents: int = int(os.getenv("SUMMIT_SWARM_MAX_AGENTS", "4"))

FLAGS = SwarmFlags()

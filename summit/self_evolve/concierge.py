from collections import OrderedDict
from typing import List, Dict, Any, Optional
from summit_harness.subagents import SubagentRegistry, SubagentSpec

class ConciergeRouter:
    """
    Selects/hires sub-agents from registry; includes LRU eviction.
    Inspired by Adaptive Orchestration (arXiv:2601.09742).
    """
    def __init__(self, registry: SubagentRegistry, max_active_agents: int = 4):
        self.registry = registry
        self.max_active_agents = max_active_agents
        self.active_agents = OrderedDict()

    def hire_specialist(self, name: str) -> SubagentSpec:
        spec = self.registry.get(name)

        # LRU eviction
        if name in self.active_agents:
            self.active_agents.move_to_end(name)
        else:
            if len(self.active_agents) >= self.max_active_agents:
                evicted_name, _ = self.active_agents.popitem(last=False)
                # print(f"Evicted agent: {evicted_name}")
            self.active_agents[name] = spec

        return spec

    def get_active_agents(self) -> List[str]:
        return list(self.active_agents.keys())

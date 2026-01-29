from dataclasses import dataclass, field
import random
from typing import List

@dataclass
class Agent:
  agent_id: str
  memory: List[str] = field(default_factory=list)

def run_sandbox(n_agents: int = 10, steps: int = 50, seed: int = 7) -> List[Agent]:
  random.seed(seed)
  agents = [Agent(agent_id=f"a{i}") for i in range(n_agents)]
  # TODO: integrate Summit model interface behind MULTI_AGENT_SANDBOX flag
  # For now, simulate divergence by different message histories.
  for t in range(steps):
    a = random.choice(agents)
    a.memory.append(f"t{t}:msg:{random.randint(0,999)}")
  return agents

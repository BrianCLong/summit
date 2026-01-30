from typing import Any, Dict, Optional

from summit_sim.agents.agent_spec import AgentSpec
from summit_sim.agents.memory import Memory
from summit_sim.agents.policy import Policy


class StateMachineRunner:
    def __init__(self, agent_spec: AgentSpec, policy: Policy, memory: Memory):
        self.agent_spec = agent_spec
        self.policy = policy
        self.memory = memory
        self.state = "INITIAL"
        self.steps = 0

    def step(self, context: dict[str, Any]) -> Any:
        self.steps += 1
        # Simple transition logic for now
        decision = self.policy.decide(context)
        return decision

from typing import Any, Dict, List

from summit_sim.agents.agent_spec import AgentSpec
from summit_sim.agents.config import SimConfig


class ConversationABM:
    def __init__(self, agents: list[AgentSpec]):
        self.agents = agents
        self.conversation_history = []

    def run_step(self):
        # Macro-micro scaffold
        # For each agent, generate prompt (micro) based on history (macro)
        for agent in self.agents:
            if SimConfig.use_interventions():
                # Apply framing toggle logic here if enabled
                pass

            # Simple deterministic output for now
            response = f"{agent.role} says: I agree."
            self.conversation_history.append({"agent_id": agent.id, "text": response})

        return self.conversation_history

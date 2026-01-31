import json

from summit_sim.agents.agent_spec import AgentSpec
from summit_sim.scenarios.conversation_abm import ConversationABM
from summit_sim.scenarios.prompting import PromptBuilder


def test_scenario_smoke():
    agent1 = AgentSpec(id="a1", role="User", traits=["Happy"])
    agent2 = AgentSpec(id="a2", role="Bot", traits=["Helpful"])

    abm = ConversationABM([agent1, agent2])
    history = abm.run_step()

    assert len(history) == 2
    assert history[0]["agent_id"] == "a1"
    assert "User says" in history[0]["text"]

def test_prompt_builder():
    history = [{"agent_id": "a1", "text": "Hello"}]
    prompt = PromptBuilder.build_prompt("Bot", history)
    assert "You are a Bot" in prompt
    assert "a1: Hello" in prompt

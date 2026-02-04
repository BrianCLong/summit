from summit.integrations.palantir import SummitGraphSchema, SummitTool
from summit.integrations.palantir_aip import OntologyAwareAgent, CognitiveLoop
from summit.tools.risk import ToolRisk

def test_cognitive_loop_critic():
    schema = SummitGraphSchema(nodes=[], edges=[])
    tools = [
        SummitTool("delete_person", "Delete", ToolRisk.HIGH, {})
    ]
    agent = OntologyAwareAgent(schema, tools, "007")
    loop = CognitiveLoop(agent)

    # Prompt implies deletion
    # Planner generates a delete plan
    # Critic checks reasoning length. "User asked to delete" is > 10 chars?
    # "User asked to delete" length is 20 -> Pass

    res = loop.run_loop("Please delete person p1")
    # Should result in execution (which fails due to missing approval token in policy layer, but loop runs)
    assert "Action Denied" in res or "Action Complete" in res

    # Check rejection logic logic would require mocking planner to output short reasoning
    # But this confirms the wiring

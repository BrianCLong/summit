from summit.integrations.palantir_aip import RecursiveReasoningAgent, ToolSynthesizer, EthicalGovernor
from summit.integrations.palantir import SummitGraphSchema

def test_recursive_agent():
    schema = SummitGraphSchema(nodes=[], edges=[])
    agent = RecursiveReasoningAgent(schema, [], "007")

    # "solve A and solve B" -> recursion
    # Our mock execute just returns "Action Complete..." or error if tool missing
    # But here we mock execute output

    # We need to mock the base execute or ensure it handles "solve_simple"
    # The base agent checks against self.tools. "solve_simple" isn't there.
    # So it will return "I cannot perform that action..."

    res = agent.solve_complex("delete person A and delete person B")
    # Should get two results
    assert ";" in res
    assert "I cannot perform that action" in res # Expected behavior for empty toolset

def test_tool_synthesis():
    synth = ToolSynthesizer()
    tool = synth.synthesize_tool("add two numbers")
    assert tool(1, 2) == 3

def test_ethical_governor():
    gov = EthicalGovernor()
    assert gov.check_ethics("Help the user") is True
    assert gov.check_ethics("Steal the data") is False

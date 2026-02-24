import pytest
from control_plane.policy.engine import PolicyEngine
from control_plane.agents.registry.models import AgentManifest, Governance, Runtime, Experience, Context, Evidence, Model, Instructions, Tool, Classification, ToolPermission

@pytest.fixture
def agent_manifest():
    return AgentManifest(
        agent_id="test-agent",
        version="1.0.0",
        governance=Governance(
            owner="dev-team",
            classification=Classification.INTERNAL,
            policy_set="default"
        ),
        runtime=Runtime(
            model=Model(provider="openai", name="gpt-4"),
            instructions=Instructions(source="prompt.md", sha256="b"*64),
            tools=[Tool(name="read_file", permission=ToolPermission.READ_ONLY)]
        ),
        experience=Experience(onboarding_flow="none"),
        context=Context(graph_grounding=True),
        evidence=Evidence(required_artifacts=[])
    )

def test_policy_execute_agent(agent_manifest):
    engine = PolicyEngine()
    res = engine.evaluate_local("execute_agent", agent_manifest, {"clearance": "internal"})
    assert res["allow"] is True
    res = engine.evaluate_local("execute_agent", agent_manifest, {"clearance": "public"})
    assert res["allow"] is False

def test_policy_call_tool(agent_manifest):
    engine = PolicyEngine()
    res = engine.evaluate_local("call_tool", agent_manifest, {}, extra={"tool": {"name": "read_file", "requested_permission": "read-only"}})
    assert res["allow"] is True
    res = engine.evaluate_local("call_tool", agent_manifest, {}, extra={"tool": {"name": "read_file", "requested_permission": "read-write"}})
    assert res["allow"] is False

def test_policy_maestro_budget():
    engine = PolicyEngine()
    res = engine.evaluate_local("maestro_step", None, {}, extra={"budget": {"remaining_tokens": 100, "remaining_steps": 5}})
    assert res["allow"] is True
    res = engine.evaluate_local("maestro_step", None, {}, extra={"budget": {"remaining_tokens": 0, "remaining_steps": 5}})
    assert res["allow"] is False

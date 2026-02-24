import pytest
import os
import shutil
from control_plane.agents.registry.models import (
    AgentManifest, Governance, Runtime, Experience, Context, Evidence,
    Model, Instructions, Tool, Classification, RiskLevel,
    ToolPermission, ReplayMode, LogLevel
)
from control_plane.agents.registry.storage import FileRegistryStorage
from control_plane.agents.registry.registry import AgentRegistry

@pytest.fixture
def temp_storage_dir():
    dir_path = "tests/temp_registry_v2"
    os.makedirs(dir_path, exist_ok=True)
    yield dir_path
    if os.path.exists(dir_path):
        shutil.rmtree(dir_path)

def test_registry_lifecycle(temp_storage_dir):
    storage = FileRegistryStorage(temp_storage_dir)
    registry = AgentRegistry(storage)

    manifest = AgentManifest(
        agent_id="frontier-coder",
        version="1.0.0",
        governance=Governance(
            owner="infra-team",
            classification=Classification.INTERNAL,
            policy_set="standard-agent-v1"
        ),
        runtime=Runtime(
            model=Model(provider="openai", name="gpt-5.3-codex", parameters={"effort": "high"}),
            instructions=Instructions(source="prompts/coder.md", sha256="a" * 64),
            tools=[Tool(name="bash", permission=ToolPermission.READ_WRITE)]
        ),
        experience=Experience(onboarding_flow="developer-onboarding"),
        context=Context(graph_grounding=True),
        evidence=Evidence(required_artifacts=["trace", "decision_log"])
    )

    registry.register_agent(manifest)

    loaded = registry.get_agent("frontier-coder")
    assert loaded.agent_id == "frontier-coder"
    assert loaded.runtime.model.name == "gpt-5.3-codex"
    assert loaded.runtime.model.parameters.effort == "high"

    agents = registry.list_agents()
    assert "frontier-coder" in agents

    registry.deactivate_agent("frontier-coder")
    assert "frontier-coder" not in registry.list_agents()

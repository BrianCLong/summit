import pytest
from unittest.mock import patch, MagicMock
from summit.registry.service import RegistryService, AgentDefinition, RegistryDocument, RiskTier

@pytest.fixture
def mock_registry_doc():
    return RegistryDocument(
        version="1.0",
        capabilities=[],
        agents=[
            AgentDefinition(id="agent-1", name="Agent 1", owner="user", risk_tier=RiskTier.LOW, version="1.0", updated_at="2023-01-01")
        ]
    )

def test_create_agent(mock_registry_doc):
    with patch("summit.registry.service.load_registry", return_value=mock_registry_doc) as mock_load,          patch("summit.registry.service.save_registry") as mock_save,          patch("summit.registry.service.emit") as mock_emit,          patch("summit.registry.service.os.makedirs"):

        service = RegistryService()
        new_agent = AgentDefinition(id="agent-2", name="Agent 2", owner="user", risk_tier=RiskTier.HIGH, version="1.0", updated_at="now")

        service.create_agent(new_agent)

        mock_load.assert_called()
        mock_save.assert_called()
        args, _ = mock_save.call_args
        saved_doc = args[1]
        assert len(saved_doc.agents) == 2
        assert saved_doc.agents[1].id == "agent-2"
        mock_emit.assert_called()

def test_create_agent_duplicate(mock_registry_doc):
    with patch("summit.registry.service.load_registry", return_value=mock_registry_doc):
        service = RegistryService()
        dup_agent = AgentDefinition(id="agent-1", name="Duplicate Agent", owner="user", risk_tier=RiskTier.LOW, version="1.0", updated_at="now")

        with pytest.raises(ValueError):
            service.create_agent(dup_agent)

def test_get_agent(mock_registry_doc):
    with patch("summit.registry.service.load_registry", return_value=mock_registry_doc):
        service = RegistryService()
        agent = service.get_agent("agent-1")
        assert agent.id == "agent-1"

        agent_none = service.get_agent("non-existent")
        assert agent_none is None

def test_update_agent(mock_registry_doc):
    with patch("summit.registry.service.load_registry", return_value=mock_registry_doc) as mock_load,          patch("summit.registry.service.save_registry") as mock_save,          patch("summit.registry.service.emit") as mock_emit:

        service = RegistryService()
        updated = service.update_agent("agent-1", {"name": "Updated Agent 1"})

        assert updated.name == "Updated Agent 1"
        mock_save.assert_called()
        args, _ = mock_save.call_args
        saved_doc = args[1]
        assert saved_doc.agents[0].name == "Updated Agent 1"

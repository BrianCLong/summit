import pytest
from unittest.mock import MagicMock, patch
from summit.registry.service import RegistryService, AgentDefinition, RegistryDocument, RiskTier

@pytest.fixture
def mock_registry_doc():
    return RegistryDocument(
        version="1.0",
        capabilities=[],
        agents=[
            AgentDefinition(id="agent1", name="Agent One", owner="owner1", risk_tier=RiskTier.LOW, version="1.0", updated_at="2024-01-01"),
            AgentDefinition(id="agent2", name="Agent Two", owner="owner2", risk_tier=RiskTier.HIGH, version="1.0", updated_at="2024-01-01")
        ]
    )

def test_registry_service_list_agents(mock_registry_doc):
    with patch("summit.registry.service.load_registry", return_value=mock_registry_doc):
        # We need to mock os.makedirs to avoid file permission issues
        with patch("os.makedirs"):
            service = RegistryService()
            agents = service.list_agents()
            assert len(agents) == 2
            assert agents[0].id == "agent1"

def test_registry_service_get_agent(mock_registry_doc):
    with patch("summit.registry.service.load_registry", return_value=mock_registry_doc), \
         patch("os.makedirs"):
        service = RegistryService()
        agent = service.get_agent("agent2")
        assert agent is not None
        assert agent.name == "Agent Two"

        agent_none = service.get_agent("non_existent")
        assert agent_none is None

def test_registry_service_create_agent(mock_registry_doc):
    with patch("summit.registry.service.load_registry", return_value=mock_registry_doc), \
         patch("summit.registry.service.save_registry") as mock_save, \
         patch("summit.registry.service.emit"), \
         patch("os.makedirs"):

        service = RegistryService()
        new_agent = AgentDefinition(id="agent3", name="Agent Three", owner="owner3", risk_tier=RiskTier.MEDIUM, version="1.0", updated_at="2024-01-02")

        service.create_agent(new_agent)

        mock_save.assert_called_once()
        args, _ = mock_save.call_args
        saved_doc = args[1]
        assert len(saved_doc.agents) == 3
        assert saved_doc.agents[2].id == "agent3"

def test_registry_service_create_agent_duplicate(mock_registry_doc):
    with patch("summit.registry.service.load_registry", return_value=mock_registry_doc), \
         patch("os.makedirs"):
        service = RegistryService()
        # id "agent1" already exists
        duplicate_agent = AgentDefinition(id="agent1", name="Duplicate", owner="owner1", risk_tier=RiskTier.LOW, version="1.0", updated_at="2024-01-01")

        with pytest.raises(ValueError):
            service.create_agent(duplicate_agent)

def test_registry_service_update_agent(mock_registry_doc):
    with patch("summit.registry.service.load_registry", return_value=mock_registry_doc), \
         patch("summit.registry.service.save_registry") as mock_save, \
         patch("summit.registry.service.emit"), \
         patch("os.makedirs"):

        service = RegistryService()
        updated = service.update_agent("agent1", {"name": "Updated Name"})

        assert updated.name == "Updated Name"
        mock_save.assert_called_once()
        args, _ = mock_save.call_args
        saved_doc = args[1]
        assert saved_doc.agents[0].name == "Updated Name"

def test_registry_service_update_agent_not_found(mock_registry_doc):
    with patch("summit.registry.service.load_registry", return_value=mock_registry_doc), \
         patch("os.makedirs"):
        service = RegistryService()
        result = service.update_agent("non_existent", {"name": "New Name"})
        assert result is None

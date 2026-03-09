import pytest
import datetime
from unittest.mock import patch, MagicMock
from summit.registry.service import RegistryService
from summit.registry.model import AgentDefinition, RegistryDocument, RiskTier

@pytest.fixture
def mock_store():
    # We patch at the place where RegistryService imports them or uses them
    with patch("summit.registry.service.load_registry") as mock_load, \
         patch("summit.registry.service.save_registry") as mock_save, \
         patch("summit.registry.service.emit") as mock_emit:
        yield mock_load, mock_save, mock_emit

def test_create_agent(mock_store):
    mock_load, mock_save, mock_emit = mock_store

    # Mock initial empty registry
    mock_load.return_value = RegistryDocument(version="1.0", capabilities=[], agents=[])

    service = RegistryService(registry_path="/tmp/registry.json")

    agent_def = AgentDefinition(
        id="agent-1",
        name="Test Agent",
        owner="test-owner",
        risk_tier=RiskTier.LOW,
        version="1.0.0",
        updated_at=datetime.datetime.now().isoformat()
    )

    result = service.create_agent(agent_def)

    assert result == agent_def
    mock_save.assert_called_once()
    mock_emit.assert_called_once()

def test_get_agent(mock_store):
    mock_load, _, _ = mock_store

    agent_def = AgentDefinition(
        id="agent-1",
        name="Test Agent",
        owner="test-owner",
        risk_tier=RiskTier.LOW,
        version="1.0.0",
        updated_at=datetime.datetime.now().isoformat()
    )

    mock_load.return_value = RegistryDocument(version="1.0", capabilities=[], agents=[agent_def])

    service = RegistryService(registry_path="/tmp/registry.json")

    result = service.get_agent("agent-1")
    assert result == agent_def

    # Check that it returns None for non-existent agent
    # We need to simulate loading again or assume it loads every time
    # Service implementation calls _load() every time which calls load_registry()
    # So we can change return value if needed, but here we just check non-existent ID

    result_none = service.get_agent("non-existent")
    assert result_none is None

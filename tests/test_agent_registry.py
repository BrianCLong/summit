import pytest
import os
from summit.registry.model import AgentDefinition, RiskTier
from summit.registry.service import RegistryService
from summit.governance.audit import AuditEvent
from unittest.mock import patch, MagicMock

@pytest.fixture
def tmp_registry_path(tmp_path):
    return str(tmp_path / "registry.json")

@pytest.fixture
def registry_service(tmp_registry_path):
    return RegistryService(registry_path=tmp_registry_path)

@pytest.fixture(autouse=True)
def mock_emit():
    with patch('summit.registry.service.emit') as mock:
        yield mock

def test_create_agent(registry_service, mock_emit):
    agent = AgentDefinition(
        id="agent-001",
        name="Test Agent",
        owner="user",
        risk_tier=RiskTier.LOW,
        version="1.0",
        updated_at="2023-01-01"
    )
    result = registry_service.create_agent(agent)
    assert result.id == "agent-001"
    assert mock_emit.called
    args, _ = mock_emit.call_args
    event = args[0]
    assert event.event_type == "agent_registered"
    assert event.metadata["id"] == "agent-001"

    # Verify persistence
    doc = registry_service._load()
    assert len(doc.agents) == 1
    assert doc.agents[0].id == "agent-001"
    assert doc.agents[0].risk_tier == RiskTier.LOW

def test_get_agent(registry_service):
    agent = AgentDefinition(
        id="agent-002",
        name="Test Agent 2",
        owner="user",
        risk_tier=RiskTier.MEDIUM,
        version="1.0",
        updated_at="2023-01-01"
    )
    registry_service.create_agent(agent)
    fetched = registry_service.get_agent("agent-002")
    assert fetched is not None
    assert fetched.name == "Test Agent 2"
    assert fetched.risk_tier == RiskTier.MEDIUM

def test_update_agent(registry_service, mock_emit):
    agent = AgentDefinition(
        id="agent-003",
        name="Update Me",
        owner="user",
        risk_tier=RiskTier.LOW,
        version="1.0",
        updated_at="2023-01-01"
    )
    registry_service.create_agent(agent)

    mock_emit.reset_mock() # Reset after create call

    updated = registry_service.update_agent("agent-003", {"risk_tier": "high", "name": "Updated Name"})
    assert updated.risk_tier == RiskTier.HIGH
    assert updated.name == "Updated Name"
    assert updated.updated_at != "2023-01-01"

    assert mock_emit.called
    args, _ = mock_emit.call_args
    event = args[0]
    assert event.event_type == "agent_updated"

def test_list_agents(registry_service):
    registry_service.create_agent(AgentDefinition(
        id="a1", name="A1", owner="u1", risk_tier=RiskTier.LOW, version="1", updated_at=""
    ))
    registry_service.create_agent(AgentDefinition(
        id="a2", name="A2", owner="u2", risk_tier=RiskTier.HIGH, version="1", updated_at=""
    ))

    all_agents = registry_service.list_agents()
    assert len(all_agents) == 2

    high_risk = registry_service.list_agents(filters={"risk_tier": RiskTier.HIGH})
    assert len(high_risk) == 1
    assert high_risk[0].id == "a2"

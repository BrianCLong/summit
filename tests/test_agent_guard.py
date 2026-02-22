import pytest
from unittest.mock import MagicMock
from summit.registry.model import AgentDefinition, RiskTier
from summit.registry.service import RegistryService
from summit.governance.guards import AgentGuard

@pytest.fixture
def mock_registry_service():
    service = MagicMock(spec=RegistryService)
    return service

@pytest.fixture
def guard(mock_registry_service):
    return AgentGuard(registry_service=mock_registry_service)

def test_guard_allow_low_risk(guard, mock_registry_service):
    mock_registry_service.get_agent.return_value = AgentDefinition(
        id="low-risk", name="Low", owner="u", risk_tier=RiskTier.LOW, version="1", updated_at=""
    )
    guard.check_allowed("low-risk", {})

def test_guard_deny_unknown_agent(guard, mock_registry_service):
    mock_registry_service.get_agent.return_value = None
    with pytest.raises(PermissionError, match="not found"):
        guard.check_allowed("unknown", {})

def test_guard_deny_deprecated(guard, mock_registry_service):
    mock_registry_service.get_agent.return_value = AgentDefinition(
        id="dep", name="Dep", owner="u", risk_tier=RiskTier.LOW, version="1", updated_at="", deprecated=True
    )
    with pytest.raises(PermissionError, match="deprecated"):
        guard.check_allowed("dep", {})

def test_guard_deny_high_risk_no_token(guard, mock_registry_service):
    mock_registry_service.get_agent.return_value = AgentDefinition(
        id="high", name="High", owner="u", risk_tier=RiskTier.HIGH, version="1", updated_at=""
    )
    with pytest.raises(PermissionError, match="requires 'approval_token'"):
        guard.check_allowed("high", {})

def test_guard_allow_high_risk_with_token(guard, mock_registry_service):
    mock_registry_service.get_agent.return_value = AgentDefinition(
        id="high", name="High", owner="u", risk_tier=RiskTier.HIGH, version="1", updated_at=""
    )
    guard.check_allowed("high", {"approval_token": "valid"})

def test_guard_deny_financial_domain(guard, mock_registry_service):
    mock_registry_service.get_agent.return_value = AgentDefinition(
        id="fin", name="Fin", owner="u", risk_tier=RiskTier.LOW, version="1", updated_at="",
        data_domains=["financial"]
    )
    with pytest.raises(PermissionError, match="requires financial access"):
        guard.check_allowed("fin", {})

def test_guard_allow_financial_domain(guard, mock_registry_service):
    mock_registry_service.get_agent.return_value = AgentDefinition(
        id="fin", name="Fin", owner="u", risk_tier=RiskTier.LOW, version="1", updated_at="",
        data_domains=["financial"]
    )
    guard.check_allowed("fin", {"financial_access": True})

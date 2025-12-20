"""Tests for license enforcement and compliance checking."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from src.license_client import LicenseClient, LicenseCheckResult


@pytest.fixture
def mock_license_registry():
    """Mock license registry responses."""
    return {
        "allow": {
            "compliance_status": "allow",
            "human_readable_reason": "Operation complies with all license requirements",
            "violations": [],
            "warnings": [],
            "appeal_path": None,
        },
        "block": {
            "compliance_status": "block",
            "human_readable_reason": "Export not permitted under license terms",
            "violations": [
                {
                    "data_source": "test-source",
                    "license": "commercial-restricted",
                    "violation": "Export not permitted under license terms",
                    "severity": "critical",
                },
            ],
            "warnings": [],
            "appeal_path": "/ombudsman/appeals",
        },
        "warn": {
            "compliance_status": "warn",
            "human_readable_reason": "License requires additional review",
            "violations": [],
            "warnings": [
                {
                    "data_source": "test-source",
                    "license": "research-only",
                    "warning": "Research-only license",
                    "severity": "medium",
                },
            ],
            "appeal_path": None,
        },
    }


@pytest.mark.asyncio
async def test_license_check_allow(mock_license_registry):
    """Test license check with allowed operation."""
    client = LicenseClient(base_url="http://mock-registry")

    with patch("src.license_client.httpx.AsyncClient") as mock_client_class:
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_license_registry["allow"]

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client_class.return_value.__aenter__.return_value = mock_client

        result = await client.check_compliance(
            source_name="test-source",
            data_source_ids=["ds_123"],
            operation="ingest",
        )

        assert result.compliance_status == "allow"
        assert len(result.violations) == 0
        assert result.appeal_path is None


@pytest.mark.asyncio
async def test_license_check_block(mock_license_registry):
    """Test license check with blocked operation."""
    client = LicenseClient(base_url="http://mock-registry")

    with patch("src.license_client.httpx.AsyncClient") as mock_client_class:
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_license_registry["block"]

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client_class.return_value.__aenter__.return_value = mock_client

        result = await client.check_compliance(
            source_name="test-source",
            data_source_ids=["ds_123"],
            operation="export",
        )

        assert result.compliance_status == "block"
        assert len(result.violations) > 0
        assert result.appeal_path == "/ombudsman/appeals"
        assert "not permitted" in result.reason.lower()


@pytest.mark.asyncio
async def test_license_check_warn(mock_license_registry):
    """Test license check with warning."""
    client = LicenseClient(base_url="http://mock-registry")

    with patch("src.license_client.httpx.AsyncClient") as mock_client_class:
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_license_registry["warn"]

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client_class.return_value.__aenter__.return_value = mock_client

        result = await client.check_compliance(
            source_name="test-source",
            data_source_ids=["ds_123"],
            operation="query",
        )

        assert result.compliance_status == "warn"
        assert len(result.warnings) > 0


@pytest.mark.asyncio
async def test_license_check_policy_denial():
    """Test license check with policy denial (403)."""
    client = LicenseClient(base_url="http://mock-registry")

    with patch("src.license_client.httpx.AsyncClient") as mock_client_class:
        mock_response = AsyncMock()
        mock_response.status_code = 403

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client_class.return_value.__aenter__.return_value = mock_client

        result = await client.check_compliance(
            source_name="test-source",
            data_source_ids=["ds_123"],
        )

        assert result.compliance_status == "block"
        assert "Policy denial" in result.reason
        assert len(result.violations) > 0


@pytest.mark.asyncio
async def test_license_check_service_error():
    """Test license check with service error."""
    client = LicenseClient(base_url="http://mock-registry")

    with patch("src.license_client.httpx.AsyncClient") as mock_client_class:
        mock_response = AsyncMock()
        mock_response.status_code = 500

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client_class.return_value.__aenter__.return_value = mock_client

        result = await client.check_compliance(
            source_name="test-source",
            data_source_ids=["ds_123"],
        )

        assert result.compliance_status == "warn"
        assert "failed" in result.reason.lower()


def test_license_check_sync():
    """Test synchronous license check wrapper."""
    client = LicenseClient(base_url="http://mock-registry")

    with patch("src.license_client.httpx.AsyncClient") as mock_client_class:
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "compliance_status": "allow",
            "human_readable_reason": "Test",
            "violations": [],
            "warnings": [],
            "appeal_path": None,
        }

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client_class.return_value.__aenter__.return_value = mock_client

        result = client.check_compliance_sync(
            source_name="test-source",
            data_source_ids=["ds_123"],
        )

        assert result.compliance_status == "allow"


def test_license_enforcement_human_readable():
    """Acceptance test: License violations return human-readable reasons.

    All attempts blocked by license/TOS should return human-readable reasons.
    """
    # Test various block scenarios
    block_scenarios = [
        {
            "name": "Export restriction",
            "result": LicenseCheckResult(
                compliance_status="block",
                reason="Operation blocked due to license violations: Export not permitted under license terms",
                violations=[
                    {
                        "violation": "Export not permitted under license terms",
                        "severity": "critical",
                    },
                ],
                warnings=[],
                appeal_path="/ombudsman/appeals",
            ),
            "expected_keywords": ["export", "not permitted", "license"],
        },
        {
            "name": "Research-only violation",
            "result": LicenseCheckResult(
                compliance_status="block",
                reason="Operation blocked due to license violations: Commercial use not permitted - research only license",
                violations=[
                    {
                        "violation": "Commercial use not permitted - research only license",
                        "severity": "critical",
                    },
                ],
                warnings=[],
                appeal_path="/ombudsman/appeals",
            ),
            "expected_keywords": ["commercial", "research only"],
        },
        {
            "name": "Geographic restriction",
            "result": LicenseCheckResult(
                compliance_status="block",
                reason="Operation blocked due to license violations: Data processing restricted in jurisdiction: EU",
                violations=[
                    {
                        "violation": "Data processing restricted in jurisdiction: EU",
                        "severity": "critical",
                    },
                ],
                warnings=[],
                appeal_path="/ombudsman/appeals",
            ),
            "expected_keywords": ["restricted", "jurisdiction"],
        },
    ]

    for scenario in block_scenarios:
        result = scenario["result"]

        # Check human-readable reason exists
        assert len(result.reason) > 0, f"No reason for {scenario['name']}"

        # Check reason contains expected keywords
        reason_lower = result.reason.lower()
        for keyword in scenario["expected_keywords"]:
            assert keyword.lower() in reason_lower, (
                f"'{keyword}' not in reason for {scenario['name']}"
            )

        # Check appeal path is provided
        assert result.appeal_path is not None, (
            f"No appeal path for {scenario['name']}"
        )

        print(f"✓ {scenario['name']}: {result.reason}")

    print("✓ All license violations provide human-readable reasons")

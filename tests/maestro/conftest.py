"""Pytest fixtures for Maestro tests."""

import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import pytest
from fastapi.testclient import TestClient

from maestro.app import create_maestro_app
from maestro.storage import MaestroStore


@pytest.fixture
def maestro_store():
    """Create a fresh MaestroStore for each test."""
    return MaestroStore()


@pytest.fixture
def client():
    """Create a FastAPI test client with fresh storage."""
    app = create_maestro_app()
    return TestClient(app)


@pytest.fixture
def sample_run_data():
    """Sample run creation data."""
    return {
        "name": "Test Analysis Run",
        "owner": "analyst@example.com",
        "cost_estimate": 10.0,
        "related_entity_ids": ["entity-123", "entity-456"],
        "related_decision_ids": ["decision-789"],
        "metadata": {"project": "test-project"},
    }


@pytest.fixture
def sample_artifact_metadata():
    """Sample artifact metadata."""
    return {
        "sbom_present": True,
        "slsa_provenance_present": True,
        "risk_assessment_present": True,
        "additional_metadata": {"scanner": "trivy"},
    }

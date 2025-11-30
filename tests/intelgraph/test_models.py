"""Test domain models."""

import json
from datetime import datetime

import pytest

from core.models import (
    Claim,
    Decision,
    Entity,
    PolicyLegalBasis,
    PolicyOrigin,
    PolicySensitivity,
    Source,
)


def test_entity_creation():
    """Test basic entity creation."""
    entity = Entity(type="person", labels='["analyst", "verified"]')
    assert entity.type == "person"
    assert entity.labels == '["analyst", "verified"]'


def test_entity_timestamps():
    """Test entity has proper timestamps."""
    entity = Entity(type="organization", labels="[]")
    entity.created_at = datetime.utcnow()
    entity.updated_at = datetime.utcnow()

    assert isinstance(entity.created_at, datetime)
    assert isinstance(entity.updated_at, datetime)


def test_claim_creation():
    """Test basic claim creation."""
    claim = Claim(
        entity_id=1,
        predicate="located_in",
        value="San Francisco",
        source_ids="[1, 2]",
    )

    assert claim.entity_id == 1
    assert claim.predicate == "located_in"
    assert claim.value == "San Francisco"


def test_claim_policy_labels():
    """Test claim policy labels."""
    policy = {
        "origin": "confidential",
        "sensitivity": "high",
        "legal_basis": "legitimate_interests",
    }

    claim = Claim(
        entity_id=1,
        predicate="salary",
        value="150000",
        source_ids="[3]",
        policy_labels=json.dumps(policy),
    )

    parsed_policy = json.loads(claim.policy_labels)
    assert parsed_policy["origin"] == "confidential"
    assert parsed_policy["sensitivity"] == "high"


def test_decision_creation():
    """Test basic decision creation."""
    decision = Decision(
        title="Expand to new market",
        context="Market research shows opportunity",
        options='["Enter now", "Wait 6 months", "Skip market"]',
        decision="Enter now",
        reversible_flag=True,
        owners='["CEO", "CFO"]',
        checks='["Financial analysis", "Risk assessment"]',
        related_claim_ids="[1, 2, 3]",
    )

    assert decision.title == "Expand to new market"
    assert decision.reversible_flag is True


def test_decision_with_json_fields():
    """Test decision with properly structured JSON fields."""
    options = ["Option A", "Option B", "Option C"]
    owners = ["Alice", "Bob"]
    checks = ["Security review", "Legal approval"]
    claim_ids = [10, 20, 30]

    decision = Decision(
        title="Test Decision",
        context="Testing",
        options=json.dumps(options),
        decision="Option A",
        reversible_flag=False,
        owners=json.dumps(owners),
        checks=json.dumps(checks),
        related_claim_ids=json.dumps(claim_ids),
    )

    assert json.loads(decision.options) == options
    assert json.loads(decision.owners) == owners
    assert json.loads(decision.checks) == checks
    assert json.loads(decision.related_claim_ids) == claim_ids


def test_source_creation():
    """Test basic source creation."""
    source = Source(
        uri_or_hash="ipfs://Qm...",
        origin=PolicyOrigin.SECRET.value,
        sensitivity=PolicySensitivity.CRITICAL.value,
        legal_basis=PolicyLegalBasis.VITAL_INTERESTS.value,
    )

    assert source.uri_or_hash == "ipfs://Qm..."
    assert source.origin == "secret"
    assert source.sensitivity == "critical"
    assert source.legal_basis == "vital_interests"


def test_source_defaults():
    """Test source uses proper defaults."""
    source = Source(uri_or_hash="https://example.com/doc")

    assert source.origin == "public"
    assert source.sensitivity == "low"
    assert source.legal_basis == "consent"


def test_policy_enums():
    """Test policy enum values."""
    assert PolicyOrigin.PUBLIC.value == "public"
    assert PolicyOrigin.CONFIDENTIAL.value == "confidential"
    assert PolicyOrigin.SECRET.value == "secret"
    assert PolicyOrigin.TOP_SECRET.value == "top_secret"

    assert PolicySensitivity.LOW.value == "low"
    assert PolicySensitivity.MEDIUM.value == "medium"
    assert PolicySensitivity.HIGH.value == "high"
    assert PolicySensitivity.CRITICAL.value == "critical"

    assert PolicyLegalBasis.CONSENT.value == "consent"
    assert PolicyLegalBasis.CONTRACT.value == "contract"
    assert PolicyLegalBasis.LEGAL_OBLIGATION.value == "legal_obligation"

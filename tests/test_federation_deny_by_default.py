import pytest

from summit.federation.protocol import PrivacyMechanism
from summit.federation.validators import validate_update


def test_federation_validation_valid():
    data = {
        "participant_id": "P-01",
        "round_id": "R-01",
        "model_hash": "sha256:1234",
        "update_hash": "sha256:5678",
        "privacy_mechanism": "DP",
        "governance": {
            "classification": "CONFIDENTIAL",
            "retention_ttl_days": 7
        },
        "metrics": {"loss": 0.1}
    }
    validate_update(data)

def test_federation_validation_missing_privacy():
    data = {
        "participant_id": "P-01",
        "round_id": "R-01",
        "model_hash": "sha256:1234",
        "update_hash": "sha256:5678",
        # Missing privacy_mechanism
        "governance": {
            "classification": "CONFIDENTIAL",
            "retention_ttl_days": 7
        },
        "metrics": {"loss": 0.1}
    }
    with pytest.raises(ValueError):
        validate_update(data)

def test_federation_validation_raw_weights():
    data = {
        "participant_id": "P-01",
        "round_id": "R-01",
        "model_hash": "sha256:1234",
        "update_hash": "sha256:5678",
        "privacy_mechanism": "DP",
        "governance": {
            "classification": "CONFIDENTIAL",
            "retention_ttl_days": 7
        },
        "metrics": {"loss": 0.1},
        "weights": [0.1, 0.2] # Forbidden
    }
    with pytest.raises(ValueError, match="Raw payload fields"):
        validate_update(data)

def test_federation_validation_unknown_field():
    data = {
        "participant_id": "P-01",
        "round_id": "R-01",
        "model_hash": "sha256:1234",
        "update_hash": "sha256:5678",
        "privacy_mechanism": "DP",
        "governance": {
            "classification": "CONFIDENTIAL",
            "retention_ttl_days": 7
        },
        "metrics": {"loss": 0.1},
        "extra": "something"
    }
    with pytest.raises(ValueError, match="Unknown fields"):
        validate_update(data)

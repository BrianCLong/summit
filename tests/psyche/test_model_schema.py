import json
import os
from dataclasses import asdict

import jsonschema
import pytest

from summit.psyche.model import PsychographicSignal


# Helper to load schema
def load_signal_schema():
    path = "src/summit/psyche/schemas/psychographic_signal.schema.json"
    with open(path) as f:
        return json.load(f)

def test_signal_model_creation():
    sig = PsychographicSignal(
        subject_scope="cohort",
        signal_type="moral_foundations",
        value={"care": 0.8},
        uncertainty={"method": "dummy", "ci95": [0.7, 0.9]},
        provenance={"collection_basis": "public", "pii_status": "scrubbed", "consent_assertion": "N/A"},
        policy={"allowed_purposes": ["situational_awareness"]},
        pii_status=True
    )
    sig.validate()
    assert sig.subject_scope == "cohort"

def test_signal_model_denies_person_scope():
    sig = PsychographicSignal(
        subject_scope="person", # type: ignore
        signal_type="moral_foundations",
        value={"care": 0.8},
        uncertainty={"method": "dummy"},
        provenance={"collection_basis": "public", "pii_status": "scrubbed", "consent_assertion": "N/A"},
        policy={"allowed_purposes": ["situational_awareness"]},
        pii_status=True
    )
    with pytest.raises(ValueError, match="Person scope is not allowed"):
        sig.validate()

def test_signal_schema_validation():
    schema = load_signal_schema()
    valid_data = {
        "subject_scope": "cohort",
        "signal_type": "moral_foundations",
        "value": {"care": 0.8},
        "uncertainty": {"method": "dummy", "ci95": [0.7, 0.9]},
        "provenance": {"collection_basis": "public", "pii_status": "scrubbed", "consent_assertion": "N/A"},
        "policy": {"allowed_purposes": ["situational_awareness"]}
    }
    jsonschema.validate(instance=valid_data, schema=schema)

def test_signal_schema_rejects_invalid_scope():
    schema = load_signal_schema()
    invalid_data = {
        "subject_scope": "person", # Not allowed in enum
        "signal_type": "moral_foundations",
        "value": {},
        "uncertainty": {"method": "dummy"},
        "provenance": {"collection_basis": "public", "pii_status": "scrubbed"},
        "policy": {"allowed_purposes": []}
    }
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(instance=invalid_data, schema=schema)

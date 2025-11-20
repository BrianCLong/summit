"""Tests for schema inference and mapping suggestions."""

import json
import pytest
from pathlib import Path

from src.schema_inference import (
    SchemaInferenceEngine,
    CanonicalEntity,
    FieldType,
)


@pytest.fixture
def fixtures_path():
    """Path to test fixtures."""
    return Path(__file__).parent / "fixtures"


@pytest.fixture
def sample_person_data(fixtures_path):
    """Load sample person data fixture."""
    with open(fixtures_path / "sample_person_data.json") as f:
        return json.load(f)


@pytest.fixture
def sample_org_data(fixtures_path):
    """Load sample organization data fixture."""
    with open(fixtures_path / "sample_org_data.json") as f:
        return json.load(f)


@pytest.fixture
def expected_person_mappings(fixtures_path):
    """Load expected person mappings fixture."""
    with open(fixtures_path / "expected_person_mappings.json") as f:
        return json.load(f)


def test_schema_inference_person_data(sample_person_data, expected_person_mappings):
    """Test schema inference correctly identifies Person entity fields."""
    engine = SchemaInferenceEngine(min_confidence=0.7)
    result = engine.infer_schema(sample_person_data)

    # Check record count
    assert result.record_count == 3

    # Check fields were detected
    assert len(result.fields) == 7
    field_names = [f.name for f in result.fields]
    assert "first_name" in field_names
    assert "last_name" in field_names
    assert "email" in field_names
    assert "ssn" in field_names

    # Check type inference
    email_field = next(f for f in result.fields if f.name == "email")
    assert email_field.inferred_type == FieldType.EMAIL
    assert email_field.confidence >= 0.8

    phone_field = next(f for f in result.fields if f.name == "phone")
    assert phone_field.inferred_type == FieldType.PHONE

    dob_field = next(f for f in result.fields if f.name == "date_of_birth")
    assert dob_field.inferred_type == FieldType.DATE

    # Check mappings
    assert len(result.suggested_mappings) > 0

    # Verify Person entity mappings
    person_mappings = [
        m for m in result.suggested_mappings
        if m.canonical_entity == CanonicalEntity.PERSON
    ]
    assert len(person_mappings) >= 5  # At least first_name, last_name, email, phone, ssn

    # Check specific mappings
    first_name_mapping = next(
        (m for m in result.suggested_mappings if m.source_field == "first_name"),
        None,
    )
    assert first_name_mapping is not None
    assert first_name_mapping.canonical_entity == CanonicalEntity.PERSON
    assert first_name_mapping.canonical_property == "firstName"
    assert first_name_mapping.confidence >= 0.9

    # Check primary entity determination
    assert result.primary_entity == CanonicalEntity.PERSON


def test_schema_inference_org_data(sample_org_data):
    """Test schema inference correctly identifies Org entity fields."""
    engine = SchemaInferenceEngine(min_confidence=0.7)
    result = engine.infer_schema(sample_org_data)

    # Check record count
    assert result.record_count == 3

    # Check Organization mappings
    org_mappings = [
        m for m in result.suggested_mappings
        if m.canonical_entity == CanonicalEntity.ORG
    ]
    assert len(org_mappings) >= 1

    # Check company_name mapping
    company_mapping = next(
        (m for m in result.suggested_mappings if m.source_field == "company_name"),
        None,
    )
    assert company_mapping is not None
    assert company_mapping.canonical_entity == CanonicalEntity.ORG
    assert company_mapping.canonical_property == "name"

    # Check Location mappings for address fields
    location_mappings = [
        m for m in result.suggested_mappings
        if m.canonical_entity == CanonicalEntity.LOCATION
    ]
    assert len(location_mappings) >= 2  # city, state, country

    # Check primary entity
    # Should be Org since company_name is the strongest signal
    assert result.primary_entity == CanonicalEntity.ORG


def test_schema_inference_empty_data():
    """Test schema inference handles empty data gracefully."""
    engine = SchemaInferenceEngine()
    result = engine.infer_schema([])

    assert result.record_count == 0
    assert len(result.fields) == 0
    assert len(result.suggested_mappings) == 0
    assert result.primary_entity is None


def test_field_type_detection():
    """Test field type detection for various data types."""
    engine = SchemaInferenceEngine()

    # Email detection
    email_rows = [
        {"email": "user1@example.com"},
        {"email": "user2@example.com"},
        {"email": "user3@example.com"},
    ]
    result = engine.infer_schema(email_rows)
    email_field = result.fields[0]
    assert email_field.inferred_type == FieldType.EMAIL

    # Phone detection
    phone_rows = [
        {"phone": "+1-555-0123"},
        {"phone": "+1-555-0124"},
        {"phone": "+1-555-0125"},
    ]
    result = engine.infer_schema(phone_rows)
    phone_field = result.fields[0]
    assert phone_field.inferred_type == FieldType.PHONE

    # Integer detection
    int_rows = [
        {"count": 100},
        {"count": 200},
        {"count": 300},
    ]
    result = engine.infer_schema(int_rows)
    int_field = result.fields[0]
    assert int_field.inferred_type == FieldType.INTEGER

    # Date detection
    date_rows = [
        {"date": "2024-01-01"},
        {"date": "2024-02-15"},
        {"date": "2024-03-30"},
    ]
    result = engine.infer_schema(date_rows)
    date_field = result.fields[0]
    assert date_field.inferred_type == FieldType.DATE


def test_nullable_field_detection():
    """Test detection of nullable fields."""
    engine = SchemaInferenceEngine()

    rows = [
        {"name": "Alice", "age": 30},
        {"name": "Bob", "age": None},
        {"name": "Charlie", "age": 35},
    ]

    result = engine.infer_schema(rows)

    name_field = next(f for f in result.fields if f.name == "name")
    assert name_field.nullable is False

    age_field = next(f for f in result.fields if f.name == "age")
    assert age_field.nullable is True


def test_mapping_confidence_levels():
    """Test that mapping confidence levels are appropriate."""
    engine = SchemaInferenceEngine(min_confidence=0.7)

    rows = [
        {"first_name": "Alice", "email_address": "alice@example.com"},
    ]

    result = engine.infer_schema(rows)

    # Direct match should have high confidence
    first_name_mapping = next(
        m for m in result.suggested_mappings if m.source_field == "first_name"
    )
    assert first_name_mapping.confidence >= 0.9

    # Partial match should have lower confidence
    email_mapping = next(
        (m for m in result.suggested_mappings if m.source_field == "email_address"),
        None,
    )
    # Should still be mapped due to field name pattern
    assert email_mapping is not None


def test_csv_mapping_within_10_minutes():
    """Acceptance test: CSV mapping should complete quickly.

    This test simulates a typical CSV with 20 fields and 100 rows.
    Target: <10 minutes (actual should be <<1 minute)
    """
    import time

    engine = SchemaInferenceEngine()

    # Simulate realistic CSV with mixed types
    rows = []
    for i in range(100):
        rows.append({
            "id": i,
            "first_name": f"User{i}",
            "last_name": f"Last{i}",
            "email": f"user{i}@example.com",
            "phone": f"+1-555-{i:04d}",
            "company": f"Company {i % 10}",
            "city": "Springfield",
            "state": "IL",
            "zip_code": "62701",
            "created_at": "2024-01-01T12:00:00Z",
            "score": i * 1.5,
            "active": i % 2 == 0,
            "tags": "tag1,tag2",
            "notes": "Some notes here",
            "amount": 100.50,
            "quantity": 5,
            "status": "active",
            "priority": "high",
            "category": "A",
            "subcategory": "A1",
        })

    start = time.time()
    result = engine.infer_schema(rows)
    elapsed = time.time() - start

    # Should complete in well under 1 second
    assert elapsed < 10, f"Schema inference took {elapsed}s, expected <10s"

    # Verify results
    assert result.record_count == 100
    assert len(result.fields) == 20
    assert len(result.suggested_mappings) > 0
    assert result.primary_entity is not None

    print(f"✓ CSV mapping completed in {elapsed:.3f}s (target: <10 minutes)")

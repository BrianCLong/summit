"""Tests for the SPOM mapper."""

from spom.mapper import SPOM
from spom.models import FieldObservation


def build_seed_dataset():
    return [
        FieldObservation(
            name="email_address",
            description="Primary contact email",
            sample_values=["analyst@example.com"],
        ),
        FieldObservation(
            name="customer_phone",
            description="SMS contact",
            sample_values=["+1-202-555-0172"],
        ),
        FieldObservation(
            name="customer_name",
            description="Full name",
            sample_values=["Alex Doe"],
        ),
        FieldObservation(
            name="shipping_address",
            description="EU shipping address",
            sample_values=["123 Market St"],
        ),
        FieldObservation(
            name="signup_ip",
            description="Client IP",
            sample_values=["192.168.1.10"],
        ),
        FieldObservation(
            name="ssn",
            description="US Social Security Number",
            sample_values=["123-45-6789"],
        ),
        FieldObservation(
            name="session_token",
            description="Auth session token",
            sample_values=["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"],
        ),
        FieldObservation(
            name="api_key",
            description="Integration key",
            sample_values=["sk_live_12345"],
        ),
        FieldObservation(
            name="card_number_hint",
            description="Card hash",
            sample_values=["4242424242424242"],
        ),
    ]


def test_seed_dataset_maps_with_high_confidence():
    mapper = SPOM()
    report = mapper.map_fields(build_seed_dataset(), dataset="seed")

    results = {result.field.name: result for result in report.results}

    assert results["email_address"].tag.category == "EMAIL"
    assert results["email_address"].confidence >= 0.8
    assert any("Rule:" in step for step in results["email_address"].explanations)

    assert results["customer_phone"].tag.category == "PHONE"
    assert results["customer_phone"].confidence >= 0.7

    assert results["ssn"].tag.category == "GOV_ID"
    assert results["ssn"].confidence >= 0.8
    assert "us" in results["ssn"].tag.jurisdictions

    assert results["shipping_address"].tag.category == "ADDRESS"
    assert "gdpr" in results["shipping_address"].tag.jurisdictions

    assert results["card_number_hint"].tag.category == "PAYMENT_HINTS"
    assert results["card_number_hint"].confidence >= 0.7


def test_explanations_include_rules_and_embeddings():
    mapper = SPOM()
    [email_field] = [FieldObservation(name="user_email", sample_values=["user@example.com"])]
    result = mapper.map_fields([email_field], dataset="seed").results[0]

    assert any(step.startswith("Rule:") for step in result.explanations)
    assert any("Embedding similarity" in step for step in result.explanations)



"""Ground truth corpus for the Redaction Quality Benchmark (RQB)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import List


@dataclass(frozen=True)
class PIIEntity:
    """Represents a single annotated PII entity."""

    label: str
    value: str
    location: str


@dataclass(frozen=True)
class BenchmarkRecord:
    """A single benchmark record with ground-truth annotations."""

    record_id: str
    source_type: str
    content: str
    entities: List[PIIEntity]


DATASET: List[BenchmarkRecord] = [
    BenchmarkRecord(
        record_id="text-001",
        source_type="text",
        content=(
            "Contact Jane Smith at jane.smith@example.com or (415) 555-1000 to "
            "discuss invoice #A123."
        ),
        entities=[
            PIIEntity(
                label="EMAIL",
                value="jane.smith@example.com",
                location="offset:22-44",
            ),
            PIIEntity(
                label="PHONE",
                value="(415) 555-1000",
                location="offset:48-62",
            ),
        ],
    ),
    BenchmarkRecord(
        record_id="text-002",
        source_type="text",
        content="Server logs show login from 192.168.1.42 by user_id 883-23-9911.",
        entities=[
            PIIEntity(
                label="IP_ADDRESS",
                value="192.168.1.42",
                location="offset:28-40",
            ),
            PIIEntity(
                label="SSN",
                value="883-23-9911",
                location="offset:52-63",
            ),
        ],
    ),
    BenchmarkRecord(
        record_id="json-001",
        source_type="json",
        content=(
            '{"event":"signup","user":{"email":"api.user@company.test","phone":"+1-202-555-0199",'
            '"metadata":{"session_id":"abc123","account":"ACC-443"}},"billing":{"card_last4":"4242",'
            '"iban":"GB12BARC20201530093459"}}'
        ),
        entities=[
            PIIEntity(label="EMAIL", value="api.user@company.test", location="user.email"),
            PIIEntity(label="PHONE", value="+1-202-555-0199", location="user.phone"),
            PIIEntity(label="ACCOUNT_ID", value="ACC-443", location="user.metadata.account"),
            PIIEntity(label="IBAN", value="GB12BARC20201530093459", location="billing.iban"),
        ],
    ),
    BenchmarkRecord(
        record_id="json-002",
        source_type="json",
        content='{"event":"heartbeat","status":"healthy","attempt":3}',
        entities=[],
    ),
    BenchmarkRecord(
        record_id="text-003",
        source_type="text",
        content="System audit completed with anonymized data only.",
        entities=[],
    ),
]
"""Curated dataset with deterministic ground-truth labels."""

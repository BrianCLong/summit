import base64
import json
from pathlib import Path

from cogwar.provenance.ledger import build_record, verify_record, ProvenanceRecord


def test_tampered_hash_fixture() -> None:
    fixture = json.loads(Path("tests/fixtures/provenance/tampered_hash.json").read_text())
    record_data = fixture["record"]
    payload = base64.b64decode(fixture["payload"])
    record = ProvenanceRecord(
        record_id=record_data["record_id"],
        artifact_id=record_data["artifact_id"],
        hash_alg=record_data["hash_alg"],
        hash_value=record_data["hash_value"],
        source=record_data["source"],
    )
    assert verify_record(record, payload) is False


def test_valid_record() -> None:
    payload = b"artifact"
    record = build_record("rec-2", "art-2", payload, "source-2")
    assert verify_record(record, payload) is True

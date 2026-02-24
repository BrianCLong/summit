import hashlib
import json
from pathlib import Path

from agents.route_opt.planner import run
from agents.route_opt.validator import validate_output


FIXTURE = Path(__file__).resolve().parent / "fixtures" / "input.json"


def _hash(payload: dict) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def test_route_opt_deterministic_output():
    with FIXTURE.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    first = run(payload)
    second = run(payload)

    assert _hash(first) == _hash(second)
    assert first["solution"]["route"] == ["A", "C", "B"]


def test_route_opt_schema_contract():
    with FIXTURE.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    report = run(payload)
    validate_output(report)


def test_route_opt_rejects_invalid_schema():
    invalid = {
        "evidence_id": "BAD-EVIDENCE",
        "schema_version": "1.0.0",
        "input_hash": "not-a-hash",
        "constraints": {},
        "stops": [],
        "distance_matrix": [],
        "solution": {"route": [], "total_distance_km": 0}
    }

    try:
        validate_output(invalid)
        raise AssertionError("expected schema failure")
    except ValueError as exc:
        assert "schema validation failed" in str(exc).lower()

import hashlib
import json
import os
import re
import subprocess
import sys
from datetime import UTC, datetime
from typing import Any

try:
    from jsonschema import validate
except ImportError:
    print("jsonschema not installed. Please install it using: pip install jsonschema")
    sys.exit(1)

SCHEMA_DIR = "packages/schema/src/influence_ops/v2"
SCHEMA_FILES = (
    "campaign_phase.graph.json",
    "narrative_market.graph.json",
    "cognitive_layer.graph.json",
    "proof_layer.graph.json",
    "wargame.graph.json",
)

DEFAULT_EVIDENCE_ROOT = "evidence"
GENERATED_AT_ENV = "INFLUENCE_OPS_V2_EVAL_GENERATED_AT"
EVIDENCE_ID_ENV = "INFLUENCE_OPS_V2_EVAL_EVIDENCE_ID"
EVIDENCE_ROOT_ENV = "INFLUENCE_OPS_V2_EVAL_EVIDENCE_ROOT"
RUN_ID_ENV = "INFLUENCE_OPS_V2_EVAL_RUN_ID"


def get_git_sha() -> str:
    try:
        out = subprocess.check_output(["git", "rev-parse", "--short=7", "HEAD"])
        normalized = out.decode("utf-8").strip().lower()
        if re.fullmatch(r"[a-f0-9]{7}", normalized):
            return normalized
        return "0000000"
    except Exception:
        return "0000000"


def resolve_generated_at() -> datetime:
    generated_at = os.environ.get(GENERATED_AT_ENV)
    if not generated_at:
        return datetime.now(UTC)

    normalized = generated_at.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError as exc:
        raise ValueError(
            f"Invalid {GENERATED_AT_ENV} value: {generated_at}. "
            "Expected ISO-8601 timestamp."
        ) from exc

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def resolve_evidence_root() -> str:
    return os.environ.get(EVIDENCE_ROOT_ENV, DEFAULT_EVIDENCE_ROOT)


def resolve_run_id(schema_digest: str) -> str:
    run_id = os.environ.get(RUN_ID_ENV)
    if run_id:
        normalized = run_id.strip().lower()
        if not re.fullmatch(r"[a-f0-9]{8}", normalized):
            raise ValueError(
                f"Invalid {RUN_ID_ENV} value: {run_id}. "
                "Expected exactly 8 lowercase hex characters."
            )
        return normalized

    return schema_digest[:8]


def generate_evidence_id(generated_at: datetime, git_sha: str, run_id: str) -> str:
    evidence_id = os.environ.get(EVIDENCE_ID_ENV)
    if evidence_id:
        return evidence_id

    date_str = generated_at.strftime("%Y-%m-%d")
    return f"EVID::local::io::schema_roundtrip_v2::{date_str}::{git_sha}::{run_id}"


def load_schema(filename: str) -> dict[str, Any]:
    path = os.path.join(SCHEMA_DIR, filename)
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def generate_sample_data(schema_name: str) -> dict[str, Any]:
    if schema_name == "campaign_phase.graph.json":
        return {
            "nodes": [
                {
                    "id": "camp1",
                    "type": "Campaign",
                    "properties": {"name": "Test Campaign", "status": "ACTIVE"},
                },
                {"id": "phase1", "type": "CampaignPhase", "properties": {"name": "Seeding"}},
            ],
            "edges": [
                {
                    "source": "camp1",
                    "target": "phase1",
                    "type": "HAS_PHASE",
                    "properties": {"weight": 1.0},
                }
            ],
        }

    if schema_name == "narrative_market.graph.json":
        return {
            "nodes": [
                {"id": "market1", "type": "NarrativeMarket"},
                {
                    "id": "metric1",
                    "type": "MarketMetric",
                    "properties": {"metricType": "ATTENTION", "value": 0.8},
                },
            ],
            "edges": [{"source": "market1", "target": "metric1", "type": "MEASURED_BY"}],
        }

    if schema_name == "cognitive_layer.graph.json":
        return {
            "nodes": [
                {"id": "cog1", "type": "CognitiveState", "properties": {"uncertainty": 0.2}},
                {
                    "id": "def1",
                    "type": "DefenseIntervention",
                    "properties": {"interventionType": "Debunk"},
                },
            ],
            "edges": [{"source": "def1", "target": "cog1", "type": "MITIGATED_BY"}],
        }

    if schema_name == "proof_layer.graph.json":
        return {
            "nodes": [
                {
                    "id": "proof1",
                    "type": "ProofObject",
                    "properties": {"proofType": "VIDEO", "isSynthetic": False},
                },
                {"id": "swarm1", "type": "Swarm"},
            ],
            "edges": [{"source": "proof1", "target": "swarm1", "type": "SUPPORTED_BY_PROOF"}],
        }

    if schema_name == "wargame.graph.json":
        return {
            "nodes": [
                {
                    "id": "scenario1",
                    "type": "WargameScenario",
                    "properties": {"scenarioName": "Red Team 1"},
                },
                {
                    "id": "faction1",
                    "type": "Faction",
                    "properties": {"factionName": "Blue"},
                },
            ],
            "edges": [],
        }

    raise ValueError(f"Unknown schema: {schema_name}")


def calculate_schema_digest() -> str:
    digest = hashlib.sha256()
    for schema_file in SCHEMA_FILES:
        path = os.path.join(SCHEMA_DIR, schema_file)
        with open(path, "rb") as f:
            digest.update(schema_file.encode("utf-8"))
            digest.update(f.read())
    return digest.hexdigest()


def main() -> None:
    generated_at = resolve_generated_at()
    git_sha = get_git_sha()
    schema_digest = calculate_schema_digest()
    run_id = resolve_run_id(schema_digest)
    evidence_id = generate_evidence_id(
        generated_at=generated_at, git_sha=git_sha, run_id=run_id
    )
    evidence_root = resolve_evidence_root()
    evidence_dir = os.path.join(evidence_root, evidence_id)
    os.makedirs(evidence_dir, exist_ok=True)

    report_items: list[dict[str, Any]] = []
    valid_schemas = 0

    for schema_file in SCHEMA_FILES:
        print(f"Validating {schema_file}...")
        schema = load_schema(schema_file)
        data = generate_sample_data(schema_file)
        validate(instance=data, schema=schema)
        valid_schemas += 1
        report_items.append(
            {
                "schema": schema_file,
                "status": "valid",
                "sample_data_snippet": json.dumps(data, sort_keys=True)[:140],
            }
        )
        print("  OK")

    report = {
        "suite": "influence_ops_v2_schema_roundtrip",
        "evidence_id": evidence_id,
        "schema_files": list(SCHEMA_FILES),
        "items": report_items,
    }
    metrics = {
        "evidence_id": evidence_id,
        "run_id": run_id,
        "total_schemas": len(SCHEMA_FILES),
        "valid_schemas": valid_schemas,
        "invalid_schemas": len(SCHEMA_FILES) - valid_schemas,
        "schema_digest": schema_digest,
    }
    stamp = {
        "generated_at": generated_at.isoformat(),
        "git_sha": git_sha,
        "evidence_id": evidence_id,
        "run_id": run_id,
        "determinism": {
            "schema_files": list(SCHEMA_FILES),
            "schema_digest": schema_digest,
        },
    }

    with open(os.path.join(evidence_dir, "report.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, sort_keys=True)

    with open(os.path.join(evidence_dir, "metrics.json"), "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2, sort_keys=True)

    with open(os.path.join(evidence_dir, "stamp.json"), "w", encoding="utf-8") as f:
        json.dump(stamp, f, indent=2, sort_keys=True)

    print(f"Evidence generated at {evidence_dir}")


if __name__ == "__main__":
    main()

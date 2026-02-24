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

SCHEMA_DIR = "packages/schema/src/influence_ops"
DEFAULT_EVIDENCE_ROOT = "evidence"
SCHEMA_FILES = (
    "attribution_hypothesis.json",
    "canonical_graph.json",
    "narrative_signal.json",
)
GENERATED_AT_ENV = "INFLUENCE_OPS_EVAL_GENERATED_AT"
EVIDENCE_ID_ENV = "INFLUENCE_OPS_EVAL_EVIDENCE_ID"
EVIDENCE_ROOT_ENV = "INFLUENCE_OPS_EVAL_EVIDENCE_ROOT"
RUN_ID_ENV = "INFLUENCE_OPS_EVAL_RUN_ID"


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
    return f"EVID::local::io::schema_roundtrip::{date_str}::{git_sha}::{run_id}"


def load_schema(filename: str) -> dict[str, Any]:
    path = os.path.join(SCHEMA_DIR, filename)
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def sample_payload(schema_name: str) -> dict[str, Any]:
    if schema_name == "canonical_graph.json":
        return {
            "nodes": [
                {
                    "id": "acct-1",
                    "type": "Account",
                    "tenant_id": "tenant-us-1",
                    "properties": {"platform": "telegram"},
                    "provenance": {
                        "source_id": "src-post-001",
                        "collected_at": "2026-02-11T00:00:00Z",
                        "method": "API",
                        "transform_chain": ["normalize:v1", "langid:v2"],
                        "confidence": 0.92,
                    },
                    "temporal": {
                        "observed_at_start": "2026-02-10T23:58:00Z",
                        "ingest_run_id": "run-001",
                    },
                },
                {
                    "id": "narr-1",
                    "type": "Narrative",
                    "tenant_id": "tenant-us-1",
                    "properties": {"label": "energy unrest"},
                    "provenance": {
                        "source_id": "src-post-002",
                        "collected_at": "2026-02-11T00:01:00Z",
                        "method": "INFERENCE",
                        "transform_chain": ["cluster:v3"],
                        "confidence": 0.84,
                    },
                    "temporal": {
                        "observed_at_start": "2026-02-10T23:55:00Z",
                        "observed_at_end": "2026-02-11T00:00:00Z",
                    },
                },
            ],
            "edges": [
                {
                    "source": "acct-1",
                    "target": "narr-1",
                    "type": "AMPLIFIES",
                    "tenant_id": "tenant-us-1",
                    "properties": {"weight": 0.71},
                    "provenance": {
                        "source_id": "src-link-001",
                        "collected_at": "2026-02-11T00:01:30Z",
                        "method": "INFERENCE",
                        "transform_chain": ["diffusion:v1"],
                        "confidence": 0.79,
                    },
                    "temporal": {"observed_at_start": "2026-02-11T00:00:30Z"},
                }
            ],
        }

    if schema_name == "narrative_signal.json":
        return {
            "signals": [
                {
                    "id": "sig-001",
                    "narrative_id": "narr-1",
                    "claim_id": "claim-1",
                    "language": "en",
                    "signal_type": "NARRATIVE_AMPLIFICATION",
                    "score": 0.88,
                    "provenance": {
                        "source_id": "src-post-001",
                        "collected_at": "2026-02-11T01:00:00Z",
                        "transform_chain": ["narrative-cluster:v1", "rank:v2"],
                    },
                    "temporal": {"observed_at_start": "2026-02-11T00:58:00Z"},
                }
            ]
        }

    if schema_name == "attribution_hypothesis.json":
        return {
            "hypotheses": [
                {
                    "id": "hyp-001",
                    "campaign_id": "camp-1",
                    "actor_hypothesis_id": "actor-hyp-4",
                    "confidence_score": 0.63,
                    "calibration_bucket": "MEDIUM",
                    "state": "PENDING_HITL",
                    "requires_hitl": True,
                    "provenance": {
                        "source_id": "src-model-att-v2",
                        "collected_at": "2026-02-11T02:00:00Z",
                        "method": "MODEL_INFERENCE",
                        "transform_chain": ["feature-gen:v4", "calibration:v2"],
                    },
                }
            ]
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

    results: list[dict[str, Any]] = []
    valid_schemas = 0

    for schema_file in SCHEMA_FILES:
        print(f"Validating {schema_file}...")
        schema = load_schema(schema_file)
        payload = sample_payload(schema_file)

        try:
            validate(instance=payload, schema=schema)
            valid_schemas += 1
            results.append({"schema": schema_file, "status": "valid"})
            print("  OK")
        except Exception as exc:
            results.append(
                {"schema": schema_file, "status": "invalid", "error": str(exc)}
            )
            print(f"  FAILED: {exc}")
            raise

    report = {
        "suite": "influence_ops_schema_roundtrip",
        "evidence_id": evidence_id,
        "schema_files": list(SCHEMA_FILES),
        "results": results,
    }
    metrics = {
        "schema_files": list(SCHEMA_FILES),
        "total_schemas": len(SCHEMA_FILES),
        "valid_schemas": valid_schemas,
        "invalid_schemas": len(SCHEMA_FILES) - valid_schemas,
        "evidence_id": evidence_id,
        "run_id": run_id,
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

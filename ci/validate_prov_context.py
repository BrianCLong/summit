#!/usr/bin/env python3
import json
import hashlib
import pathlib
import sys
import subprocess
from pyld import jsonld
import jsonschema
import yaml

ROOT = pathlib.Path(__file__).resolve().parents[1]
SPEC = ROOT / "spec" / "prov_context.jsonld"
MAPPING = ROOT / "mappings" / "otel_to_prov.yml"
GENERATOR = ROOT / "ci" / "generate_prov_context.py"
CONTEXT_SCHEMA = ROOT / "schemas" / "prov-context.schema.json"
RUN_SCHEMA = ROOT / "schemas" / "openlineage-run.schema.json"
ARTIFACT_DIR = ROOT / "artifacts"
OUT_ARTIFACT = ARTIFACT_DIR / "prov_context_check.json"

def get_sha256(data: str) -> str:
    return hashlib.sha256(data.encode("utf-8")).hexdigest()

def get_git_sha():
    try:
        return subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    except Exception:
        return "unknown"

def main():
    if not SPEC.exists():
        print(f"Error: {SPEC} does not exist. Run generator first.")
        sys.exit(1)

    # 1. Validate Context Schema
    ctx_data = json.loads(SPEC.read_text())
    with open(CONTEXT_SCHEMA) as f:
        schema = json.load(f)
    jsonschema.validate(instance=ctx_data, schema=schema)
    print("✓ Context schema validation passed.")

    # 2. Canonicalize and Hash Context
    # We create a dummy graph that uses the context to test it
    dummy_graph = {
        "@context": ctx_data["@context"],
        "id": "urn:uuid:test-dataset",
        "type": "Dataset",
        "name": "test-dataset",
        "namespace": "test-namespace"
    }
    normalized = jsonld.normalize(dummy_graph, {'algorithm': 'URDNA2015', 'format': 'application/n-quads'})
    ctx_hash = get_sha256(normalized)
    print(f"✓ Context canonical hash: {ctx_hash}")

    # 3. Validate Sample Payload
    sample_payload = {
        "runId": "d8e3d080-6060-466d-9279-3c35b597c555",
        "nominalTime": "2024-05-01T00:00:00Z",
        "service.name": "test-service",
        "facets": {}
    }
    with open(RUN_SCHEMA) as f:
        run_schema = json.load(f)
    jsonschema.validate(instance=sample_payload, schema=run_schema)
    print("✓ Sample payload schema validation passed.")

    # 4. Canonicalize Sample Linked Graph
    linked_sample = {
        "@context": ctx_data["@context"],
        "id": "urn:uuid:d8e3d080-6060-466d-9279-3c35b597c555",
        "type": "Run",
        "runId": "d8e3d080-6060-466d-9279-3c35b597c555",
        "nominalTime": "2024-05-01T00:00:00Z",
        "service.name": "test-service"
    }
    normalized_sample = jsonld.normalize(linked_sample, {'algorithm': 'URDNA2015', 'format': 'application/n-quads'})
    sample_hash = get_sha256(normalized_sample)
    print(f"✓ Sample graph canonical hash: {sample_hash}")

    # 5. Generator SHA
    gen_hash = get_sha256(GENERATOR.read_text())

    # 6. Write Artifact
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    git_sha = get_git_sha()
    report = {
        "evidence_id": f"provctx::{git_sha}::{SPEC.relative_to(ROOT)}::{ctx_hash[:8]}",
        "prov_context_urdna2015_sha256": ctx_hash,
        "sample_graph_urdna2015_sha256": sample_hash,
        "generator_sha256": gen_hash,
        "status": "passed"
    }
    OUT_ARTIFACT.write_text(json.dumps(report, indent=2) + "\n")
    print(f"✓ Artifact written to {OUT_ARTIFACT}")

if __name__ == "__main__":
    main()

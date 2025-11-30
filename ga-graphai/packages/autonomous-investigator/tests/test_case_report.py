import json
from pathlib import Path

import pytest

from autonomous_investigator import (
    build_cypher_preview,
    build_graphrag_summary,
    build_hypotheses,
    build_results_table,
    load_case_manifest,
)


def _fixture_path() -> Path:
    return (
        Path(__file__).resolve().parents[4]
        / "sprint-kits"
        / "proof-first-core-ga"
        / "fixtures"
        / "case-demo"
        / "hash-manifest.json"
    )


def test_manifest_loading_and_preview():
    manifest = load_case_manifest(_fixture_path())

    assert manifest.case_id == "demo"
    assert manifest.root_hash == "4b825dc642cb6eb9a060e54bf8d69288fbee4904"
    assert manifest.step_count == 2

    cypher_preview = build_cypher_preview(manifest)
    assert cypher_preview[0]["query"].startswith("MERGE (c:Case")
    assert cypher_preview[1]["estimated_rows"] == 2


def test_results_and_summaries():
    manifest = load_case_manifest(_fixture_path())

    results = build_results_table(manifest)
    assert results[0]["operation"] == "ingest"
    assert results[1]["model"] == "lsh-v1"

    hypotheses = build_hypotheses(manifest)
    assert len(hypotheses) >= 2
    assert "chain" in hypotheses[0]["claim"].lower()

    summary = build_graphrag_summary(manifest)
    assert "pipeline steps" in summary


def test_invalid_manifest_inputs(tmp_path: Path):
    with pytest.raises(FileNotFoundError):
        load_case_manifest(tmp_path / "missing.json")

    malformed = tmp_path / "bad.json"
    malformed.write_text("not-json")
    with pytest.raises(ValueError):
        load_case_manifest(malformed)

    missing_fields = tmp_path / "missing_fields.json"
    missing_fields.write_text("{}")
    with pytest.raises(ValueError):
        load_case_manifest(missing_fields)

    wrong_steps = tmp_path / "wrong_steps.json"
    wrong_steps.write_text(json.dumps({"caseId": "demo", "root": "123", "steps": {}}))
    with pytest.raises(ValueError):
        load_case_manifest(wrong_steps)

    empty_step = tmp_path / "empty_step.json"
    empty_step.write_text(json.dumps({"caseId": "demo", "root": "123", "steps": [{}]}))
    with pytest.raises(ValueError):
        load_case_manifest(empty_step)

from pathlib import Path

import pytest

from agentops.evidence import EvidenceWriter
from agentops.evidence.writer import EvidenceWriterError


@pytest.fixture()
def tmp_evidence_dir(tmp_path: Path) -> Path:
    evidence_dir = tmp_path / "evidence"
    evidence_dir.mkdir()
    return evidence_dir


def test_write_bundle_creates_artifacts(tmp_evidence_dir: Path) -> None:
    writer = EvidenceWriter(base_dir=tmp_evidence_dir)

    results = writer.write_bundle(
        run_id="run-001",
        evidence_id="EVD-aidevops-vs-sre-agents-EVIDENCE-002",
        report={
            "summary": "Evidence writer emits deterministic artifacts.",
            "inputs": {"source": "unit"},
            "outputs": {"artifacts": ["report", "metrics", "stamp"]},
            "policy": {"decision": "deny"},
        },
        metrics={"counters": {"agentops_actions_total": 0}},
    )

    for key in ("index", "report", "metrics", "stamp"):
        assert results[key].exists()

    report_text = (tmp_evidence_dir / "run-001" / "report.json").read_text(
        encoding="utf-8"
    )
    metrics_text = (tmp_evidence_dir / "run-001" / "metrics.json").read_text(
        encoding="utf-8"
    )
    assert "created_at" not in report_text
    assert "created_at" not in metrics_text


def test_writer_rejects_timestamp_fields(tmp_evidence_dir: Path) -> None:
    writer = EvidenceWriter(base_dir=tmp_evidence_dir)

    with pytest.raises(EvidenceWriterError):
        writer.write_bundle(
            run_id="run-002",
            evidence_id="EVD-aidevops-vs-sre-agents-EVIDENCE-003",
            report={
                "summary": "Invalid timestamp field.",
                "inputs": {"source": "unit"},
                "outputs": {"artifacts": []},
                "policy": {"decision": "deny"},
                "created_at": "2025-01-01T00:00:00Z",
            },
            metrics={"counters": {"agentops_actions_total": 0}},
        )

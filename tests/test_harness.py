from summit_harness.harness import AgentHarness, HarnessConfig
from summit_harness.evidence import EvidenceWriter
from pathlib import Path

def test_harness_run_generates_evidence(tmp_path):
    output_dir = tmp_path / "evidence"
    writer = EvidenceWriter(str(output_dir))
    cfg = HarnessConfig(enabled=True)
    harness = AgentHarness(cfg, writer)

    result = harness.run("Test task")
    assert result["status"] == "ok"

    assert (output_dir / "report.json").exists()
    assert (output_dir / "metrics.json").exists()
    assert (output_dir / "stamp.json").exists()
    assert (output_dir / "index.json").exists()

def test_harness_disabled():
    writer = None
    cfg = HarnessConfig(enabled=False)
    harness = AgentHarness(cfg, writer)
    result = harness.run("Test task")
    assert result["status"] == "disabled"

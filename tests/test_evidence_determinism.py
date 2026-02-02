import json
from pathlib import Path
from summit_harness.harness import AgentHarness, HarnessConfig
from summit_harness.evidence import EvidenceWriter
import time

def test_harness_determinism(tmp_path):
    run1_dir = tmp_path / "run1"
    run2_dir = tmp_path / "run2"

    cfg = HarnessConfig(enabled=True)

    # Run 1
    writer1 = EvidenceWriter(str(run1_dir))
    harness1 = AgentHarness(cfg, writer1)
    harness1.run("deterministic task")

    # Small delay to ensure if there's a timestamp issue it might show up
    time.sleep(0.1)

    # Run 2
    writer2 = EvidenceWriter(str(run2_dir))
    harness2 = AgentHarness(cfg, writer2)
    harness2.run("deterministic task")

    # Compare report.json
    report1 = json.loads((run1_dir / "report.json").read_text())
    report2 = json.loads((run2_dir / "report.json").read_text())
    assert report1["summary"] == report2["summary"]
    assert report1["item_slug"] == report2["item_slug"]
    assert report1["evidence_id"] == report2["evidence_id"]

    # Compare metrics.json
    metrics1 = json.loads((run1_dir / "metrics.json").read_text())
    metrics2 = json.loads((run2_dir / "metrics.json").read_text())
    assert metrics1["metrics"] == metrics2["metrics"]
    assert metrics1["evidence_id"] == metrics2["evidence_id"]

    # stamp.json is ALLOWED to be different (timestamps)
    assert (run1_dir / "stamp.json").exists()
    assert (run2_dir / "stamp.json").exists()

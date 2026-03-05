import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCANNER = ROOT / "tools" / "lsn" / "lsn_scanner.py"
SAMPLE = ROOT / "data" / "fixtures" / "debezium_sample.jsonl"

def run_scanner(path):
    proc = subprocess.run([sys.executable, str(SCANNER), str(path)], capture_output=True, text=True)
    out = proc.stdout.strip()
    code = proc.returncode
    metrics = {}
    try:
        metrics = json.loads(out) if out else {}
    except json.JSONDecodeError:
        pass
    return code, metrics, proc.stderr

def test_window_is_monotonic_and_tombstones_valid():
    code, metrics, stderr = run_scanner(SAMPLE)
    assert "window_drift_count" in metrics
    assert "tombstone_violation_count" in metrics
    assert "noop_rate" in metrics
    assert metrics["window_drift_count"] == 0
    assert metrics["tombstone_violation_count"] == 0
    assert metrics["noop_rate"] >= 0.999
    assert code == 0

def test_drift_detection(tmp_path):
    bad = tmp_path / "bad.jsonl"
    bad.write_text(
        '\n'.join([
            '{"key":{"id":3},"value":{"op":"c","after":{"id":3},"source":{"lsn":200},"ts_ms":1}}',
            '{"key":{"id":3},"value":{"op":"u","after":{"id":3},"source":{"lsn":190},"ts_ms":2}}'
        ]) + '\n',
        encoding="utf-8",
    )
    code, metrics, _ = run_scanner(bad)
    assert metrics.get("window_drift_count", 0) > 0
    assert code != 0

def test_tombstone_required_after_delete(tmp_path):
    bad = tmp_path / "no_tombstone.jsonl"
    bad.write_text(
        '\n'.join([
            '{"key":{"id":4},"value":{"op":"c","after":{"id":4},"source":{"lsn":300},"ts_ms":1}}',
            '{"key":{"id":4},"value":{"op":"d","before":{"id":4},"source":{"lsn":310},"ts_ms":2}}'
        ]) + '\n',
        encoding="utf-8",
    )
    code, metrics, _ = run_scanner(bad)
    assert metrics.get("tombstone_violation_count", 0) > 0
    assert code != 0

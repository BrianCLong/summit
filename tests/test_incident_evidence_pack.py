import json
from pathlib import Path

from tools.incident_evidence_pack import EvidencePack


def write_file(path: Path, content: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content)
    return path


def test_generates_timestamped_pack_with_artifacts(tmp_path: Path):
    logs_dir = tmp_path / "logs"
    traces_dir = tmp_path / "traces"
    configs_dir = tmp_path / "config"
    output_root = tmp_path / "out"

    write_file(logs_dir / "app.log", "error: something happened")
    write_file(traces_dir / "trace.json", json.dumps({"span": "root"}))
    write_file(configs_dir / "app.yaml", "feature: enabled")

    current_metrics = write_file(tmp_path / "metrics.json", json.dumps({"latency_ms": 120}))
    baseline_metrics = write_file(tmp_path / "baseline.json", json.dumps({"latency_ms": 100}))
    deploy_metadata = write_file(tmp_path / "deploy.json", json.dumps({"release": "2025.09.0"}))

    pack = EvidencePack(
        incident_id="INC-42",
        severity="critical",
        output_root=output_root,
        logs=[logs_dir],
        traces=[traces_dir],
        configs=[configs_dir],
        metrics_file=current_metrics,
        metrics_baseline=baseline_metrics,
        deploy_metadata=deploy_metadata,
        notes="automated trigger",
    )

    pack_dir = pack.generate()

    assert pack_dir.exists()
    summary_path = pack_dir / "evidence-pack.json"
    html_path = pack_dir / "evidence-pack.html"

    assert summary_path.exists()
    assert html_path.exists()

    summary = json.loads(summary_path.read_text())

    assert summary["incident_id"] == "INC-42"
    assert summary["severity"] == "critical"
    assert summary["artifacts"]["logs"][0]["source"].endswith("app.log")
    assert summary["artifacts"]["traces"][0]["source"].endswith("trace.json")
    assert summary["artifacts"]["configs"][0]["source"].endswith("app.yaml")

    assert summary["metrics"]["delta"] == {"latency_ms": 20.0}
    assert summary["deployment"] == {"release": "2025.09.0"}

    html_content = html_path.read_text()
    assert "Incident Evidence Pack" in html_content
    assert "latency_ms" in html_content
    assert "2025.09.0" in html_content

import json

from pipelines.bootstrapped_founder.workflow import run


def _read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def test_workflow_outputs_expected_artifacts(tmp_path):
    idea = tmp_path / "idea.md"
    idea.write_text("Niche consulting for local retailers\n", encoding="utf-8")

    result = run(str(idea), str(tmp_path / "artifacts"))

    report = _read(result.report_path)
    metrics = _read(result.metrics_path)
    stamp = _read(result.stamp_path)

    assert report["evidence_ids"][0] == "BFP-VAL-001"
    assert report["mvp_spec"]["default_enabled"] is False
    assert metrics["deterministic"] is True
    assert stamp["evidence_complete"] is True


def test_workflow_is_deterministic(tmp_path):
    idea = tmp_path / "idea.md"
    idea.write_text("AI newsletter for healthcare operators\n", encoding="utf-8")

    out_a = run(str(idea), str(tmp_path / "a"))
    out_b = run(str(idea), str(tmp_path / "b"))

    assert out_a.report_path.read_text(encoding="utf-8") == out_b.report_path.read_text(encoding="utf-8")
    assert out_a.metrics_path.read_text(encoding="utf-8") == out_b.metrics_path.read_text(encoding="utf-8")
    assert out_a.stamp_path.read_text(encoding="utf-8") == out_b.stamp_path.read_text(encoding="utf-8")

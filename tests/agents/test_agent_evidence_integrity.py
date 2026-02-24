from __future__ import annotations

import json
from pathlib import Path

from summit.agents.orchestrator import AgentOrchestrator
from summit.agents.tool_registry import AgentToolRegistry
from summit.ci.verify_agent_evidence_integrity import verify_agent_evidence_integrity


def _run_bundle(out_dir: Path) -> None:
    registry = AgentToolRegistry(allowlist=["deterministic_echo"])
    registry.register_tool("deterministic_echo", lambda payload: {"echo": payload["task"], "status": "ok"})
    orchestrator = AgentOrchestrator(registry, enabled=True)
    orchestrator.run("Investigate pipeline drift", out_dir=out_dir)


def test_verify_agent_evidence_integrity_passes(tmp_path: Path) -> None:
    out_dir = tmp_path / "artifacts"
    _run_bundle(out_dir)

    errors = verify_agent_evidence_integrity(out_dir)
    assert errors == []


def test_verify_agent_evidence_integrity_detects_timestamp_leak(tmp_path: Path) -> None:
    out_dir = tmp_path / "artifacts"
    _run_bundle(out_dir)

    report_path = out_dir / "report.json"
    report = json.loads(report_path.read_text(encoding="utf-8"))
    report["generated_at"] = "2026-02-23T00:00:00Z"
    report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    errors = verify_agent_evidence_integrity(out_dir)
    assert any("timestamp-like" in error or "unexpected key" in error for error in errors)


def test_verify_agent_evidence_integrity_detects_hash_mismatch(tmp_path: Path) -> None:
    out_dir = tmp_path / "artifacts"
    _run_bundle(out_dir)

    stamp_path = out_dir / "stamp.json"
    stamp = json.loads(stamp_path.read_text(encoding="utf-8"))
    stamp["deterministic_hash"] = "0" * 64
    stamp_path.write_text(json.dumps(stamp, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    errors = verify_agent_evidence_integrity(out_dir)
    assert any("deterministic_hash" in error for error in errors)


def test_verify_agent_evidence_integrity_detects_budget_exceeded(tmp_path: Path) -> None:
    out_dir = tmp_path / "artifacts"
    _run_bundle(out_dir)

    metrics_path = out_dir / "metrics.json"
    metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
    metrics["usage"]["tokens"] = metrics["budget"]["max_tokens"] + 1
    metrics_path.write_text(json.dumps(metrics, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    errors = verify_agent_evidence_integrity(out_dir)
    assert any("Token budget exceeded" in error for error in errors)

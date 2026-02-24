from __future__ import annotations

from pathlib import Path

from agents.tooling_agent import ToolingAgent, ToolingTaskConfig


ROOT = Path(__file__).resolve().parents[2]


def test_evidence_hash_detects_tampering() -> None:
    agent = ToolingAgent(
        ToolingTaskConfig(
            task="example",
            repo_root=ROOT,
            enabled=True,
            prompt_path=ROOT / "agents" / "prompts" / "base_prompt.md",
            git_sha="local",
        )
    )

    result = agent.run()
    report = result["report"]
    metrics = result["metrics"]
    stamp = result["stamp"]

    expected = ToolingAgent.compute_evidence_hash(report["evidence_id"], report, metrics)
    assert stamp["evidence_hash"] == expected

    tampered_metrics = dict(metrics)
    tampered_metrics["runtime_budget_ms"] = metrics["runtime_budget_ms"] + 1
    tampered = ToolingAgent.compute_evidence_hash(report["evidence_id"], report, tampered_metrics)
    assert tampered != stamp["evidence_hash"]

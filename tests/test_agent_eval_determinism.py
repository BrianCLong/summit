from __future__ import annotations

from pathlib import Path

from summit.agent_eval import AgentEvalHarness


def test_agent_eval_outputs_are_deterministic(tmp_path: Path) -> None:
    artifact = tmp_path / "artifact.py"
    artifact.write_text("print('stable')\n", encoding="utf-8")

    out_a = tmp_path / "run_a"
    out_b = tmp_path / "run_b"

    harness = AgentEvalHarness(gates_enabled=True)
    first = harness.evaluate(
        str(artifact),
        str(out_a),
        agent_model="test-model",
        prompt_hash="sha256:test",
    )
    second = harness.evaluate(
        str(artifact),
        str(out_b),
        agent_model="test-model",
        prompt_hash="sha256:test",
    )

    assert (out_a / "report.json").read_text(encoding="utf-8") == (out_b / "report.json").read_text(
        encoding="utf-8"
    )
    assert (out_a / "metrics.json").read_text(encoding="utf-8") == (out_b / "metrics.json").read_text(
        encoding="utf-8"
    )
    assert (out_a / "stamp.json").read_text(encoding="utf-8") == (out_b / "stamp.json").read_text(
        encoding="utf-8"
    )
    assert first == second
    assert first["report"]["status"] == "pass"
    assert first["report"]["evaluation_score"] == 1.0


def test_agent_eval_fails_on_nondeterministic_output(tmp_path: Path) -> None:
    artifact = tmp_path / "artifact.py"
    artifact.write_text(
        "\n".join(
            [
                "import random",
                "import uuid",
                "print(uuid.uuid4())",
                "print('2026-02-24T00:00:00Z')",
                "print(random.random())",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    out_dir = tmp_path / "run"
    harness = AgentEvalHarness(gates_enabled=True)
    result = harness.evaluate(str(artifact), str(out_dir), agent_model="test-model", prompt_hash="sha256:test")

    assert result["report"]["status"] == "fail"
    assert result["report"]["evaluation_score"] == 0.0
    assert result["metrics"]["deterministic"] is False
    assert result["report"]["nondeterministic_markers"] == [
        "random_api",
        "rfc3339_timestamp",
    ]


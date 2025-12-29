from pathlib import Path

from agent_runtime import AgentMessage, AgentSession, UnifiedAgentRuntime
from agent_runtime.evals import EvalHarness


def test_runtime_deterministic_with_golden_override():
    runtime = UnifiedAgentRuntime(
        backend_name="grok", golden_records=[{"input": "Hello World", "expected_output": "Hi"}]
    )
    runtime.start(AgentSession(session_id="test", backend="grok", metadata={}))
    step = runtime.step(AgentMessage(content="Hello World"))
    runtime.stop()
    assert step.response == "Hi"
    assert step.tool_calls == []


def test_eval_harness_summary(tmp_path: Path, monkeypatch):
    # Run against the shipped core suite; golden overrides ensure high scores.
    output_dir = tmp_path / "reports"
    harness = EvalHarness(backend="qwen", suite="core", output_dir=output_dir)
    summary, results = harness.run()
    assert summary["exact_match"] >= 0.8
    assert summary["tool_success_rate"] >= 0.8
    assert output_dir.exists()
    # Persist report for inspection
    from agent_runtime.evals import ReportWriter

    writer = ReportWriter(output_dir)
    report_path = writer.write(summary, results, backend="qwen", suite="core")
    assert report_path.exists()

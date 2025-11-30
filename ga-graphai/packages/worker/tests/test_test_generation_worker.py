import pathlib
import sys

import pytest

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from main import AgentProfile, TaskSpec, WorkcellOrchestrator  # type: ignore
from test_generation_worker import (  # type: ignore
    DiffOnlyTestGenerationWorker,
    PatchValidator,
    TestFrameworkDetector,
    TestGenerationRequest,
    build_unit_test_generation_tool,
)


class StubLLM:
    def __init__(self, response: str) -> None:
        self.response = response
        self.prompts: list[str] = []

    def complete(self, prompt: str, *, temperature: float, max_tokens: int) -> str:
        self.prompts.append(prompt)
        return self.response


def _sample_diff() -> str:
    return "\n".join(
        [
            "diff --git a/src/calc.py b/src/calc.py",
            "index 111..222 100644",
            "--- a/src/calc.py",
            "+++ b/src/calc.py",
            "@@",
            " def add(a, b):",
            "     return a + b",
        ]
    )


def _sample_patch() -> str:
    return "\n".join(
        [
            "diff --git a/tests/test_calc.py b/tests/test_calc.py",
            "new file mode 100644",
            "--- /dev/null",
            "+++ b/tests/test_calc.py",
            "@@",
            "+import pytest",
            "",
            "",
            "+def test_addition_round_trip():",
            "+    assert add(1, 2) == 3",
        ]
    )


def test_detector_prefers_language_extension_first():
    diff = "\n".join(
        [
            "diff --git a/app/page.tsx b/app/page.tsx",
            "index 111..222 100644",
            "--- a/app/page.tsx",
            "+++ b/app/page.tsx",
        ]
    )
    detector = TestFrameworkDetector()
    assert detector.detect(diff) == "vitest"


def test_worker_builds_prompt_and_validates_patch():
    client = StubLLM(_sample_patch())
    worker = DiffOnlyTestGenerationWorker(client)
    request = TestGenerationRequest(diff=_sample_diff(), repository="calc")

    result = worker.generate(request)

    assert "diff-only-test-generation" in result.prompt
    assert "calc" in result.prompt
    assert result.framework == "pytest"
    assert result.patch.strip().startswith("diff --git")
    assert result.coverage_delta_estimate >= 0.5
    assert any(log.startswith("prompt_chars") for log in result.logs)
    assert client.prompts, "LLM client should capture the prompt"


def test_coverage_estimator_tracks_framework_specific_signals():
    client = StubLLM(_sample_patch())
    worker = DiffOnlyTestGenerationWorker(client)
    request = TestGenerationRequest(diff=_sample_diff())

    result = worker.generate(request)

    assert result.coverage_delta_estimate > 0


def test_validator_rejects_missing_additions():
    validator = PatchValidator()
    invalid_patch = "diff --git a/tests/test_empty.py b/tests/test_empty.py\n+++ b/tests/test_empty.py"

    with pytest.raises(ValueError):
        validator.validate(invalid_patch, expected_framework="pytest")


def test_validator_requires_hunks():
    validator = PatchValidator()
    invalid_patch = "\n".join(
        [
            "diff --git a/tests/test_calc.py b/tests/test_calc.py",
            "--- a/tests/test_calc.py",
            "+++ b/tests/test_calc.py",
            "+def test_placeholder():",
            "+    pass",
        ]
    )

    with pytest.raises(ValueError):
        validator.validate(invalid_patch, expected_framework="pytest")


def test_validator_blocks_non_test_paths():
    validator = PatchValidator()
    invalid_patch = "\n".join(
        [
            "diff --git a/src/app.py b/src/app.py",
            "index 111..222 100644",
            "--- a/src/app.py",
            "+++ b/src/app.py",
            "@@",
            "-def main():",
            "+def main():",
        ]
    )

    with pytest.raises(ValueError):
        validator.validate(invalid_patch, expected_framework="pytest")


def test_workcell_tool_executes_generation_flow():
    client = StubLLM(_sample_patch())
    tool = build_unit_test_generation_tool(client)
    orchestrator = WorkcellOrchestrator()
    orchestrator.register_tool(tool)
    orchestrator.register_agent(
        AgentProfile(name="qa-bot", authority=3, allowed_tools=[tool.name])
    )

    report = orchestrator.submit(
        order_id="order-1091",
        submitted_by="release-manager",
        agent_name="qa-bot",
        tasks=[
            TaskSpec(
                task_id="t1",
                tool=tool.name,
                payload={"diff": _sample_diff(), "repository": "calc"},
            )
        ],
    )

    assert report.results[0].status == "success"
    output = report.results[0].output
    assert output["framework"] == "pytest"
    assert "patch" in output and output["patch"]
    assert output["coverage_delta_estimate"] >= 0.5


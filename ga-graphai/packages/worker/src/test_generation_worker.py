"""Diff-only unit test generation worker powered by a code-specialized LLM."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from prompt_engineering import PromptEngineer, PromptTuning


_DEFAULT_TEST_TUNING = PromptTuning(
    system_instruction=(
        "You are a senior code-focused LLM tasked with producing only unit test diffs. "
        "Respect the repository's testing conventions and never include non-test code."
    ),
    style_guide=(
        "Prefer deterministic, isolated tests",
        "Use table-driven cases when helpful",
        "Explain coverage focus in comments when brevity allows",
    ),
    safety_clauses=(
        "Never modify application code",
        "Do not include secrets or external network calls",
        "Return a unified diff patch that can be applied cleanly",
    ),
    max_prompt_chars=6000,
    temperature=0.15,
    max_tokens=1024,
)


class CodeLLMClient(Protocol):
    """Minimal client contract for completing a prompt with a code LLM."""

    def complete(self, prompt: str, *, temperature: float, max_tokens: int) -> str:  # pragma: no cover - Protocol
        ...


@dataclass(frozen=True, slots=True)
class TestGenerationRequest:
    """Input payload describing the code delta that needs test coverage."""

    __test__ = False

    diff: str
    repository: str | None = None
    target_branch: str = "main"


@dataclass(frozen=True, slots=True)
class TestGenerationResult:
    """Result contract for the diff-only worker."""

    __test__ = False

    patch: str
    framework: str
    prompt: str
    coverage_delta_estimate: float
    logs: tuple[str, ...]


class TestFrameworkDetector:
    """Lightweight heuristic to infer the target test framework from a diff."""

    _FRAMEWORK_MAP = {
        ".py": "pytest",
        ".ts": "vitest",
        ".tsx": "vitest",
        ".js": "jest",
        ".jsx": "jest",
        ".go": "go test",
        ".rs": "cargo test",
    }

    def detect(self, diff: str, fallback: str = "pytest") -> str:
        paths: list[str] = []
        for line in diff.splitlines():
            if line.startswith("diff --git"):
                segments = line.split()
                if len(segments) >= 4:
                    paths.append(segments[2][2:])
                    paths.append(segments[3][2:])
            elif line.startswith("+++") or line.startswith("---"):
                parts = line.split()
                if len(parts) >= 2 and parts[1] not in {"/dev/null"}:
                    paths.append(parts[1].removeprefix("a/").removeprefix("b/"))

        for path in paths:
            for extension, framework in self._FRAMEWORK_MAP.items():
                if path.endswith(extension):
                    return framework
        return fallback


class PatchValidator:
    """Ensures the returned patch complies with the diff-only contract."""

    def validate(self, patch: str, *, expected_framework: str) -> None:
        if not patch.strip():
            raise ValueError("LLM returned an empty patch")
        if "+++" not in patch:
            raise ValueError("Patch is missing file headers")
        if "@@" not in patch:
            raise ValueError("Patch is missing hunks with concrete changes")

        lines = patch.splitlines()
        additions = [line for line in lines if line.startswith("+") and not line.startswith("+++")]
        if not additions:
            raise ValueError("Patch does not contain any test additions")

        headers = [line for line in lines if line.startswith("+++ ") or line.startswith("--- ")]
        test_files: list[str] = []
        for header in headers:
            parts = header.split()
            if len(parts) < 2:
                continue
            path = parts[1]
            if path == "/dev/null":
                continue
            normalized = path.removeprefix("a/").removeprefix("b/")
            if not self._is_test_path(normalized):
                raise ValueError("Patch includes non-test files, violating diff-only contract")
            test_files.append(normalized)

        if not test_files:
            raise ValueError("Patch does not target a test or spec file")

        removals = [line for line in lines if line.startswith("-") and not line.startswith("--- ")]
        if removals:
            raise ValueError("Patch must not remove code for a diff-only contract")

        if expected_framework not in {"pytest", "vitest", "jest", "go test", "cargo test"}:
            raise ValueError("Unknown framework inferred from diff")

    @staticmethod
    def _is_test_path(path: str) -> bool:
        lowered = path.lower()
        return any(
            marker in lowered
            for marker in (
                "tests/",
                "/tests/",
                "__tests__",
                "/__tests__/",
                "spec/",
                "/spec/",
                "specs/",
                "/specs/",
                "test_",
                "_test",
                "_spec",
                "spec.ts",
                "spec.js",
            )
        )


class DiffOnlyTestGenerationWorker:
    """Produces a test-only diff using a code LLM and strict validation."""

    def __init__(
        self,
        client: CodeLLMClient,
        *,
        tuning: PromptTuning | None = None,
        detector: TestFrameworkDetector | None = None,
        validator: PatchValidator | None = None,
    ) -> None:
        self._client = client
        self._tuning = tuning or _DEFAULT_TEST_TUNING
        self._engineer = PromptEngineer(self._tuning)
        self._detector = detector or TestFrameworkDetector()
        self._validator = validator or PatchValidator()

    def generate(self, request: TestGenerationRequest) -> TestGenerationResult:
        framework = self._detector.detect(request.diff)
        prompt = self._build_prompt(request, framework)
        completion = self._client.complete(
            prompt, temperature=self._tuning.temperature, max_tokens=self._tuning.max_tokens
        )
        patch = completion.strip()
        self._validator.validate(patch, expected_framework=framework)
        coverage_delta = self._estimate_coverage_delta(patch, framework)
        logs = (
            f"framework={framework}",
            f"prompt_chars={len(prompt)}",
            f"patch_lines={len(patch.splitlines())}",
        )
        return TestGenerationResult(
            patch=patch,
            framework=framework,
            prompt=prompt,
            coverage_delta_estimate=coverage_delta,
            logs=logs,
        )

    def _build_prompt(self, request: TestGenerationRequest, framework: str) -> str:
        repository = request.repository or "unknown"
        user_prompt = (
            "Generate deterministic unit tests for the following code changes.\n"
            "Output a unified diff that only includes new or updated test files;"
            " do not modify application code.\n"
            f"Repository: {repository}\n"
            f"Target branch: {request.target_branch}\n"
            f"Testing framework: {framework}\n"
            "If the diff lacks explicit tests, create a new test file that aligns with"
            " repository conventions. Ensure the diff applies cleanly.\n"
            "Code diff:\n"
            f"{request.diff.strip()}"
        )
        context = {"contract": "diff-only-test-generation", "framework": framework}
        return self._engineer.build_payload(user_prompt, context=context)

    def _estimate_coverage_delta(self, patch: str, framework: str) -> float:
        added_lines = [
            line[1:]
            for line in patch.splitlines()
            if line.startswith("+") and not line.startswith("+++")
        ]
        test_indicators = {
            "pytest": ("def test_", "class Test", "@pytest.mark"),
            "vitest": ("test(", "it(", "describe("),
            "jest": ("test(", "it(", "describe("),
            "go test": ("func Test",),
            "cargo test": ("fn test_", "#[test]"),
        }
        indicators = test_indicators.get(framework, ("test",))
        detected_cases = [line for line in added_lines if any(token in line for token in indicators)]
        if not detected_cases:
            return 0.0
        return min(len(detected_cases) * 0.75, 10.0)


def build_unit_test_generation_tool(
    client: CodeLLMClient,
) -> "ToolCapability":  # pragma: no cover - returned callable is exercised in integration tests
    from main import ToolCapability

    worker = DiffOnlyTestGenerationWorker(client)

    def handler(payload: dict[str, str]) -> dict[str, object]:
        request = TestGenerationRequest(
            diff=payload["diff"],
            repository=payload.get("repository"),
            target_branch=payload.get("target_branch", "main"),
        )
        result = worker.generate(request)
        return {
            "patch": result.patch,
            "framework": result.framework,
            "coverage_delta_estimate": result.coverage_delta_estimate,
            "logs": list(result.logs),
        }

    return ToolCapability(name="unit-test-generator", handler=handler, minimum_authority=2)


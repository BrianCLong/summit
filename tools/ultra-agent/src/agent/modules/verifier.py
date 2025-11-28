from __future__ import annotations
from dataclasses import dataclass
from .. import tools


@dataclass
class VerificationResult:
    tests_passed: bool
    lint_passed: bool
    notes: list[str]


class Verifier:
    def verify(self) -> VerificationResult:
        notes: list[str] = []
        lint_ok = tools.run_linter()
        if lint_ok:
            notes.append("Linter passed (stub).")
        else:
            notes.append("Linter failed (stub).")

        tests_ok = tools.run_tests()
        if tests_ok:
            notes.append("Tests passed.")
        else:
            notes.append("Tests failed.")

        return VerificationResult(tests_passed=tests_ok, lint_passed=lint_ok, notes=notes)

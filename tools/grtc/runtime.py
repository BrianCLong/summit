"""Runtime helpers and adapters for executing compiled corpora."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Mapping, MutableMapping, Protocol, Sequence, Tuple

from .signing import Signer


class TestAdapter(Protocol):
    """Adapter contract for executing test payloads."""

    name: str

    def evaluate(self, test_case: Mapping[str, object]) -> Tuple[bool, str]:
        """Return (passed, message) for the provided test case."""


@dataclass
class TestResult:
    test_id: str
    passed: bool
    message: str


class ReferenceAdapter:
    """Adapter that uses the expected verdict to determine success deterministically."""

    name = "reference"

    def evaluate(self, test_case: Mapping[str, object]) -> Tuple[bool, str]:
        expected = test_case.get("expected")
        verdict = None
        if isinstance(expected, MutableMapping):
            verdict = expected.get("verdict")
        if verdict is None:
            return True, "No verdict provided; defaulting to pass."
        verdict_text = str(verdict).lower()
        passed = verdict_text in {"pass", "succeed", "reproduce"}
        message = f"Expected verdict: {verdict_text}"
        return passed, message


def load_manifest(corpus_dir: Path) -> MutableMapping[str, object]:
    with (corpus_dir / "manifest.json").open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, MutableMapping):  # type: ignore[redundant-expr]
        raise ValueError("Manifest must be a mapping.")
    return data


def iter_test_cases(corpus_dir: Path) -> Iterable[MutableMapping[str, object]]:
    manifest = load_manifest(corpus_dir)
    testcases = manifest.get("testcases", [])
    if not isinstance(testcases, Sequence):
        raise ValueError("Manifest testcases entry must be a sequence.")
    for filename in testcases:
        path = corpus_dir / "corpus" / "testcases" / str(filename)
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
        if not isinstance(data, MutableMapping):  # type: ignore[redundant-expr]
            raise ValueError(f"Testcase {filename} is not a mapping.")
        yield data


def execute_corpus(
    corpus_dir: Path,
    adapter: TestAdapter,
    *,
    signer: Signer | None = None,
    verify_signature: bool = False,
) -> Sequence[TestResult]:
    manifest = load_manifest(corpus_dir)
    signature_block = manifest.get("signature")
    signature = None
    if isinstance(signature_block, Mapping):
        signature = signature_block.get("value")
    if verify_signature:
        if signer is None:
            raise ValueError("Signer required when verify_signature is enabled.")
        if signature is None:
            raise ValueError("Manifest is missing a signature block.")
        if not signer.verify_manifest(manifest, signature):
            raise ValueError("Manifest signature verification failed.")

    results: list[TestResult] = []
    for testcase in iter_test_cases(corpus_dir):
        passed, message = adapter.evaluate(testcase)
        results.append(TestResult(test_id=str(testcase.get("id")), passed=passed, message=message))
    return results


__all__ = [
    "TestAdapter",
    "TestResult",
    "ReferenceAdapter",
    "execute_corpus",
    "load_manifest",
    "iter_test_cases",
]

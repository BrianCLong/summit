"""Compiler that converts governance requirements into a deterministic corpus."""

from __future__ import annotations

import json
import random
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, MutableMapping, Sequence

import yaml

from . import __version__
from .models import (
    ALLOWED_MINIMAL_CATEGORIES,
    CorpusArtifact,
    GovernanceSpecification,
    MinimalReproduction,
    RequirementExample,
    RequirementRule,
    TestCase,
)
from .signing import Signer

DEFAULT_EXPECTATIONS = {
    "positive": {"verdict": "pass"},
    "negative": {"verdict": "fail"},
    "boundary": {"verdict": "boundary"},
}


class SpecificationError(Exception):
    """Raised when the governance specification is invalid."""


def load_specification(path: Path) -> Mapping[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    if not isinstance(data, MutableMapping):  # type: ignore[redundant-expr]
        raise SpecificationError("Specification must be a mapping at the root level.")
    return data


def parse_specification(raw: Mapping[str, Any], seed_override: str | None = None) -> GovernanceSpecification:
    metadata = _require_mapping(raw, "metadata")
    spec_id = str(_require(metadata, "id"))
    description = str(metadata.get("description", ""))
    version = str(metadata.get("version", "1.0"))
    seed = str(seed_override or metadata.get("seed", "0"))

    purposes = _optional_mapping(raw.get("purposes", {}), "purposes")
    jurisdictions = _optional_mapping(raw.get("jurisdictions", {}), "jurisdictions")

    raw_rules = raw.get("rules")
    if not isinstance(raw_rules, Sequence) or not raw_rules:
        raise SpecificationError("Specification must define at least one rule.")

    rules = [_parse_rule(item) for item in raw_rules]

    return GovernanceSpecification(
        spec_id=spec_id,
        description=description,
        seed=seed,
        version=version,
        purposes=purposes,
        jurisdictions=jurisdictions,
        rules=sorted(rules, key=lambda rule: rule.rule_id),
    )


def _optional_mapping(value: Any, label: str) -> Mapping[str, Any]:
    if value in (None, {}):
        return {}
    if not isinstance(value, Mapping):
        raise SpecificationError(f"{label} must be a mapping if provided.")
    # sort keys for determinism
    return {str(key): value[key] for key in sorted(value)}


def _parse_rule(item: Any) -> RequirementRule:
    if not isinstance(item, Mapping):
        raise SpecificationError("Rule entries must be mappings.")
    rule_id = str(_require(item, "id"))
    title = str(item.get("title", rule_id))
    purpose = str(_require(item, "purpose"))
    jurisdictions_raw = item.get("jurisdictions", [])
    if not isinstance(jurisdictions_raw, Sequence) or not jurisdictions_raw:
        raise SpecificationError(f"Rule {rule_id} must define at least one jurisdiction.")
    jurisdictions = sorted(str(value) for value in jurisdictions_raw)
    statement = str(_require(item, "statement"))
    tags = sorted(str(tag) for tag in item.get("tags", []) if tag)

    positive = _parse_examples(item.get("positive", []), rule_id, "positive")
    negative = _parse_examples(item.get("negative", []), rule_id, "negative")
    boundaries = _parse_examples(item.get("boundary", []), rule_id, "boundary")
    minimal = _parse_minimal(item.get("minimal_reproduction", {}), rule_id)

    return RequirementRule(
        rule_id=rule_id,
        title=title,
        purpose=purpose,
        jurisdictions=jurisdictions,
        statement=statement,
        tags=tags,
        positive=positive,
        negative=negative,
        boundaries=boundaries,
        minimal_reproductions=minimal,
    )


def _parse_examples(raw_examples: Any, rule_id: str, kind: str) -> List[RequirementExample]:
    if raw_examples in (None, []):
        return []
    if not isinstance(raw_examples, Sequence):
        raise SpecificationError(f"Rule {rule_id} {kind} block must be a list of examples.")

    examples: List[RequirementExample] = []
    for index, entry in enumerate(raw_examples):
        if isinstance(entry, Mapping):
            name = str(entry.get("name") or f"{kind}-{index + 1}")
            payload = entry.get("payload", entry.get("input"))
            expected = entry.get("expected", entry.get("outcome", DEFAULT_EXPECTATIONS[kind]))
            notes = entry.get("notes")
        else:
            name = f"{kind}-{index + 1}"
            payload = entry
            expected = DEFAULT_EXPECTATIONS[kind]
            notes = None
        if payload is None:
            raise SpecificationError(f"Rule {rule_id} example {name} is missing a payload.")
        if expected is None:
            expected = DEFAULT_EXPECTATIONS[kind]
        examples.append(
            RequirementExample(
                name=name,
                payload=payload,
                expected=expected,
                notes=str(notes) if notes is not None else None,
            )
        )
    return examples


def _parse_minimal(raw_minimal: Any, rule_id: str) -> List[MinimalReproduction]:
    if raw_minimal in (None, {}):
        return []
    if isinstance(raw_minimal, Mapping):
        items = []
        for category, entries in raw_minimal.items():
            items.extend(_parse_minimal_entries(category, entries, rule_id))
        return items
    raise SpecificationError(f"Rule {rule_id} minimal reproduction block must be a mapping or list.")


def _parse_minimal_entries(category: Any, entries: Any, rule_id: str) -> List[MinimalReproduction]:
    category_name = str(category).upper()
    if category_name not in ALLOWED_MINIMAL_CATEGORIES:
        raise SpecificationError(
            f"Rule {rule_id} minimal reproduction category {category_name} is not supported."
        )
    if not isinstance(entries, Sequence) or not entries:
        raise SpecificationError(
            f"Rule {rule_id} minimal reproduction {category_name} block must be a non-empty list."
        )
    results: List[MinimalReproduction] = []
    for index, entry in enumerate(entries):
        if isinstance(entry, Mapping):
            name = str(entry.get("name") or f"{category_name}-{index + 1}")
            payload = entry.get("payload", entry.get("input"))
            expected = entry.get("expected", entry.get("outcome"))
            notes = entry.get("notes")
        else:
            name = f"{category_name}-{index + 1}"
            payload = entry
            expected = {"verdict": "reproduce"}
            notes = None
        if payload is None or expected is None:
            raise SpecificationError(
                f"Rule {rule_id} minimal reproduction {name} must include payload and expected."  # noqa: E501
            )
        results.append(
            MinimalReproduction(
                category=category_name,
                name=name,
                payload=payload,
                expected=expected,
                notes=str(notes) if notes is not None else None,
            )
        )
    return results


def _require(mapping: Mapping[str, Any], key: str) -> Any:
    if key not in mapping:
        raise SpecificationError(f"Missing required key: {key}")
    return mapping[key]


def _require_mapping(raw: Mapping[str, Any], key: str) -> Mapping[str, Any]:
    value = raw.get(key)
    if not isinstance(value, Mapping):
        raise SpecificationError(f"Expected {key} to be a mapping.")
    return value


def slugify(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = value.strip("-")
    return value or "item"


class CorpusCompiler:
    """Main entry point for building deterministic corpora."""

    def __init__(self, specification: GovernanceSpecification):
        self.specification = specification
        self._random = random.Random(specification.seed)

    def compile(self) -> CorpusArtifact:
        tests = list(self._iter_tests())
        manifest = self._build_manifest(tests)
        return CorpusArtifact(manifest=manifest, tests=tests)

    # pylint: disable=too-many-branches
    def _iter_tests(self) -> Iterable[TestCase]:
        for rule in self.specification.rules:
            yield from self._convert_examples(rule, rule.positive, "positive", "functional")
            yield from self._convert_examples(rule, rule.negative, "negative", "functional")
            yield from self._convert_examples(rule, rule.boundaries, "boundary", "boundary")
            yield from self._convert_minimal(rule)

    def _convert_examples(
        self,
        rule: RequirementRule,
        examples: Sequence[RequirementExample],
        kind: str,
        category: str,
    ) -> Iterable[TestCase]:
        for index, example in enumerate(examples):
            test_id = self._build_test_id(rule, kind, example.name, index)
            yield TestCase(
                test_id=test_id,
                rule_id=rule.rule_id,
                title=f"{rule.title} :: {example.name}",
                kind=kind,
                category=category,
                purpose=rule.purpose,
                jurisdictions=rule.jurisdictions,
                tags=self._compose_tags(rule, kind, category),
                payload=example.payload,
                expected=example.expected,
                notes=example.notes,
            )

    def _convert_minimal(self, rule: RequirementRule) -> Iterable[TestCase]:
        grouped: Dict[str, List[MinimalReproduction]] = {category: [] for category in ALLOWED_MINIMAL_CATEGORIES}
        for entry in rule.minimal_reproductions:
            grouped.setdefault(entry.category, []).append(entry)
        for category in ALLOWED_MINIMAL_CATEGORIES:
            entries = grouped.get(category, [])
            for index, minimal in enumerate(entries):
                test_id = self._build_test_id(rule, "minimal", minimal.name, index)
                yield TestCase(
                    test_id=test_id,
                    rule_id=rule.rule_id,
                    title=f"{rule.title} :: {minimal.name}",
                    kind="minimal",
                    category=category,
                    purpose=rule.purpose,
                    jurisdictions=rule.jurisdictions,
                    tags=self._compose_tags(rule, "minimal", category),
                    payload=minimal.payload,
                    expected=minimal.expected,
                    notes=minimal.notes,
                )

    def _compose_tags(self, rule: RequirementRule, kind: str, category: str) -> List[str]:
        tags = set(rule.tags)
        tags.update({kind, category})
        tags.update(rule.jurisdictions)
        tags.add(rule.purpose)
        return sorted(tags)

    def _build_test_id(self, rule: RequirementRule, kind: str, name: str, index: int) -> str:
        salt = self._random.randint(0, 2**31 - 1)
        slug = slugify(name)
        return f"{self.specification.spec_id}:{rule.rule_id}:{kind}:{slug}:{salt:08x}:{index}"

    def _build_manifest(self, tests: Sequence[TestCase]) -> Dict[str, Any]:
        counter = Counter(test.kind if test.kind != "minimal" else test.category for test in tests)
        generated_at = datetime.now(timezone.utc).isoformat()
        manifest_tests = []
        for test in sorted(tests, key=lambda case: case.test_id):
            manifest_tests.append(
                {
                    "id": test.test_id,
                    "rule": test.rule_id,
                    "kind": test.kind,
                    "category": test.category,
                    "checksum": self._checksum(test),
                    "path": f"corpus/testcases/{_filename_for_test(test)}",
                }
            )
        manifest = {
            "id": self.specification.spec_id,
            "description": self.specification.description,
            "version": self.specification.version,
            "seed": self.specification.seed,
            "compiler_version": __version__,
            "generated_at": generated_at,
            "counts": {key: counter[key] for key in sorted(counter)},
            "hash_algorithm": "sha256",
            "tests": manifest_tests,
        }
        return manifest

    @staticmethod
    def _checksum(test: TestCase) -> str:
        payload = {
            "id": test.test_id,
            "rule_id": test.rule_id,
            "title": test.title,
            "kind": test.kind,
            "category": test.category,
            "purpose": test.purpose,
            "jurisdictions": test.jurisdictions,
            "tags": test.tags,
            "payload": test.payload,
            "expected": test.expected,
            "notes": test.notes,
        }
        serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        return Signer.digest(serialized.encode("utf-8"))


def _filename_for_test(test: TestCase) -> str:
    safe = test.test_id.replace(":", "__")
    return f"{safe}.json"


def write_corpus(artifact: CorpusArtifact, output_dir: Path, signer: Signer) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    test_dir = output_dir / "corpus" / "testcases"
    test_dir.mkdir(parents=True, exist_ok=True)
    tests_index: List[str] = []
    for test in sorted(artifact.tests, key=lambda case: case.test_id):
        filename = _filename_for_test(test)
        tests_index.append(filename)
        data = {
            "id": test.test_id,
            "rule_id": test.rule_id,
            "title": test.title,
            "kind": test.kind,
            "category": test.category,
            "purpose": test.purpose,
            "jurisdictions": test.jurisdictions,
            "tags": test.tags,
            "payload": test.payload,
            "expected": test.expected,
            "notes": test.notes,
        }
        with (test_dir / filename).open("w", encoding="utf-8") as handle:
            json.dump(data, handle, indent=2, sort_keys=True)
            handle.write("\n")

    manifest_path = output_dir / "manifest.json"
    manifest_body = dict(artifact.manifest)
    manifest_body["testcases"] = sorted(tests_index)
    signature = signer.sign_manifest(manifest_body)
    manifest_body["signature"] = {
        "algorithm": signer.algorithm,
        "value": signature,
    }
    with manifest_path.open("w", encoding="utf-8") as handle:
        json.dump(manifest_body, handle, indent=2, sort_keys=True)
        handle.write("\n")

    with (output_dir / "manifest.sig").open("w", encoding="utf-8") as handle:
        handle.write(signature)
        handle.write("\n")

    return manifest_path


__all__ = [
    "CorpusCompiler",
    "SpecificationError",
    "load_specification",
    "parse_specification",
    "write_corpus",
]

"""Detector implementations for the Redaction Quality Benchmark."""

from __future__ import annotations

import json
import random
import re
from dataclasses import dataclass
from typing import Iterable, List, Optional

from .data import BenchmarkRecord, PIIEntity


@dataclass
class Detector:
    """Abstract detector interface."""

    name: str

    def detect(self, record: BenchmarkRecord, rng: Optional[random.Random] = None) -> List[PIIEntity]:
        raise NotImplementedError


_EMAIL_RE = re.compile(r"\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}\b")
_PHONE_RE = re.compile(
    r"(?:\+?\d{1,3}[-\s]?)?(?:\(\d{3}\)\s*\d{3}-\d{4}|\d{3}[-\s]\d{3}[-\s]\d{4})"
)
_IP_RE = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
_SSN_RE = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
_ACCOUNT_RE = re.compile(r"ACC-\d{3}")
_IBAN_RE = re.compile(r"[A-Z]{2}\d{2}[A-Z0-9]{1,30}")


class RegexDetector(Detector):
    """Regex-based detector that covers the benchmark entity types."""

    def __init__(self) -> None:
        super().__init__(name="regex")

    def detect(self, record: BenchmarkRecord, rng: Optional[random.Random] = None) -> List[PIIEntity]:
        if record.source_type == "text":
            return list(self._detect_text(record))
        if record.source_type == "json":
            return list(self._detect_json(record))
        raise ValueError(f"Unsupported record type: {record.source_type}")

    def _detect_text(self, record: BenchmarkRecord) -> Iterable[PIIEntity]:
        text = record.content
        for match in _EMAIL_RE.finditer(text):
            yield PIIEntity("EMAIL", match.group(0), f"offset:{match.start()}-{match.end()}")
        for match in _PHONE_RE.finditer(text):
            yield PIIEntity("PHONE", match.group(0), f"offset:{match.start()}-{match.end()}")
        for match in _IP_RE.finditer(text):
            yield PIIEntity("IP_ADDRESS", match.group(0), f"offset:{match.start()}-{match.end()}")
        for match in _SSN_RE.finditer(text):
            yield PIIEntity("SSN", match.group(0), f"offset:{match.start()}-{match.end()}")

    def _detect_json(self, record: BenchmarkRecord) -> Iterable[PIIEntity]:
        payload = json.loads(record.content)
        for path, value in _walk_json(payload):
            if not isinstance(value, str):
                continue
            if _EMAIL_RE.fullmatch(value):
                yield PIIEntity("EMAIL", value, path)
            elif _PHONE_RE.fullmatch(value):
                yield PIIEntity("PHONE", value, path)
            elif _ACCOUNT_RE.fullmatch(value):
                yield PIIEntity("ACCOUNT_ID", value, path)
            elif _IBAN_RE.fullmatch(value):
                yield PIIEntity("IBAN", value, path)


def _walk_json(payload: object, prefix: str = "") -> Iterable[tuple[str, object]]:
    if isinstance(payload, dict):
        for key, value in payload.items():
            child_prefix = f"{prefix}.{key}" if prefix else key
            yield from _walk_json(value, child_prefix)
    elif isinstance(payload, list):
        for idx, value in enumerate(payload):
            child_prefix = f"{prefix}[{idx}]" if prefix else f"[{idx}]"
            yield from _walk_json(value, child_prefix)
    else:
        yield prefix, payload


class MLStubDetector(Detector):
    """Deterministic ML-like detector for CI regression testing."""

    def __init__(self, recall_bias: float = 0.9, precision_bias: float = 0.9) -> None:
        super().__init__(name="ml-stub")
        self._recall_bias = recall_bias
        self._precision_bias = precision_bias
        self._regex = RegexDetector()

    def detect(self, record: BenchmarkRecord, rng: Optional[random.Random] = None) -> List[PIIEntity]:
        rng = rng or random.Random(0)
        baseline = self._regex.detect(record, rng=rng)
        kept: List[PIIEntity] = []
        for entity in baseline:
            if rng.random() <= self._recall_bias:
                kept.append(entity)
        if rng.random() > self._precision_bias:
            kept.append(
                PIIEntity(
                    label="EMAIL",
                    value="noise@example.test",
                    location=f"synthetic:{record.record_id}",
                )
            )
        return kept

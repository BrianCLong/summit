from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Protocol, Sequence
import re


@dataclass
class DetectorFinding:
    type: str
    match: str
    confidence: float
    position: int


class Detector(Protocol):
    def detect(self, value: str) -> Sequence[DetectorFinding]:
        ...


DEFAULT_REGEX_PATTERNS = (
    ("email", re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")),
    (
        "phone",
        re.compile(r"\b\+?\d{1,3}[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b"),
    ),
    ("ssn", re.compile(r"\b\d{3}-\d{2}-\d{4}\b")),
    ("credit-card", re.compile(r"\b(?:\d[ -]*?){13,16}\b")),
)


class RegexDetector:
    def __init__(self, patterns: Iterable[tuple[str, re.Pattern[str]]] | None = None) -> None:
        self._patterns = list(patterns or DEFAULT_REGEX_PATTERNS)

    def detect(self, value: str) -> Sequence[DetectorFinding]:
        findings: List[DetectorFinding] = []
        for label, pattern in self._patterns:
            for match in pattern.finditer(value):
                findings.append(
                    DetectorFinding(
                        type=label,
                        match=match.group(0),
                        confidence=0.9,
                        position=match.start(),
                    )
                )
        return findings


PII_HINTS = (
    "ssn",
    "social security",
    "credit card",
    "password",
    "secret",
    "token",
    "passport",
    "bank",
    "iban",
)


class EmbeddingDetectorStub:
    def detect(self, value: str) -> Sequence[DetectorFinding]:
        findings: List[DetectorFinding] = []
        lower = value.lower()
        for hint in PII_HINTS:
            index = lower.find(hint)
            if index != -1:
                findings.append(
                    DetectorFinding(
                        type=f"semantic-{hint.replace(' ', '-')}",
                        match=value[index : index + len(hint)],
                        confidence=0.6,
                        position=index,
                    )
                )
        return findings


class CompositeDetector:
    def __init__(self, detectors: Sequence[Detector]) -> None:
        self._detectors = list(detectors)

    def detect(self, value: str) -> Sequence[DetectorFinding]:
        findings: List[DetectorFinding] = []
        for detector in self._detectors:
            findings.extend(detector.detect(value))
        return findings


default_detector = CompositeDetector([RegexDetector(), EmbeddingDetectorStub()])

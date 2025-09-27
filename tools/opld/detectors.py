"""Detector primitives for the Output PII Leak Delta Guard (OPLD)."""

from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Iterable, List, Sequence


@dataclass(frozen=True)
class DetectedEntity:
    """Represents a single detected entity span."""

    entity_type: str
    value: str
    start: int
    end: int
    detector: str

    def normalized(self) -> "DetectedEntity":
        """Return a normalized variant for aggregation purposes."""

        value = self.value
        if self.entity_type in {"email", "ipv4", "ipv6"}:
            value = value.lower()
        elif self.entity_type == "phone_number":
            value = re.sub(r"\D", "", value)
        elif self.entity_type in {"credit_card", "ssn"}:
            value = re.sub(r"[^0-9]", "", value)
        elif self.entity_type == "postal_address":
            value = re.sub(r"\s+", " ", value.strip())
        elif self.entity_type == "person_name":
            value = " ".join(part.capitalize() for part in value.split())
        elif self.entity_type == "date_of_birth":
            parts = re.split(r"[/-]", value)
            if len(parts) == 3:
                month, day, year = parts
                value = f"{int(month):02d}/{int(day):02d}/{year.zfill(4)}"
        return DetectedEntity(
            entity_type=self.entity_type,
            value=value,
            start=self.start,
            end=self.end,
            detector=self.detector,
        )


class BaseDetector:
    """Base class for detectors."""

    name: str = "base"

    def detect(self, text: str) -> Sequence[DetectedEntity]:
        raise NotImplementedError


class RegexDetector(BaseDetector):
    """Regex based detector that covers structured identifiers."""

    name = "regex"

    _PATTERNS: Sequence[tuple[str, str]] = (
        (r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", "email"),
        (
            r"(?<!\d)(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})(?!\d)",
            "phone_number",
        ),
        (r"\b\d{3}-\d{2}-\d{4}\b", "ssn"),
        (
            r"\b(?:\d[ -]*?){13,16}\b",
            "credit_card",
        ),
        (r"\b(?:\d{1,3}\.){3}\d{1,3}\b", "ipv4"),
        (
            r"\b(?:0?[1-9]|1[0-2])[/-](?:0?[1-9]|[12][0-9]|3[01])[/-](?:19|20)?\d{2}\b",
            "date_of_birth",
        ),
        (
            r"\b\d{1,5}\s+(?:[A-Z][a-z]*\s)+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln)\b",
            "postal_address",
        ),
        (
            r"\b[A-Z]{2}\d{7}\b",
            "passport_number",
        ),
    )

    def __init__(self) -> None:
        self._compiled: Sequence[tuple[re.Pattern[str], str]] = tuple(
            (re.compile(pattern, re.IGNORECASE), entity_type) for pattern, entity_type in self._PATTERNS
        )

    def detect(self, text: str) -> Sequence[DetectedEntity]:
        findings: list[DetectedEntity] = []
        for pattern, entity_type in self._compiled:
            for match in pattern.finditer(text):
                findings.append(
                    DetectedEntity(
                        entity_type=entity_type,
                        value=match.group(0),
                        start=match.start(),
                        end=match.end(),
                        detector=self.name,
                    )
                )
        return findings


class HeuristicNERDetector(BaseDetector):
    """Lightweight heuristic NER to catch likely person names and organizations."""

    name = "heuristic_ner"

    _PERSON_GIVEN_NAMES = {
        "alex",
        "alice",
        "andrew",
        "anna",
        "ashley",
        "ben",
        "carlos",
        "caroline",
        "charles",
        "christina",
        "daniel",
        "david",
        "emily",
        "frank",
        "grace",
        "henry",
        "isabella",
        "james",
        "john",
        "julia",
        "karen",
        "laura",
        "linda",
        "luke",
        "maria",
        "michael",
        "natalie",
        "oliver",
        "olivia",
        "peter",
        "rachel",
        "robert",
        "sarah",
        "steven",
        "thomas",
        "victoria",
        "william",
    }

    _ORG_SUFFIXES = ("Inc", "Ltd", "LLC", "Corporation", "Corp", "Company", "Institute")

    _PERSON_PATTERN = re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b")
    _ORG_PATTERN = re.compile(r"\b([A-Z][A-Za-z0-9&]*(?:\s+[A-Z][A-Za-z0-9&]*)*\s+(?:" + "|".join(_ORG_SUFFIXES) + r"))\b")

    def detect(self, text: str) -> Sequence[DetectedEntity]:
        findings: list[DetectedEntity] = []
        for match in self._PERSON_PATTERN.finditer(text):
            candidate = match.group(1)
            tokens = candidate.split()
            if len(tokens) <= 4 and tokens[0].lower() in self._PERSON_GIVEN_NAMES:
                findings.append(
                    DetectedEntity(
                        entity_type="person_name",
                        value=candidate,
                        start=match.start(1),
                        end=match.end(1),
                        detector=self.name,
                    )
                )
        for match in self._ORG_PATTERN.finditer(text):
            candidate = match.group(1)
            findings.append(
                DetectedEntity(
                    entity_type="organization",
                    value=candidate,
                    start=match.start(1),
                    end=match.end(1),
                    detector=self.name,
                )
            )
        return findings


class DetectorPipeline:
    """Runs multiple detectors and merges their results."""

    def __init__(self, detectors: Iterable[BaseDetector] | None = None) -> None:
        if detectors is None:
            detectors = (RegexDetector(), HeuristicNERDetector())
        self.detectors: List[BaseDetector] = list(detectors)

    def detect(self, text: str) -> list[DetectedEntity]:
        results: list[DetectedEntity] = []
        for detector in self.detectors:
            results.extend(detector.detect(text))
        # Normalize values and de-duplicate identical spans coming from different detectors.
        normalized = {}
        for entity in results:
            key = (entity.entity_type, entity.normalized().value, entity.start, entity.end)
            if key not in normalized:
                normalized[key] = entity.normalized()
        return list(normalized.values())


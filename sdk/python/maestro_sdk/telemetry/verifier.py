from __future__ import annotations

from dataclasses import dataclass
from typing import List, Sequence

from .detectors import Detector, default_detector
from .types import ProcessedTelemetryEvent, TelemetryMetadata

_REDACTED_VALUE = "[REDACTED]"


def _value_at_path(attributes: dict[str, object], path: str) -> object | None:
    if not path:
        return attributes
    segments = [segment for segment in path.replace("[", ".").replace("]", "").split(".") if segment]
    current: object = attributes
    for segment in segments:
        if isinstance(current, list):
            index = int(segment)
            if index >= len(current):
                return None
            current = current[index]
        elif isinstance(current, dict):
            if segment not in current:
                return None
            current = current[segment]
        else:
            return None
    return current


def _traverse(value: object, path: str, collector: List[tuple[str, str]]) -> None:
    if value is None:
        return
    if isinstance(value, list):
        for index, item in enumerate(value):
            _traverse(item, f"{path}[{index}]", collector)
        return
    if isinstance(value, dict):
        for key, item in value.items():
            child = f"{path}.{key}" if path else key
            _traverse(item, child, collector)
        return
    if isinstance(value, str):
        collector.append((path, value))


@dataclass
class VerificationViolation:
    event: str
    path: str
    message: str


@dataclass
class VerificationResult:
    valid: bool
    violations: List[VerificationViolation]


class TelemetryVerifier:
    def __init__(self, detector: Detector | None = None) -> None:
        self._detector = detector or default_detector

    def verify(self, events: Sequence[ProcessedTelemetryEvent]) -> VerificationResult:
        violations: List[VerificationViolation] = []

        for event in events:
            metadata: TelemetryMetadata = event.metadata
            for dropped in metadata.dropped_fields:
                if _value_at_path(event.attributes, dropped) is not None:
                    violations.append(
                        VerificationViolation(event.name, dropped, "denied field still present"),
                    )

            for path, entry in metadata.redaction_map.items():
                value = _value_at_path(event.attributes, path)
                if entry.action == 'redact':
                    if value != _REDACTED_VALUE:
                        violations.append(
                            VerificationViolation(event.name, path, "redacted field not sanitized"),
                        )
                elif entry.action == 'hash':
                    if not isinstance(value, str) or not value.startswith('hash:'):
                        violations.append(
                            VerificationViolation(event.name, path, "hashed field missing hash prefix"),
                        )
                elif entry.action == 'deny':
                    if value is not None:
                        violations.append(
                            VerificationViolation(event.name, path, "denied field serialized"),
                        )

            collected: List[tuple[str, str]] = []
            _traverse(event.attributes, "", collected)
            for path, raw_value in collected:
                findings = self._detector.detect(raw_value)
                if findings:
                    entry = metadata.redaction_map.get(path)
                    if entry is None or entry.action not in {'redact', 'hash', 'deny'}:
                        violations.append(
                            VerificationViolation(event.name, path, "pii detected without protective action"),
                        )

        return VerificationResult(valid=not violations, violations=violations)

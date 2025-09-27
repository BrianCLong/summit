from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, MutableMapping, Optional, Sequence

from .detectors import DetectorFinding
from .policy import PolicyAction


@dataclass
class RedactionEntry:
    action: PolicyAction
    reason: Optional[str] = None
    findings: Optional[Sequence[DetectorFinding]] = None
    hash_preview: Optional[str] = None


@dataclass
class TelemetryMetadata:
    redaction_map: Dict[str, RedactionEntry] = field(default_factory=dict)
    dropped_fields: List[str] = field(default_factory=list)
    sample_rate: float = 1.0
    sampled: bool = True
    blocked: bool = False


@dataclass
class TelemetryEventInput:
    name: str
    attributes: MutableMapping[str, object]
    timestamp: Optional[int] = None


@dataclass
class ProcessedTelemetryEvent:
    name: str
    timestamp: int
    attributes: Dict[str, object]
    metadata: TelemetryMetadata


@dataclass
class RecordResult:
    accepted: bool
    reason: Optional[str] = None
    event: Optional[ProcessedTelemetryEvent] = None

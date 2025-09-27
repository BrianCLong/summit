"""Report primitives for RTGH."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List


@dataclass
class BypassRecord:
    gate: str
    payload: Any
    severity: float
    trace: List[Dict[str, Any]]
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class GateReport:
    gate: str
    total_cases: int
    bypasses: List[BypassRecord] = field(default_factory=list)

    @property
    def bypass_rate(self) -> float:
        if self.total_cases == 0:
            return 0.0
        return len(self.bypasses) / float(self.total_cases)

    @property
    def average_severity(self) -> float:
        if not self.bypasses:
            return 0.0
        return sum(record.severity for record in self.bypasses) / len(self.bypasses)

    def unified_score(self) -> float:
        return self.bypass_rate * self.average_severity


@dataclass
class FuzzReport:
    seed: int
    ci_mode: bool
    gate_reports: List[GateReport]
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        gate_dicts = []
        for gate_report in self.gate_reports:
            gate_dicts.append(
                {
                    "gate": gate_report.gate,
                    "total": gate_report.total_cases,
                    "bypass_rate": gate_report.bypass_rate,
                    "average_severity": gate_report.average_severity,
                    "score": gate_report.unified_score(),
                    "bypasses": [
                        {
                            "payload": record.payload,
                            "severity": record.severity,
                            "trace": record.trace,
                            "metadata": record.metadata,
                        }
                        for record in gate_report.bypasses
                    ],
                }
            )
        return {
            "seed": self.seed,
            "ci_mode": self.ci_mode,
            "metadata": self.metadata,
            "gates": gate_dicts,
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), sort_keys=True, separators=(",", ":"))

    def to_bytes(self) -> bytes:
        return self.to_json().encode("utf-8")


__all__ = ["FuzzReport", "GateReport", "BypassRecord"]

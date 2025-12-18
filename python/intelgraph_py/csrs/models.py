"""Domain models for the Consent-Scoped Retention Simulator (CSRS)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Iterable, List, Mapping, Sequence

ISO_8601 = "%Y-%m-%dT%H:%M:%S%z"
DATE_ONLY = "%Y-%m-%d"


@dataclass(frozen=True)
class ClockShift:
    """Represents clock drift scenarios that impact retention."""

    late_write_slip_days: int = 0
    backfill_days: int = 0

    def to_dict(self) -> Mapping[str, int]:
        return {
            "late_write_slip_days": self.late_write_slip_days,
            "backfill_days": self.backfill_days,
        }


@dataclass(frozen=True)
class RetentionPurpose:
    """Retention configuration for a single purpose."""

    name: str
    retention_days: int
    allowed_late_write_days: int
    allowed_backfill_days: int

    def horizon(self, reference: datetime) -> datetime:
        return reference - timedelta(days=self.retention_days)


@dataclass(frozen=True)
class DependentArtifact:
    """Represents downstream artifacts derived from a dataset."""

    name: str
    artifact_type: str
    purpose: str
    retention_days: int
    latency_days: int

    def horizon(self, reference: datetime) -> datetime:
        return reference - timedelta(days=self.retention_days)


@dataclass(frozen=True)
class Dataset:
    """Dataset participating in retention planning."""

    name: str
    last_arrival: datetime
    purposes: Sequence[RetentionPurpose] = field(default_factory=list)
    dependencies: Sequence[DependentArtifact] = field(default_factory=list)

    @staticmethod
    def from_dict(payload: Mapping[str, object]) -> "Dataset":
        last_arrival = _parse_datetime(payload["last_arrival"])
        purposes = [
            RetentionPurpose(
                name=item["purpose"],
                retention_days=int(item["retention_days"]),
                allowed_late_write_days=int(item["allowed_late_write_days"]),
                allowed_backfill_days=int(item["allowed_backfill_days"]),
            )
            for item in payload.get("purposes", [])
        ]
        dependencies = [
            DependentArtifact(
                name=item["name"],
                artifact_type=item["type"],
                purpose=item["purpose"],
                retention_days=int(item["retention_days"]),
                latency_days=int(item.get("latency_days", 0)),
            )
            for item in payload.get("dependencies", [])
        ]
        return Dataset(
            name=str(payload["name"]),
            last_arrival=last_arrival,
            purposes=tuple(sorted(purposes, key=lambda p: p.name)),
            dependencies=tuple(sorted(dependencies, key=lambda d: d.name)),
        )

    def to_dict(self) -> Mapping[str, object]:
        return {
            "name": self.name,
            "last_arrival": self.last_arrival.strftime(ISO_8601),
            "purposes": [
                {
                    "purpose": purpose.name,
                    "retention_days": purpose.retention_days,
                    "allowed_late_write_days": purpose.allowed_late_write_days,
                    "allowed_backfill_days": purpose.allowed_backfill_days,
                }
                for purpose in self.purposes
            ],
            "dependencies": [
                {
                    "name": dep.name,
                    "type": dep.artifact_type,
                    "purpose": dep.purpose,
                    "retention_days": dep.retention_days,
                    "latency_days": dep.latency_days,
                }
                for dep in self.dependencies
            ],
        }


def _parse_datetime(value: object) -> datetime:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(float(value), tz=timezone.utc)
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as exc:  # pragma: no cover - defensive guard
            raise ValueError(f"Invalid ISO timestamp: {value}") from exc
    raise TypeError(f"Unsupported datetime representation: {value!r}")


def serialize_date(value: datetime) -> str:
    return value.strftime(DATE_ONLY)


def serialize_datetime(value: datetime) -> str:
    return value.strftime(ISO_8601)


def ensure_datasets(payloads: Iterable[Mapping[str, object]]) -> List[Dataset]:
    return [Dataset.from_dict(item) for item in payloads]

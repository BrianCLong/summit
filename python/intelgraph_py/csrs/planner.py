"""Core planning logic for the Consent-Scoped Retention Simulator (CSRS)."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Iterable, List, Mapping, MutableMapping, Sequence

from .models import (
    ClockShift,
    Dataset,
    DependentArtifact,
    RetentionPurpose,
    ensure_datasets,
    serialize_date,
    serialize_datetime,
)


@dataclass(frozen=True)
class ClockShiftScenario:
    """Wrapper around :class:`ClockShift` to keep public API stable."""

    late_write_slip_days: int = 0
    backfill_days: int = 0

    def to_clock_shift(self) -> ClockShift:
        return ClockShift(
            late_write_slip_days=int(self.late_write_slip_days),
            backfill_days=int(self.backfill_days),
        )

    def to_dict(self) -> Mapping[str, int]:
        return self.to_clock_shift().to_dict()


class RetentionPlanner:
    """Simulates dataset retention horizons and dependent artifact impacts."""

    def __init__(
        self,
        reference_time: datetime | None = None,
        clock_shift: ClockShiftScenario | None = None,
    ) -> None:
        if reference_time is None:
            reference_time = datetime.now(tz=timezone.utc)
        if reference_time.tzinfo is None:
            reference_time = reference_time.replace(tzinfo=timezone.utc)
        self._reference_time = reference_time
        self._clock_shift = (clock_shift or ClockShiftScenario()).to_clock_shift()

    @property
    def reference_time(self) -> datetime:
        return self._reference_time

    @property
    def clock_shift(self) -> ClockShift:
        return self._clock_shift

    def simulate(self, datasets: Iterable[Mapping[str, object]]) -> Mapping[str, object]:
        materialized = ensure_datasets(datasets)
        planned = [
            self._simulate_dataset(dataset)
            for dataset in sorted(materialized, key=lambda item: item.name)
        ]
        return {
            "generated_at": serialize_datetime(self.reference_time),
            "clock_shift": self.clock_shift.to_dict(),
            "datasets": planned,
        }

    def _simulate_dataset(self, dataset: Dataset) -> Mapping[str, object]:
        anchor = min(dataset.last_arrival, self.reference_time)
        horizons: MutableMapping[str, datetime] = {}
        purposes_output: List[Mapping[str, object]] = []
        for purpose in dataset.purposes:
            purpose_result = self._simulate_purpose(purpose, anchor)
            horizons[purpose.name] = purpose_result["deletion_horizon_anchor"]
            purposes_output.append(self._redact_anchor_fields(purpose_result))
        impacts = [
            self._summarize_dependency(dependency, horizons, anchor)
            for dependency in dataset.dependencies
        ]
        impacts.sort(key=lambda item: (item["purpose"], item["name"]))
        return {
            "name": dataset.name,
            "last_arrival": serialize_datetime(dataset.last_arrival),
            "purposes": purposes_output,
            "dependencies": impacts,
        }

    def _simulate_purpose(
        self,
        purpose: RetentionPurpose,
        anchor: datetime,
    ) -> MutableMapping[str, object]:
        base_horizon = purpose.horizon(anchor)
        late_write_horizon = base_horizon - timedelta(days=self.clock_shift.late_write_slip_days)
        backfill_horizon = base_horizon - timedelta(days=self.clock_shift.backfill_days)
        risk = [
            self._risk_entry(
                "late_writes",
                purpose.allowed_late_write_days,
                self.clock_shift.late_write_slip_days,
                late_write_horizon,
            ),
            self._risk_entry(
                "backfill",
                purpose.allowed_backfill_days,
                self.clock_shift.backfill_days,
                backfill_horizon,
            ),
        ]
        return {
            "purpose": purpose.name,
            "retention_days": purpose.retention_days,
            "baseline_deletion_horizon": serialize_date(base_horizon),
            "late_write_horizon": serialize_date(late_write_horizon),
            "backfill_horizon": serialize_date(backfill_horizon),
            "deletion_horizon_anchor": base_horizon,
            "compliance_risk": risk,
        }

    def _risk_entry(
        self,
        risk_type: str,
        allowed_days: int,
        projected_shift: int,
        horizon: datetime,
    ) -> Mapping[str, object]:
        delta = projected_shift - allowed_days
        status = "breach" if delta > 0 else "ok"
        return {
            "type": risk_type,
            "status": status,
            "allowed_days": allowed_days,
            "projected_shift_days": projected_shift,
            "delta_days": delta,
            "projected_horizon": serialize_date(horizon),
        }

    def _summarize_dependency(
        self,
        dependency: DependentArtifact,
        horizons: Mapping[str, datetime],
        anchor: datetime,
    ) -> Mapping[str, object]:
        dependency_anchor = anchor + timedelta(days=dependency.latency_days)
        dependency_horizon = dependency.horizon(dependency_anchor)
        dataset_horizon = horizons.get(
            dependency.purpose,
            min(horizons.values()) if horizons else dependency_horizon,
        )
        delta = int((dependency_horizon - dataset_horizon).days)
        if delta > 0:
            summary = f"extends deletion window by {delta} days"
        elif delta < 0:
            summary = f"eligible for deletion {abs(delta)} days earlier"
        else:
            summary = "aligned with dataset horizon"
        return {
            "name": dependency.name,
            "type": dependency.artifact_type,
            "purpose": dependency.purpose,
            "retention_days": dependency.retention_days,
            "latency_days": dependency.latency_days,
            "deletion_horizon": serialize_date(dependency_horizon),
            "alignment_delta_days": delta,
            "impact": summary,
        }

    @staticmethod
    def _redact_anchor_fields(purpose_payload: MutableMapping[str, object]) -> Mapping[str, object]:
        # Consumers do not need the raw datetime anchor and removing it keeps
        # serialized plans deterministic across timezones.
        sanitized = dict(purpose_payload)
        sanitized.pop("deletion_horizon_anchor", None)
        return sanitized

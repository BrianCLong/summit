"""Utilities for tracking throughput across batches."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from statistics import mean
from typing import Deque, Dict


@dataclass
class BatchMeasurement:
    """Capture metrics for a single processed batch."""

    records: int
    elapsed: float
    started_at: float

    @property
    def throughput(self) -> float:
        if self.elapsed <= 0:
            return 0.0
        return self.records / self.elapsed


@dataclass
class ThroughputTracker:
    """Maintains aggregate throughput statistics."""

    window: int = 50
    _measurements: Deque[BatchMeasurement] = field(default_factory=lambda: deque(maxlen=50))
    total_records: int = 0
    total_batches: int = 0
    total_elapsed: float = 0.0

    def record(self, records: int, elapsed: float, started_at: float) -> None:
        if records <= 0:
            return
        measurement = BatchMeasurement(records=records, elapsed=elapsed, started_at=started_at)
        self._measurements.append(measurement)
        self.total_records += records
        self.total_batches += 1
        self.total_elapsed += elapsed

    def snapshot(self) -> Dict[str, float]:
        """Return current throughput metrics."""

        window_throughput = [measurement.throughput for measurement in self._measurements]
        average = mean(window_throughput) if window_throughput else 0.0
        overall = (
            self.total_records / self.total_elapsed if self.total_elapsed > 0 else 0.0
        )
        peak = max(window_throughput) if window_throughput else 0.0
        return {
            "records_total": float(self.total_records),
            "batches_total": float(self.total_batches),
            "throughput_avg_window": average,
            "throughput_avg_overall": overall,
            "throughput_peak_window": peak,
        }

    def reset(self) -> None:
        """Reset cumulative metrics."""

        self._measurements.clear()
        self.total_records = 0
        self.total_batches = 0
        self.total_elapsed = 0.0

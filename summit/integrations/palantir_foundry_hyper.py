from __future__ import annotations

import multiprocessing
import statistics
from dataclasses import dataclass, field
from typing import List, Dict, Callable, Any, Generator
import time
import random

@dataclass
class HyperRow:
    data: Dict[str, Any]
    timestamp: float = field(default_factory=time.time)

@dataclass
class MaterializationPolicy:
    retention_days: int
    freshness_seconds: int
    privacy_k_anonymity: int = 0

class DataHealthMonitor:
    """
    Real-time anomaly detection for streaming data.
    """
    def __init__(self):
        self.stats: Dict[str, List[float]] = {}

    def inspect(self, row: HyperRow, metric_field: str) -> bool:
        """
        Returns True if row is anomalous (Z-score > 3).
        """
        val = row.data.get(metric_field)
        if not isinstance(val, (int, float)):
            return False

        if metric_field not in self.stats:
            self.stats[metric_field] = []

        history = self.stats[metric_field]
        history.append(val)

        # Keep window small for speed
        if len(history) > 100:
            history.pop(0)

        if len(history) < 10:
            return False

        mean = statistics.mean(history)
        stdev = statistics.stdev(history)

        if stdev == 0: return False

        z_score = abs(val - mean) / stdev
        return z_score > 3.0

class HyperCompute:
    """
    Partitioned, streaming-first compute engine.
    """
    def __init__(self, partitions: int = 4):
        self.partitions = partitions
        self.monitor = DataHealthMonitor()

    def _process_partition(self, data_chunk: List[HyperRow], transform_logic: Callable) -> List[HyperRow]:
        results = []
        for row in data_chunk:
            # Anomaly Check
            if self.monitor.inspect(row, "value"):
                # In real engine, we'd dead-letter queue this
                continue

            new_data = transform_logic(row.data)
            results.append(HyperRow(data=new_data))
        return results

    def stream_process(self, input_generator: Generator[HyperRow, None, None], transform_logic: Callable) -> Generator[HyperRow, None, None]:
        """
        Simulates streaming processing with parallel partitions.
        """
        # In a real impl, we'd use multiprocessing.Pool here
        # For this demo, we simulate the batching behavior
        batch = []
        for row in input_generator:
            batch.append(row)
            if len(batch) >= 10:
                # Process batch
                results = self._process_partition(batch, transform_logic)
                yield from results
                batch = []

        if batch:
            yield from self._process_partition(batch, transform_logic)

    def apply_policy(self, data: List[HyperRow], policy: MaterializationPolicy) -> List[HyperRow]:
        """
        Enforces retention and privacy policies on the fly.
        """
        now = time.time()
        filtered = []
        for row in data:
            # Retention
            age_days = (now - row.timestamp) / 86400
            if age_days > policy.retention_days:
                continue

            # K-Anonymity (Masking)
            if policy.privacy_k_anonymity > 0:
                # Naive masking: just star out strings
                for k, v in row.data.items():
                    if isinstance(v, str):
                        row.data[k] = "***"

            filtered.append(row)
        return filtered
